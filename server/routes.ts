import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertTeamSchema, insertTeamPlayerSchema, playerCategories, players,
  createTeamWithPlayersSchema, updatePlayerPointsSchema, insertContestSchema,
  insertMatchSchema, matches, users
} from "@shared/schema";
import { db } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

// Helper function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Check if user is admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Initialize database with player categories and players if they don't exist
  async function initializeDatabase() {
    try {
      // Check if admin user exists
      const adminUser = await storage.getUserByUsername("admin");
      if (!adminUser) {
        // Create admin user with fixed credentials
        await storage.createUser({
          username: "admin",
          password: await hashPassword("admin123"),
          isAdmin: true
        });
        console.log("Admin user created with username: admin, password: admin123");
      }

      // Initialize player categories if they don't exist
      const categories = await storage.getPlayerCategories();
      if (categories.length === 0) {
        console.log("Creating player categories...");
        // Use db.insert with values instead of direct SQL
        await db.insert(playerCategories).values([
          { name: "All Rounder" },
          { name: "Batsman" },
          { name: "Bowler" },
          { name: "Wicketkeeper" }
        ]);
        console.log("Player categories created");
      }

      // Initialize players if they don't exist
      const allPlayers = await storage.getPlayers();
      if (allPlayers.length === 0) {
        console.log("Creating players...");

        // Get category IDs
        const categoriesAfterInsert = await storage.getPlayerCategories();
        const categoryMap = new Map();
        categoriesAfterInsert.forEach(category => {
          categoryMap.set(category.name, category.id);
        });

        const allRounderId = categoryMap.get("All Rounder");
        const batsmanId = categoryMap.get("Batsman");
        const bowlerId = categoryMap.get("Bowler");
        const wicketkeeperId = categoryMap.get("Wicketkeeper");

        // Add players properly using the ORM instead of raw SQL
        await db.insert(players).values([
          { name: "Ankur", categoryId: allRounderId, creditPoints: 200, performancePoints: 0, selectionPercent: 35 },
          { name: "Prince", categoryId: allRounderId, creditPoints: 150, performancePoints: 0, selectionPercent: 28 },
          { name: "Mayank", categoryId: allRounderId, creditPoints: 140, performancePoints: 0, selectionPercent: 25 },
          { name: "Amit", categoryId: allRounderId, creditPoints: 150, performancePoints: 0, selectionPercent: 30 }
        ]);

        await db.insert(players).values([
          { name: "Kuki", categoryId: batsmanId, creditPoints: 160, performancePoints: 0, selectionPercent: 40 },
          { name: "Captain", categoryId: batsmanId, creditPoints: 90, performancePoints: 0, selectionPercent: 15 },
          { name: "Chintu", categoryId: batsmanId, creditPoints: 110, performancePoints: 0, selectionPercent: 20 },
          { name: "Paras Kumar", categoryId: batsmanId, creditPoints: 90, performancePoints: 0, selectionPercent: 18 },
          { name: "Pushkar", categoryId: batsmanId, creditPoints: 100, performancePoints: 0, selectionPercent: 22 },
          { name: "Dhilu", categoryId: batsmanId, creditPoints: 55, performancePoints: 0, selectionPercent: 10 },
          { name: "Kamal", categoryId: batsmanId, creditPoints: 110, performancePoints: 0, selectionPercent: 25 },
          { name: "Ajay", categoryId: batsmanId, creditPoints: 35, performancePoints: 0, selectionPercent: 5 }
        ]);

        await db.insert(players).values([
          { name: "Pulkit", categoryId: bowlerId, creditPoints: 55, performancePoints: 0, selectionPercent: 15 },
          { name: "Nitish", categoryId: bowlerId, creditPoints: 110, performancePoints: 0, selectionPercent: 30 },
          { name: "Rahul", categoryId: bowlerId, creditPoints: 110, performancePoints: 0, selectionPercent: 30 },
          { name: "Karambeer", categoryId: bowlerId, creditPoints: 95, performancePoints: 0, selectionPercent: 25 },
          { name: "Manga", categoryId: bowlerId, creditPoints: 90, performancePoints: 0, selectionPercent: 20 }
        ]);

        await db.insert(players).values([
          { name: "None", categoryId: wicketkeeperId, creditPoints: 0, performancePoints: 0, selectionPercent: 0 }
        ]);

        console.log("Players created successfully");
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  // Run database initialization
  await initializeDatabase();

  // Get player categories
  app.get("/api/players/categories", async (req, res) => {
    try {
      const categories = await storage.getPlayerCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve player categories" });
    }
  });

  // Match routes
  // Get all matches
  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve matches" });
    }
  });
  
  // Get live matches or create default one if none exists
  app.get("/api/matches/live", async (req, res) => {
    try {
      // Get all matches
      const allMatches = await storage.getMatches();
      
      // Filter for live matches
      const liveMatches = allMatches.filter(match => match.status === 'live');
      
      // If no live matches, create a default one
      if (liveMatches.length === 0) {
        // Check if we already have the default match
        const defaultMatch = allMatches.find(
          match => match.team1 === 'Destroyer' && match.team2 === 'Dominator'
        );
        
        if (defaultMatch) {
          // Update the existing match to live status
          const updatedMatch = await storage.updateMatchStatus(defaultMatch.id, 'live');
          return res.json([updatedMatch]);
        } else {
          // Create a new default match
          const newMatch = await storage.createMatch({
            team1: 'Destroyer',
            team2: 'Dominator',
            status: 'live',
            venue: 'Fantasy Stadium'
          });
          return res.json([newMatch]);
        }
      }
      
      res.json(liveMatches);
    } catch (error) {
      console.error("Error fetching live matches:", error);
      res.status(500).json({ message: "Failed to retrieve live matches" });
    }
  });

  // Get match by ID
  app.get("/api/matches/:id", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const match = await storage.getMatchById(matchId);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      res.json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve match" });
    }
  });

  // Create a new match (admin only)
  app.post("/api/matches", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const matchData = insertMatchSchema.parse(req.body);
      const newMatch = await storage.createMatch(matchData);
      res.status(201).json(newMatch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid match data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create match" });
      }
    }
  });

  // Update match status (admin only)
  app.patch("/api/matches/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { status } = req.body;

      if (typeof status !== 'string' || !['live', 'completed', 'upcoming'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const updatedMatch = await storage.updateMatchStatus(matchId, status);
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to update match status" });
    }
  });

  // Contest routes
  // Get all contests
  app.get("/api/contests", async (req, res) => {
    try {
      const contests = await storage.getContests();
      res.json(contests);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve contests" });
    }
  });

  // Get contest by ID
  app.get("/api/contests/:id", async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const contest = await storage.getContestById(contestId);

      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      res.json(contest);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve contest" });
    }
  });

  // Create a new contest (admin only)
  app.post("/api/contests", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const contestData = insertContestSchema.parse(req.body);
      const newContest = await storage.createContest(contestData);
      res.status(201).json(newContest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contest data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create contest" });
      }
    }
  });

  // Update a contest (admin only)
  app.patch("/api/contests/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const contestData = req.body;

      const updatedContest = await storage.updateContest(contestId, contestData);
      res.json(updatedContest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contest" });
    }
  });

  // Delete a contest (admin only)
  app.delete("/api/contests/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      await storage.deleteContest(contestId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contest" });
    }
  });

  // Toggle contest live status (admin only)
  app.patch("/api/contests/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const { isLive } = req.body;

      if (typeof isLive !== 'boolean') {
        return res.status(400).json({ message: "isLive must be a boolean" });
      }

      const updatedContest = await storage.setContestLiveStatus(contestId, isLive);
      res.json(updatedContest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contest status" });
    }
  });

  // Get all players
  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Error fetching players" });
    }
  });

  // Get players by category
  app.get("/api/players/category/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const players = await storage.getPlayersByCategory(categoryId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve players by category" });
    }
  });

  // Update player points (admin only)
  app.put("/api/players/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const { points } = updatePlayerPointsSchema.parse(req.body);

      const updatedPlayer = await storage.updatePlayerPoints(playerId, points);
      res.json(updatedPlayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid points data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update player points" });
      }
    }
  });

  // Get player selection stats (using existing logic)
  app.get("/api/players/stats/selection", async (req, res) => {
    try {
      const stats = await storage.getPlayerSelectionStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve player selection stats" });
    }
  });

  // Create a team
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, contestId, playerIds, captain, viceCaptain } = createTeamWithPlayersSchema.parse(req.body);

      // Check if user already has a team for this contest
      const userTeams = await storage.getTeamsByUserId(userId);
      const existingTeamForContest = userTeams.find(team => team.contestId === contestId);
      
      if (existingTeamForContest) {
        return res.status(400).json({ message: "You already have a team for this contest" });
      }

      // Create the team
      const team = await storage.createTeam({
        name,
        userId,
        contestId
      });

      // Calculate credit points used
      let totalCreditPoints = 0;
      
      // Add players to team
      for (const playerId of playerIds) {
        const player = await storage.getPlayerById(playerId);
        if (!player) {
          continue;
        }
        
        totalCreditPoints += player.creditPoints;
        
        await storage.addPlayerToTeam({
          teamId: team.id,
          playerId,
          playerCreditPoints: player.creditPoints,
          isCaptain: playerId === captain,
          isViceCaptain: playerId === viceCaptain
        });
      }

      // Add fixed "None" wicketkeeper if not already selected
      const wicketkeepers = await storage.getPlayersByCategory(4); // Assuming 4 is wicketkeeper category
      if (wicketkeepers.length > 0 && !playerIds.includes(wicketkeepers[0].id)) {
        await storage.addPlayerToTeam({
          teamId: team.id,
          playerId: wicketkeepers[0].id,
          playerCreditPoints: 0,
          isCaptain: false,
          isViceCaptain: false
        });
      }

      // Get complete team with players
      const teamWithPlayers = await storage.getTeamWithPlayers(team.id);
      res.status(201).json(teamWithPlayers);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid team data", errors: error.errors });
      } else {
        console.error("Error creating team:", error);
        res.status(500).json({ message: "Failed to create team" });
      }
    }
  });

  // Get user's team
  app.get("/api/teams/my-team", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const team = await storage.getTeamByUserId(userId);

      if (!team) {
        return res.status(404).json({ message: "No team" });
      }

      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve team" });
    }
  });

  // Get team rankings
  app.get("/api/teams/rankings", async (req, res) => {
    try {
      const rankings = await storage.getTeamRankings();
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve team rankings" });
    }
  });

  // Get all teams with players (admin only)
  app.get("/api/teams", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const teams = await storage.getAllTeamsWithPlayers();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve teams" });
    }
  });

  // Get teams by contest ID
  app.get("/api/contests/:id/teams", isAuthenticated, async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const isUserAdmin = req.user?.isAdmin === true;
      
      // Get the teams in the contest
      const teams = await storage.getTeamsByContestId(contestId);
      
      // If user is not admin, only return their team
      if (!isUserAdmin) {
        const userTeam = teams.find(team => team.userId === req.user!.id);
        return res.json(userTeam ? [userTeam] : []);
      }
      
      // Admin gets all teams
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve teams" });
    }
  });

  // Delete a team (owner or admin)
  app.delete("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeamById(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if user is authorized (team owner or admin)
      if (team.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this team" });
      }
      
      await storage.deleteTeamById(teamId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // API endpoint to get database debug info
  app.get("/api/debug/database", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get counts from tables
      const playerCount = await db.select().from(players).execute();
      const categoryCount = await db.select().from(playerCategories).execute();
      const matchCount = await db.select().from(matches).execute();
      
      res.json({
        status: "Database is healthy",
        recordCounts: {
          players: playerCount.length,
          categories: categoryCount.length,
          matches: matchCount.length
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          dbConnected: true
        }
      });
    } catch (error) {
      console.error("Database debug error:", error);
      res.status(500).json({ 
        status: "Database error",
        error: String(error),
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
