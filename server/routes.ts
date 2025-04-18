import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { db } from "./db";
import { updatePlayerPointsSchema, createTeamWithPlayersSchema } from "@shared/schema";
import { z } from "zod";

// Helper function to ensure user is authenticated
function ensureAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Helper function to ensure user is admin
function ensureAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Initialize the database with default data if needed
  await initializeDatabase();
  
  // Match routes
  app.get("/api/match/current", async (req, res) => {
    try {
      const match = await storage.getCurrentMatch();
      if (!match) {
        return res.status(404).json({ message: "No live match found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching current match:", error);
      res.status(500).json({ message: "Error fetching current match" });
    }
  });
  
  // Player routes
  app.get("/api/players", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const includeStats = req.query.stats === 'true';
      
      let players;
      if (categoryId) {
        players = await storage.getPlayersByCategory(categoryId);
      } else {
        players = await storage.getAllPlayers();
      }
      
      // Add selection percentage statistics if requested
      if (includeStats) {
        const stats = await storage.getPlayerSelectionStats();
        const playersWithStats = players.map(player => {
          const playerStat = stats.find(stat => stat.playerId === player.id);
          return {
            ...player,
            selectionPercentage: playerStat ? playerStat.percentage : 0
          };
        });
        res.json(playersWithStats);
      } else {
        res.json(players);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Error fetching players" });
    }
  });
  
  app.get("/api/players/categories", async (req, res) => {
    try {
      const categories = await storage.getPlayerCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching player categories:", error);
      res.status(500).json({ message: "Error fetching player categories" });
    }
  });
  
  // Admin routes
  app.patch("/api/admin/players/:id/points", ensureAdmin, async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const result = updatePlayerPointsSchema.safeParse({
        id: playerId,
        ...req.body
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid player data", errors: result.error.format() });
      }
      
      const updatedPlayer = await storage.updatePlayerPoints(result.data);
      res.json(updatedPlayer);
    } catch (error) {
      console.error("Error updating player points:", error);
      res.status(500).json({ message: "Error updating player points" });
    }
  });
  
  app.get("/api/admin/teams", ensureAdmin, async (req, res) => {
    try {
      const teams = await storage.getTeamsWithPlayers();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams for admin:", error);
      res.status(500).json({ message: "Error fetching teams" });
    }
  });
  
  // Team routes
  app.post("/api/teams", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Check if user already has a team
      const existingTeam = await storage.getUserTeam(userId);
      if (existingTeam) {
        return res.status(400).json({ message: "You already have a team" });
      }
      
      const result = createTeamWithPlayersSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid team data", errors: result.error.format() });
      }
      
      const { teamName, playerIds, captainId, viceCaptainId, totalCredits } = result.data;
      
      // Check if team exceeds 1000 points/credits limit
      if (totalCredits > 1000) {
        return res.status(400).json({ message: "Team exceeds the 1000 points credit limit" });
      }
      
      // Validate captain and vice-captain
      if (!playerIds.includes(captainId)) {
        return res.status(400).json({ message: "Captain must be a selected player" });
      }
      
      if (!playerIds.includes(viceCaptainId)) {
        return res.status(400).json({ message: "Vice-Captain must be a selected player" });
      }
      
      if (captainId === viceCaptainId) {
        return res.status(400).json({ message: "Captain and Vice-Captain cannot be the same player" });
      }
      
      // Create the team
      const team = await storage.createTeam({
        name: teamName,
        userId
      });
      
      // Add players to the team
      for (const playerId of playerIds) {
        await storage.addPlayerToTeam({
          teamId: team.id,
          playerId,
          isCaptain: playerId === captainId,
          isViceCaptain: playerId === viceCaptainId
        });
      }
      
      // Return the created team with its players
      const teamPlayers = await storage.getTeamPlayers(team.id);
      res.status(201).json({
        team,
        players: teamPlayers
      });
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Error creating team" });
    }
  });
  
  app.get("/api/teams/my-team", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const team = await storage.getUserTeam(userId);
      
      if (!team) {
        return res.status(404).json({ message: "You don't have a team yet" });
      }
      
      const players = await storage.getTeamPlayers(team.id);
      const totalPoints = await storage.calculateTeamPoints(team.id);
      const rank = await storage.getTeamRank(team.id);
      
      res.json({
        team,
        players,
        totalPoints,
        rank
      });
    } catch (error) {
      console.error("Error fetching user team:", error);
      res.status(500).json({ message: "Error fetching your team" });
    }
  });
  
  // Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Error fetching leaderboard" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Initialize database with default data
