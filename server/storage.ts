import { users, players, teams, teamPlayers, matches, playerCategories, 
  type User, type InsertUser, type Player, type InsertPlayer, 
  type Team, type InsertTeam, type TeamPlayer, type InsertTeamPlayer, 
  type Match, type PlayerCategory, type InsertPlayerCategory, type UpdatePlayerPoints } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Player Categories
  getPlayerCategories(): Promise<PlayerCategory[]>;
  getPlayerCategoryByName(name: string): Promise<PlayerCategory | undefined>;
  createPlayerCategory(category: InsertPlayerCategory): Promise<PlayerCategory>;
  
  // Players
  getPlayersByCategory(categoryId: number): Promise<Player[]>;
  getAllPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerPoints(playerData: UpdatePlayerPoints): Promise<Player>;
  
  // Teams
  getUserTeam(userId: number): Promise<Team | undefined>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  addPlayerToTeam(teamPlayer: InsertTeamPlayer): Promise<void>;
  getTeamPlayers(teamId: number): Promise<Player[]>;
  getAllTeams(): Promise<Team[]>;
  getTeamsWithPlayers(): Promise<any[]>;
  
  // Matches
  getMatch(id: number): Promise<Match | undefined>;
  getCurrentMatch(): Promise<Match | undefined>;
  createMatch(match: Match): Promise<Match>;
  
  // Rankings and stats
  calculateTeamPoints(teamId: number): Promise<number>;
  getLeaderboard(): Promise<any[]>;
  getTeamRank(teamId: number): Promise<number>;
  
  // Session
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }
  
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  // Player Categories
  async getPlayerCategories(): Promise<PlayerCategory[]> {
    return db.select().from(playerCategories);
  }
  
  async getPlayerCategoryByName(name: string): Promise<PlayerCategory | undefined> {
    const [category] = await db.select().from(playerCategories).where(eq(playerCategories.name, name));
    return category;
  }
  
  async createPlayerCategory(category: InsertPlayerCategory): Promise<PlayerCategory> {
    const [newCategory] = await db.insert(playerCategories).values(category).returning();
    return newCategory;
  }
  
  // Players
  async getPlayersByCategory(categoryId: number): Promise<Player[]> {
    return db.select().from(players).where(eq(players.categoryId, categoryId));
  }
  
  async getAllPlayers(): Promise<Player[]> {
    return db.select().from(players);
  }
  
  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }
  
  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }
  
  async updatePlayerPoints(playerData: UpdatePlayerPoints): Promise<Player> {
    const { id, runs, wickets, points } = playerData;
    
    const updatedValues: any = { points };
    if (runs !== undefined) updatedValues.runs = runs;
    if (wickets !== undefined) updatedValues.wickets = wickets;
    
    const [updatedPlayer] = await db
      .update(players)
      .set(updatedValues)
      .where(eq(players.id, id))
      .returning();
    
    return updatedPlayer;
  }
  
  // Teams
  async getUserTeam(userId: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    return team;
  }
  
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }
  
  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }
  
  async addPlayerToTeam(teamPlayer: InsertTeamPlayer): Promise<void> {
    await db.insert(teamPlayers).values(teamPlayer);
  }
  
  async getTeamPlayers(teamId: number): Promise<Player[]> {
    const result = await db
      .select({
        id: players.id,
        name: players.name,
        categoryId: players.categoryId,
        points: players.points,
        runs: players.runs,
        wickets: players.wickets
      })
      .from(teamPlayers)
      .innerJoin(players, eq(teamPlayers.playerId, players.id))
      .where(eq(teamPlayers.teamId, teamId));
    
    return result;
  }
  
  async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }
  
  async getTeamsWithPlayers(): Promise<any[]> {
    const allTeams = await this.getAllTeams();
    const result = [];
    
    for (const team of allTeams) {
      const user = await this.getUser(team.userId);
      const teamPlayers = await this.getTeamPlayers(team.id);
      const totalPoints = await this.calculateTeamPoints(team.id);
      const rank = await this.getTeamRank(team.id);
      
      result.push({
        team,
        user,
        players: teamPlayers,
        totalPoints,
        rank,
        playerCount: teamPlayers.length
      });
    }
    
    return result.sort((a, b) => a.rank - b.rank);
  }
  
  // Matches
  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }
  
  async getCurrentMatch(): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.status, 'live'));
    return match;
  }
  
  async createMatch(match: Match): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }
  
  // Rankings and stats
  async calculateTeamPoints(teamId: number): Promise<number> {
    const teamPlayers = await this.getTeamPlayers(teamId);
    return teamPlayers.reduce((total, player) => total + player.points, 0);
  }
  
  async getLeaderboard(): Promise<any[]> {
    const teams = await this.getAllTeams();
    const leaderboardEntries = [];
    
    for (const team of teams) {
      const totalPoints = await this.calculateTeamPoints(team.id);
      const user = await this.getUser(team.userId);
      
      leaderboardEntries.push({
        teamId: team.id,
        teamName: team.name,
        userName: user?.name,
        totalPoints
      });
    }
    
    return leaderboardEntries.sort((a, b) => b.totalPoints - a.totalPoints);
  }
  
  async getTeamRank(teamId: number): Promise<number> {
    const leaderboard = await this.getLeaderboard();
    const index = leaderboard.findIndex(entry => entry.teamId === teamId);
    return index !== -1 ? index + 1 : leaderboard.length + 1;
  }
}

export const storage = new DatabaseStorage();
