import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertTeamSchema, insertTeamPlayerSchema } from "@shared/schema";
import { db } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Helper function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Check if user is admin
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Initialize database with player categories and players if they don't exist
 // Fix for the initializeDatabase function in routes.ts

async function initializeDatabase() {
  try {
    // Check if admin user exists
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      // Create admin user with fixed credentials
      await storage.createUser({
        username: "admin",
        password: await hashPassword("ritik123"),
        isAdmin: true
      });
      console.log("Admin user created with username: admin, password: ritik123");
    }

    // Initialize player categories if they don't exist
    const categories = await storage.getPlayerCategories();
    if (categories.length === 0) {
      console.log("Creating player categories...");
      // Use db.insert with values instead of direct SQL
      await db.insert(playerCategories).values([
        { name: "All-Rounder" },
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

      const allRounderId = categoryMap.get("All-Rounder");
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

  // Contest routes

  // Get all contests
  // Create a new match (admin only)
  app.post("/api/matches", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { team1, team2 } = req.body;
      
      if (!team1 || !team2) {
        return res.status(400).json({ message: "Both teams are required" });
      }

      const [match] = await db.insert(matches).values({
        team1,
        team2,
        status: 'live'
      }).returning();

      res.status(201).json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to create match" });
    }
  });

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
      const contestData = req.body;
      const newContest = await storage.createContest(contestData);
      res.status(201).json(newContest);
    } catch (error) {
      res.status(500).json({ message: "Failed to create contest" });
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
      res.status(500).json({ message: "Failed to retrieve players" });
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
  app.put("/api/players/:id", isAdmin, async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const { points } = req.body;

      if (typeof points !== 'number') {
        return res.status(400).json({ message: "Points must be a number" });
      }

      const updatedPlayer = await storage.updatePlayerPoints(playerId, points);
      res.json(updatedPlayer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update player points" });
    }
  });

  // Create a team
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Check if user already has a team
      const existingTeam = await storage.getTeamByUserId(userId);
      if (existingTeam) {
        return res.status(400).json({ message: "You already have a team" });
      }

      const teamData = insertTeamSchema.parse({
        ...req.body,
        userId
      });

      const team = await storage.createTeam(teamData);

      // Add players to team
      const { playerIds, captain, viceCaptain } = req.body;
      if (Array.isArray(playerIds)) {
        for (const playerId of playerIds) {
          await storage.addPlayerToTeam({
            teamId: team.id,
            playerId,
            isCaptain: playerId === captain,
            isViceCaptain: playerId === viceCaptain
          });
        }
      }

      // Add fixed "None" wicketkeeper
      const wicketkeepers = await storage.getPlayersByCategory(4); // Assuming 4 is wicketkeeper category
      if (wicketkeepers.length > 0) {
        await storage.addPlayerToTeam({
          teamId: team.id,
          playerId: wicketkeepers[0].id,
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
        return res.status(404).json({ message: "You don't have a team yet" });
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
  app.get("/api/teams", isAdmin, async (req, res) => {
    try {
      const teams = await storage.getAllTeamsWithPlayers();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve teams" });
    }
  });

  // Get teams by contest ID (admin only)
  app.get("/api/contests/:id/teams", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const teams = await storage.getTeamsByContestId(contestId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve teams for contest" });
    }
  });

  // Delete a team (admin only)
  app.delete("/api/teams/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      await storage.deleteTeamById(teamId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Get team by id
  app.get("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeamWithPlayers(teamId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve team" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to initialize database with admin user and initial data
async function initializeDatabase() {
  try {
    // Check if admin user exists
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      // Create admin user with fixed credentials
      await storage.createUser({
        username: "admin",
        password: await hashPassword("ritik123"),
        isAdmin: true
      });
      console.log("Admin user created with username: admin, password: ritik123");
    }

    // Initialize player categories if they don't exist
    const playerCategories = await db.select().from("playerCategories");
    if (playerCategories.length === 0) {
      console.log("Creating player categories...");
      await db.insert("playerCategories").values([
        { name: "All-Rounder" },
        { name: "Batsman" },
        { name: "Bowler" },
        { name: "Wicketkeeper" }
      ]);
      console.log("Player categories created");
    }

    // Initialize players if they don't exist
    const players = await db.select().from("players");
    if (players.length === 0) {
      console.log("Creating players...");

      // Get category IDs
      const categories = await db.select().from(playerCategories);
      const categoryMap = new Map();
      categories.forEach(category => {
        categoryMap.set(category.name, category.id);
      });

      const allRounderId = categoryMap.get("All-Rounder");
      const batsmanId = categoryMap.get("Batsman");
      const bowlerId = categoryMap.get("Bowler");
      const wicketkeeperId = categoryMap.get("Wicketkeeper");

      // Add All-Rounders
      await db.insert("players").values([
        { name: "Ankur", categoryId: allRounderId, creditPoints: 200, performancePoints: 0, selectionPercent: 35 },
        { name: "Prince", categoryId: allRounderId, creditPoints: 150, performancePoints: 0, selectionPercent: 28 },
        { name: "Mayank", categoryId: allRounderId, creditPoints: 140, performancePoints: 0, selectionPercent: 25 },
        { name: "Amit", categoryId: allRounderId, creditPoints: 150, performancePoints: 0, selectionPercent: 30 }
      ]);

      // Add Batsmen
      await db.insert("players").values([
        { name: "Kuki", categoryId: batsmanId, creditPoints: 160, performancePoints: 0, selectionPercent: 40 },
        { name: "Captain", categoryId: batsmanId, creditPoints: 90, performancePoints: 0, selectionPercent: 15 },
        { name: "Chintu", categoryId: batsmanId, creditPoints: 110, performancePoints: 0, selectionPercent: 20 },
        { name: "Paras Kumar", categoryId: batsmanId, creditPoints: 90, performancePoints: 0, selectionPercent: 18 },
        { name: "Pushkar", categoryId: batsmanId, creditPoints: 100, performancePoints: 0, selectionPercent: 22 },
        { name: "Dhilu", categoryId: batsmanId, creditPoints: 55, performancePoints: 0, selectionPercent: 10 },
        { name: "Kamal", categoryId: batsmanId, creditPoints: 110, performancePoints: 0, selectionPercent: 25 },
        { name: "Ajay", categoryId: batsmanId, creditPoints: 35, performancePoints: 0, selectionPercent: 5 }
      ]);

      // Add Bowlers
      await db.insert("players").values([
        { name: "Pulkit", categoryId: bowlerId, creditPoints: 55, performancePoints: 0, selectionPercent: 15 },
        { name: "Nitish", categoryId: bowlerId, creditPoints: 110, performancePoints: 0, selectionPercent: 30 },
        { name: "Rahul", categoryId: bowlerId, creditPoints: 110, performancePoints: 0, selectionPercent: 32 },
        { name: "Karambeer", categoryId: bowlerId, creditPoints: 95, performancePoints: 0, selectionPercent: 28 },
        { name: "Manga", categoryId: bowlerId, creditPoints: 90, performancePoints: 0, selectionPercent: 25 }
      ]);

      // Add "None" wicketkeeper
      await db.insert("players").values([
        { name: "None", categoryId: wicketkeeperId, creditPoints: 0, performancePoints: 0, selectionPercent: 100 }
      ]);

      console.log("Players created");
    }

    // Create a default contest if none exists
    const contests = await db.select().from("contests");
    if (contests.length === 0) {
      console.log("Creating default contest...");
      await db.insert("contests").values({
        name: "Dominator vs Destroyer Match",
        description: "Team Dominator takes on Team Destroyer in this exciting match!",
        rules: "1. Select 8 players within the 1000 credit limit.\n2. Include at least 2 bowlers.\n3. Assign a Captain (2x points) and Vice-Captain (1.5x points).",
        prizePool: 10000,
        entryFee: 100,
        maxEntries: 200,
        isLive: false
      });
      console.log("Default contest created");
    }

  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}