async function initializeDatabase() {
  try {
    // Check if we already have player categories
    const categories = await storage.getPlayerCategories();
    
    if (categories.length === 0) {
      // Create player categories
      const allRounder = await storage.createPlayerCategory({ name: "All Rounder" });
      const batsman = await storage.createPlayerCategory({ name: "Batsman" });
      const bowler = await storage.createPlayerCategory({ name: "Bowler" });
      const wicketkeeper = await storage.createPlayerCategory({ name: "Wicketkeeper" });
      
      // Create players according to the requirements
      // All Rounders
      await storage.createPlayer({ name: "Ankur", categoryId: allRounder.id, points: 200, runs: 75, wickets: 2 });
      await storage.createPlayer({ name: "Prince", categoryId: allRounder.id, points: 150, runs: 50, wickets: 1 });
      await storage.createPlayer({ name: "Mayank", categoryId: allRounder.id, points: 140, runs: 45, wickets: 1 });
      await storage.createPlayer({ name: "Amit", categoryId: allRounder.id, points: 150, runs: 55, wickets: 1 });
      
      // Batsmen
      await storage.createPlayer({ name: "Kuki", categoryId: batsman.id, points: 160, runs: 80, wickets: 0 });
      await storage.createPlayer({ name: "Captain", categoryId: batsman.id, points: 90, runs: 45, wickets: 0 });
      await storage.createPlayer({ name: "Chintu", categoryId: batsman.id, points: 110, runs: 55, wickets: 0 });
      await storage.createPlayer({ name: "Paras Kumar", categoryId: batsman.id, points: 90, runs: 45, wickets: 0 });
      await storage.createPlayer({ name: "Pushkar", categoryId: batsman.id, points: 100, runs: 50, wickets: 0 });
      await storage.createPlayer({ name: "Dhilu", categoryId: batsman.id, points: 55, runs: 25, wickets: 0 });
      await storage.createPlayer({ name: "Kamal", categoryId: batsman.id, points: 110, runs: 55, wickets: 0 });
      await storage.createPlayer({ name: "Ajay", categoryId: batsman.id, points: 35, runs: 15, wickets: 0 });
      
      // Bowlers
      await storage.createPlayer({ name: "Pulkit", categoryId: bowler.id, points: 55, runs: 5, wickets: 1 });
      await storage.createPlayer({ name: "Nitish", categoryId: bowler.id, points: 110, runs: 10, wickets: 3 });
      await storage.createPlayer({ name: "Rahul", categoryId: bowler.id, points: 110, runs: 5, wickets: 3 });
      await storage.createPlayer({ name: "Karambeer", categoryId: bowler.id, points: 95, runs: 5, wickets: 2 });
      await storage.createPlayer({ name: "Manga", categoryId: bowler.id, points: 90, runs: 10, wickets: 2 });
      
      // Wicketkeeper
      await storage.createPlayer({ name: "None", categoryId: wicketkeeper.id, points: 0, runs: 0, wickets: 0 });
      
      // Create the match
      await storage.createMatch({
        id: 1,
        team1: "Team Dominator",
        team2: "Team Destroyer",
        status: "live",
        createdAt: new Date()
      });
      
      // Create admin user with fixed credentials
      const adminExists = await storage.getUserByUsername("admin");
      if (!adminExists) {
        await storage.createUser({
          username: "admin",
          password: await hashPassword("ritik123"), // Using the hashPassword function from auth.ts
          name: "Admin",
          email: "admin@cr13k3t.com",
          isAdmin: true
        });
        console.log("Admin user created");
      }
      
      console.log("Database initialized with default data");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
