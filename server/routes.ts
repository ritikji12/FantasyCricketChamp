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
  // Set content type for any error responses
  res.setHeader('Content-Type', 'application/json');
  
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Check if user is admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  // Set content type for any error responses
  res.setHeader('Content-Type', 'application/json');
  
  if (req.isAuthenticated()) {
    if (req.user?.isAdmin) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  return res.status(401).json({ message: "Unauthorized" });
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
      res.setHeader('Content-Type', 'application/json');
      const categories = await storage.getPlayerCategories();
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching player categories:", error);
      return res.status(500).json({ message: "Failed to retrieve player categories" });
    }
  });

  // Match routes
  // Get all matches
  app.get("/api/matches", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const matches = await storage.getMatches();
      return res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).json({ message: "Failed to retrieve matches" });
    }
  });
  
  // Get live matches or create default one if none exists
  app.get("/api/matches/live", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
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
      
      return res.json(liveMatches);
    } catch (error) {
      console.error("Error fetching live matches:", error);
      return res.status(500).json({ message: "Failed to retrieve live matches" });
    }
  });

  // Get match by ID
  app.get("/api/matches/:id", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const matchId = parseInt(req.params.id);
      const match = await storage.getMatchById(matchId);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      return res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      return res.status(500).json({ message: "Failed to retrieve match" });
    }
  });

  // Create a new match (admin only)
  app.post("/api/matches", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Make sure the content type is properly set
      res.setHeader('Content-Type', 'application/json');
      
      // Validate and parse the incoming data
      const matchData = req.body;
      
      // Basic validation
      if (!matchData.team1 || !matchData.team2) {
        return res.status(400).json({ 
          message: "Invalid match data", 
          errors: "Both team1 and team2 are required" 
        });
      }
      
      // Set default values if not provided
      const processedMatchData = {
        team1: matchData.team1,
        team2: matchData.team2,
        status: matchData.status || 'upcoming',
        venue: matchData.venue || 'Default Stadium'
      };
      
      // Create the match using storage
      const newMatch = await storage.createMatch(processedMatchData);
      
      // Return JSON response
      return res.status(201).json(newMatch);
    } catch (error) {
      console.error("Error creating match:", error);
      return res.status(500).json({ 
        message: "Failed to create match", 
        error: String(error)
      });
    }
  });

  // Update match status (admin only)
  app.patch("/api/matches/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Set content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      const matchId = parseInt(req.params.id);
      const { status } = req.body;

      if (typeof status !== 'string' || !['live', 'completed', 'upcoming'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const updatedMatch = await storage.updateMatchStatus(matchId, status);
      return res.json(updatedMatch);
    } catch (error) {
      console.error("Error updating match status:", error);
      return res.status(500).json({ 
        message: "Failed to update match status",
        error: String(error)
      });
    }
  });

  // Contest routes
  // Get all contests
  app.get("/api/contests", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const contests = await storage.getContests();
      return res.json(contests);
    } catch (error) {
      console.error("Error fetching contests:", error);
      return res.status(500).json({ message: "Failed to retrieve contests" });
    }
  });

  // Get contest by ID
  app.get("/api/contests/:id", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const contestId = parseInt(req.params.id);
      const contest = await storage.getContestById(contestId);

      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      return res.json(contest);
    } catch (error) {
      console.error("Error fetching contest:", error);
      return res.status(500).json({ message: "Failed to retrieve contest" });
    }
  });

  // Create a new contest (admin only)
  app.post("/api/contests", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Set content type header
      res.setHeader('Content-Type', 'application/json');
      
      const contestData = req.body;
      
      // Basic validation
      if (!contestData.name) {
        return res.status(400).json({ message: "Contest name is required" });
      }
      
      const newContest = await storage.createContest(contestData);
      return res.status(201).json(newContest);
    } catch (error) {
      console.error("Error creating contest:", error);
      return res.status(500).json({ 
        message: "Failed to create contest",
        error: String(error)
      });
    }
  });

  // Update a contest (admin only)
  app.patch("/api/contests/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const contestId = parseInt(req.params.id);
      const contestData = req.body;

      const updatedContest = await storage.updateContest(contestId, contestData);
      return res.json(updatedContest);
    } catch (error) {
      console.error("Error updating contest:", error);
      return res.status(500).json({ 
        message: "Failed to update contest",
        error: String(error)
      });
    }
  });

  // Delete a contest (admin only)
  app.delete("/api/contests/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const contestId = parseInt(req.params.id);
      await storage.deleteContest(contestId);
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting contest:", error);
      return res.status(500).json({ 
        message: "Failed to delete contest",
        error: String(error)
      });
    }
  });

  // Toggle contest live status (admin only)
  app.patch("/api/contests/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const contestId = parseInt(req.params.id);
      const { isLive } = req.body;

      if (typeof isLive !== 'boolean') {
        return res.status(400).json({ message: "isLive must be a boolean" });
      }

      const updatedContest = await storage.setContestLiveStatus(contestId, isLive);
      return res.json(updatedContest);
    } catch (error) {
      console.error("Error updating contest status:", error);
      return res.status(500).json({ 
        message: "Failed to update contest status",
        error: String(error)
      });
    }
  });

  // Get all players
  app.get("/api/players", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const players = await storage.getPlayers();
      
      // Debug log to check data
      if (players.length > 0) {
        console.log("Sample player data:", JSON.stringify(players[0], null, 2));
      }
      
      return res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      return res.status(500).json({ message: "Error fetching players" });
    }
  });

  // Get players by category
  app.get("/api/players/category/:id", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const categoryId = parseInt(req.params.id);
      const players = await storage.getPlayersByCategory(categoryId);
      
      // Debug log to check data
      if (players.length > 0) {
        console.log(`Sample player data for category ${categoryId}:`, JSON.stringify(players[0], null, 2));
      }
      
      return res.json(players);
    } catch (error) {
      console.error("Error fetching players by category:", error);
      return res.status(500).json({ message: "Failed to retrieve players by category" });
    }
  });

  // Update player performance points (admin only)
  app.put("/api/players/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const playerId = parseInt(req.params.id);
      const { points } = req.body;

      if (typeof points !== 'number') {
        return res.status(400).json({ message: "Points must be a number" });
      }

      const updatedPlayer = await storage.updatePlayerPoints(playerId, points);
      return res.json(updatedPlayer);
    } catch (error) {
      console.error("Error updating player points:", error);
      return res.status(500).json({ 
        message: "Failed to update player points",
        error: String(error)
      });
    }
  });

  // Get player selection stats
  app.get("/api/players/stats/selection", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const stats = await storage.getPlayerSelectionStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching player selection stats:", error);
      return res.status(500).json({ message: "Failed to retrieve player selection stats" });
    }
  });

  // Create a team
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const userId = req.user!.id;
      const { name, contestId, playerIds, captain, viceCaptain } = req.body;
      
      // Basic validation
      if (!name || !contestId || !playerIds || !Array.isArray(playerIds) || !captain || !viceCaptain) {
        return res.status(400).json({
          message: "Invalid team data",
          errors: "Name, contestId, playerIds array, captain, and viceCaptain are required"
        });
      }

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
      return res.status(201).json(teamWithPlayers);
    } catch (error) {
      console.error("Error creating team:", error);
      return res.status(500).json({ 
        message: "Failed to create team",
        error: String(error)
      });
    }
  });

  // Get user's team
  app.get("/api/teams/my-team", isAuthenticated, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const userId = req.user!.id;
      const team = await storage.getTeamByUserId(userId);

      if (!team) {
        return res.status(404).json({ message: "No team" });
      }

      return res.json(team);
    } catch (error) {
      console.error("Error fetching user's team:", error);
      return res.status(500).json({ message: "Failed to retrieve team" });
    }
  });

  // Get team rankings
  app.get("/api/teams/rankings", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const rankings = await storage.getTeamRankings();
      return res.json(rankings);
    } catch (error) {
      console.error("Error fetching team rankings:", error);
      return res.status(500).json({ message: "Failed to retrieve team rankings" });
    }
  });

  // Get all teams with players (admin only)
  app.get("/api/teams", isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const teams = await storage.getAllTeamsWithPlayers();
      return res.json(teams);
    } catch (error) {
      console.error("Error fetching all teams:", error);
      return res.status(500).json({ message: "Failed to retrieve teams" });
    }
  });

  // Get teams by contest ID
  app.get("/api/contests/:id/teams", isAuthenticated, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
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
      return res.json(teams);
    } catch (error) {
      console.error("Error fetching teams by contest:", error);
      return res.status(500).json({ message: "Failed to retrieve teams" });
    }
  });

  // Delete a team (owner or admin)
  app.delete("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
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
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      return res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Add debug endpoint for credit points display
  app.get("/api/debug/players-with-credit-points", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      // Get players with categories including credit points
      const players = await storage.getPlayers();
      
      // Format the response to clearly show if credit points are present
      const debugResponse = players.map(player => ({
        id: player.id,
        name: player.name,
        category: player.categoryName,
        credit_points_present: player.creditPoints !== undefined,
        credit_points_value: player.creditPoints,
        credit_points_type: typeof player.creditPoints
      })).slice(0, 10); // Just get the first 10 for brevity
      
      return res.json({
        debug_info: "Checking if credit points are present in player data",
        players: debugResponse
      });
    } catch (error) {
      console.error("Debug error:", error);
      return res.status(500).json({ error: String(error) });
    }
  });

  // API endpoint to get database debug info
  app.get("/api/debug/database", isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      // Get counts from tables
      const playerCount = await db.select().from(players).execute();
      const categoryCount = await db.select().from(playerCategories).execute();
      const matchCount = await db.select().from(matches).execute();
      
      return res.json({
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
      return res.status(500).json({ 
        status: "Database error",
        error: String(error),
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
