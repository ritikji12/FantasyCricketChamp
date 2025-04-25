import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertTeamSchema, 
  updatePlayerSchema,
  insertContestSchema,
  updateContestSchema,
  updatePlayerPerformanceSchema
} from "@shared/schema";
import { initializePlayers } from "./initPlayers";
import memorystore from 'memorystore';

const MemoryStore = memorystore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      secret: process.env.SESSION_SECRET || "fantasy-cricket-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Setup passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Special case for admin user with hardcoded credentials
        if (username === 'admin' && password === 'admin123') {
          // Check if admin user exists in the database
          let adminUser = await storage.getUserByUsername('admin');

          // If admin doesn't exist, create the admin user
          if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            adminUser = await storage.createUser({
              username: 'admin',
              password: hashedPassword,
              name: 'Admin User'
            });

            // Update admin privileges directly in storage
            adminUser = { ...adminUser, isAdmin: true };
            await storage.updateUser(adminUser.id, { isAdmin: true });
          }

          return done(null, adminUser);
        }

        // Regular user authentication
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && (req.user as any).isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // Player routes
  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  // Initialize players route
  app.post("/api/players/initialize", async (req, res) => {
    try {
      await initializePlayers();
      const players = await storage.getPlayers();
      res.json({ 
        message: "Players initialized successfully", 
        count: players.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to initialize players" });
    }
  });

  app.get("/api/players/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const players = await storage.getPlayersByType(type);

      // Get player selection percentages for each player
      const playersWithPercentages = await Promise.all(
        players.map(async (player) => {
          const selectionPercentage = await storage.getPlayerSelectionPercentage(player.id);
          return {
            ...player,
            selectionPercentage
          };
        })
      );

      res.json(playersWithPercentages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  // Team routes
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;

      // Validate team data
      const teamData = {
        ...req.body,
        userId,
      };

      // If contest ID is provided, validate that it exists and is in 'not_live' status
      if (req.body.contestId) {
        const contestId = parseInt(req.body.contestId);
        const contest = await storage.getContestById(contestId);

        if (!contest) {
          return res.status(400).json({ message: "Contest not found" });
        }

        if (contest.status !== 'not_live') {
          return res.status(400).json({ 
            message: "Cannot create team for a contest that is not accepting entries" 
          });
        }
      }

      const validatedTeamData = insertTeamSchema.parse(teamData);

      // Create team
      const team = await storage.createTeam(validatedTeamData);

      // Add players to team
      const { players, captainId, viceCaptainId } = req.body;
      if (Array.isArray(players) && players.length > 0) {
        for (const playerId of players) {
          await storage.createTeamPlayer({
            teamId: team.id,
            playerId,
            isCaptain: playerId === captainId,
            isViceCaptain: playerId === viceCaptainId
          });
        }
      }

      // Update team points
      await storage.updateTeamPoints(team.id);

      // Return the team with players
      const teamWithPlayers = await storage.getTeamWithPlayers(team.id);
      res.status(201).json(teamWithPlayers);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create team" });
      }
    }
  });

  app.get("/api/teams", isAdmin, async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/user", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const teams = await storage.getTeamsByUserId(userId);

      if (teams.length === 0) {
        return res.json(null);
      }

      // Just return the first team with players (users can only have one team in this app)
      const teamWithPlayers = await storage.getTeamWithPlayers(teams[0].id);
      res.json(teamWithPlayers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user team" });
    }
  });

  // Leaderboard route
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Contest routes
  app.get("/api/contests", async (req, res) => {
    try {
      const contests = await storage.getContests();
      res.json(contests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contests" });
    }
  });

  app.get("/api/contests/:id", async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const contest = await storage.getContestById(contestId);

      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      res.json(contest);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contest" });
    }
  });

  app.get("/api/contests/:id/leaderboard", async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const leaderboard = await storage.getContestLeaderboard(contestId);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contest leaderboard" });
    }
  });

  // Admin routes
  app.post("/api/admin/contests", isAdmin, async (req, res) => {
    try {
      // Validate contest data
      const contestData = {
        ...req.body,
        status: req.body.status || "not_live"
      };

      const validatedContestData = insertContestSchema.parse(contestData);

      // Create contest
      const contest = await storage.createContest(validatedContestData);
      res.status(201).json(contest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create contest" });
      }
    }
  });

  app.patch("/api/admin/contests/:id", isAdmin, async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);

      // Validate contest update data
      const updateData = updateContestSchema.parse(req.body);

      // Update contest
      const updatedContest = await storage.updateContest(contestId, updateData);

      if (!updatedContest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      res.json(updatedContest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update contest" });
      }
    }
  });

  app.delete("/api/admin/contests/:id", isAdmin, async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const deleted = await storage.deleteContest(contestId);

      if (!deleted) {
        return res.status(404).json({ message: "Contest not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contest" });
    }
  });

  app.delete("/api/admin/teams/:id", isAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const deleted = await storage.deleteTeam(teamId);

      if (!deleted) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  app.patch("/api/admin/players/:id", isAdmin, async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);

      // Validate player update data
      const updateData = updatePlayerSchema.parse(req.body);

      // Update player
      const updatedPlayer = await storage.updatePlayer(playerId, updateData);

      if (!updatedPlayer) {
        return res.status(404).json({ message: "Player not found" });
      }

      res.json(updatedPlayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update player" });
      }
    }
  });

  // Contest-specific player performance update
  app.post("/api/admin/contests/:contestId/players/:playerId/performance", isAdmin, async (req, res) => {
    try {
      const contestId = parseInt(req.params.contestId);
      const playerId = parseInt(req.params.playerId);
      const { runs = 0, boundaries = 0, sixes = 0, dotBalls = 0, wickets = 0 } = req.body;

      // Check if contest exists
      const contest = await storage.getContestById(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      // Check if player exists
      const player = await storage.getPlayerById(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Import the points calculator
      const { calculatePerformancePoints } = await import("./utils/pointsCalculator.js");

      // Calculate performance points
      const performancePoints = calculatePerformancePoints({
        runs,
        boundaries,
        sixes,
        dotBalls,
        wickets
      });

      // Update player performance for this specific contest
      const updatedPerformance = await storage.updatePlayerPerformance(playerId, contestId, {
        runs,
        boundaries,
        sixes,
        dotBalls,
        wickets,
        performancePoints
      });

      if (!updatedPerformance) {
        return res.status(500).json({ message: "Failed to update player performance" });
      }

      res.json({
        performance: updatedPerformance,
        calculatedPoints: performancePoints,
        breakdown: {
          runs,
          boundaries,
          sixes,
          dotBalls,
          wickets,
          runPoints: runs,
          boundaryBonus: boundaries * 4,
          sixBonus: sixes * 6,
          runMilestoneBonus: runs >= 50 ? 34 : (runs >= 25 ? 18 : 0),
          dotBallPoints: dotBalls,
          wicketPoints: wickets * 15,
          wicketMilestoneBonus: wickets >= 3 ? 18 : 0
        }
      });
    } catch (error) {
      console.error("Error updating player performance:", error);
      res.status(500).json({ message: "Failed to update player performance" });
    }
  });

  // Get player performances for a specific contest
  app.get("/api/contests/:contestId/performances", async (req, res) => {
    try {
      const contestId = parseInt(req.params.contestId);

      // Check if contest exists
      const contest = await storage.getContestById(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      const performances = await storage.getPlayerPerformancesByContest(contestId);

      // Get player details for each performance
      const enhancedPerformances = await Promise.all(
        performances.map(async (perf) => {
          const player = await storage.getPlayerById(perf.playerId);
          return {
            ...perf,
            player: player || { name: "Unknown Player" }
          };
        })
      );

      res.json(enhancedPerformances);
    } catch (error) {
      console.error("Error fetching performances:", error);
      res.status(500).json({ message: "Failed to fetch player performances" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}