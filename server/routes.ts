import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { db } from "./db";
import { updatePlayerPointsSchema, createTeamWithPlayersSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { matches, teamPlayers } from "@shared/schema";
import { z } from "zod";

function ensureAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}
function ensureAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && (req.user as any).isAdmin) return next();
  res.status(403).json({ message: "Forbidden" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  await initializeDatabase();

  app.get("/api/match/current", async (req, res) => {
    try {
      const m = await storage.getCurrentMatch();
      if (!m) return res.status(404).json({ message: "No live match" });
      res.json(m);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error" });
    }
  });

  app.post("/api/matches", ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
      const { team1, team2 } = req.body;
      if (!team1 || !team2) return res.status(400).json({ message: "Teams required" });
      const [m] = await db.insert(matches).values({ team1, team2, status: 'live' }).returning();
      res.status(201).json(m);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.get("/api/players", async (req, res) => {
    try {
      const cid = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const stats = req.query.stats === 'true';
      let list = cid ? await storage.getPlayersByCategory(cid) : await storage.getAllPlayers();
      if (stats) {
        const ss = await storage.getPlayerSelectionStats();
        list = list.map(p => ({ ...p, selectionPercentage: ss.find(st => st.playerId===p.id)?.percentage||0 }));
      }
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error fetching players" });
    }
  });

  app.get("/api/players/categories", async (req, res) => {
    try {
      res.json(await storage.getPlayerCategories());
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  app.patch("/api/admin/teams/:teamId", ensureAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const { playerIds, captainId, viceCaptainId } = req.body;
      const allP = await storage.getAllPlayers();
      const bow = await storage.getPlayerCategoryByName("Bowler");
      if (!bow) return res.status(400).json({ message: "No Bowler category" });
      if (allP.filter(p=>playerIds.includes(p.id)&&p.categoryId===bow.id).length<3)
        return res.status(400).json({ message: "At least 3 bowlers" });
      await db.delete(teamPlayers).where(eq(teamPlayers.teamId, teamId));
      for(const pid of playerIds) await storage.addPlayerToTeam({ teamId, playerId: pid, isCaptain: pid===captainId, isViceCaptain: pid===viceCaptainId });
      res.json({ team: await storage.getTeam(teamId), players: await storage.getTeamPlayers(teamId) });
    } catch(e) { console.error(e); res.status(500).json({ message: "Error" }); }
  });

  app.patch("/api/admin/players/:id/points", ensureAdmin, async (req, res) => {
    try {
      const pid = parseInt(req.params.id);
      const parsed = updatePlayerPointsSchema.safeParse({ id: pid, ...req.body });
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.format() });
      res.json(await storage.updatePlayerPoints(parsed.data));
    } catch(e) { console.error(e); res.status(500).json({ message:"Error" }); }
  });

  app.get("/api/admin/teams", ensureAdmin, async (req, res) => {
    try { res.json(await storage.getTeamsWithPlayers()); } catch(e){res.status(500).json({message:"Error"});}
  });

  app.post("/api/teams", ensureAuthenticated, async (req, res) => {
    try {
      const uid = (req.user as any).id;
      if (await storage.getUserTeam(uid)) return res.status(400).json({ message:"Already has team" });
      const result = createTeamWithPlayersSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message:"Invalid", errors:result.error.format() });
      const { teamName, playerIds, captainId, viceCaptainId, totalCredits } = result.data;
      if(totalCredits>1000) return res.status(400).json({message:"Over credits"});
      const allP2 = await storage.getAllPlayers();
      const bow2 = await storage.getPlayerCategoryByName("Bowler");
      if(!bow2|| allP2.filter(p=>playerIds.includes(p.id)&&p.categoryId===bow2.id).length<3)
        return res.status(400).json({message:"At least 3 bowlers"});
      if(!playerIds.includes(captainId)||!playerIds.includes(viceCaptainId)||captainId===viceCaptainId)
        return res.status(400).json({message:"Invalid C/V"});
      const t = await storage.createTeam({ name: teamName, userId: uid });
      for(const pid of playerIds) await storage.addPlayerToTeam({ teamId:t.id, playerId: pid, isCaptain:pid===captainId, isViceCaptain:pid===viceCaptainId });
      res.status(201).json({ team: t, players: await storage.getTeamPlayers(t.id) });
    } catch(e){console.error(e);res.status(500).json({message:"Error"});}
  });

  app.get("/api/teams/my-team", async (req, res) => {
  try {
    const team = await storage.getUserTeam(req.user.id); // Assuming req.user.id holds the current user's ID
    if (!team) {
      return res.status(404).json({ message: "No team" });
    }
    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ message: "Error fetching team" });
  }
});


  app.get("/api/leaderboard", async (req,res)=>{
    try{res.json(await storage.getLeaderboard());}catch(e){console.error(e);res.status(500).json({message:"Error"});}
  });

  const server = createServer(app);
  return server;
}

async function initializeDatabase() {
  try {
    if ((await storage.getplayercategories()).length === 0) {
      const ar = await storage.createplayercategory({ name: "All Rounder" });
      const ba = await storage.createplayercategory({ name: "Batsman" });
      const bo = await storage.createplayercategory({ name: "Bowler" });
      const wk = await storage.createplayercategory({ name: "Wicketkeeper" });
      await storage.createPlayer({ name: "Ankur", categoryId: ar.id, creditPoints:200, performancePoints:200, runs:75, wickets:2 });
      // ... insert other players similarly ...
      await storage.createMatch({ team1:"Team Dominator", team2:"Team Destroyer", status:"live" });
      if(!(await storage.getUserByUsername("admin"))) {
        await storage.createUser({ username:"admin", password:await hashPassword("ritik123"), name:"Admin", email:"admin@cr13k3t.com", isAdmin:true });
      }
    }
  } catch(e){ console.error("DB init error",e); }
}
