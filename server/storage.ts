import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  users,
  players,
  teams,
  teamPlayers,
  playerCategories,
  matches,
  type User,
  type InsertUser,
  type Player,
  type InsertPlayer,
  type Team,
  type InsertTeam,
  type TeamPlayer,
  type InsertTeamPlayer,
  type PlayerCategory,
  type InsertPlayerCategory,
  type UpdatePlayerPoints,
  type PlayerWithCategory,
  type TeamWithPlayers,
  type TeamRanking,
  type Contest,
  type InsertContest,
  type Match
} from "@shared/schema";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getPlayerCategories(): Promise<PlayerCategory[]>;
  getPlayerCategoryByName(name: string): Promise<PlayerCategory | undefined>;
  createPlayerCategory(data: InsertPlayerCategory): Promise<PlayerCategory>;

  // Players
  getAllPlayers(): Promise<Player[]>;
  getPlayersByCategory(categoryId: number): Promise<Player[]>;
  getPlayerSelectionStats(): Promise<{ playerId: number; count: number; percentage: number }[]>;
  updatePlayerPoints(data: UpdatePlayerPoints): Promise<Player>;

  // Teams
  getTeamsWithPlayers(): Promise<TeamWithPlayers[]>;
  getUserTeam(userId: number): Promise<Team | undefined>;
  getTeamPlayers(teamId: number): Promise<TeamWithPlayers["players"]>;
  calculateTeamPoints(teamId: number): Promise<number>;
  getTeamRank(teamId: number): Promise<number>;
  createTeam(data: InsertTeam): Promise<Team>;
  addPlayerToTeam(data: InsertTeamPlayer): Promise<void>;

  // Matches
  getCurrentMatch(): Promise<Match | undefined>;
  createMatch(data: Partial<Match>): Promise<Match>;

  // Leaderboard
  getLeaderboard(): Promise<TeamRanking[]>;

  // Session store
  sessionStore: Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // Users
  async getUser(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser) {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Categories
  async getPlayerCategories() {
    return db.select().from(playerCategories);
  }

  async getPlayerCategoryByName(name: string) {
    const [cat] = await db.select().from(playerCategories).where(eq(playerCategories.name, name));
    return cat;
  }

  async createPlayerCategory(data: InsertPlayerCategory) {
    const [cat] = await db.insert(playerCategories).values(data).returning();
    return cat;
  }

  // Players
  async getAllPlayers() {
    return db.select().from(players);
  }

  async getPlayersByCategory(categoryId: number) {
    return db.select().from(players).where(eq(players.categoryId, categoryId));
  }

  async getPlayerSelectionStats() {
    const stats = await db
      .select({ playerId: teamPlayers.playerId, count: db.sql`COUNT(*)::int` })
      .from(teamPlayers)
      .groupBy(teamPlayers.playerId);
    const totalTeams = (await db.select({ count: db.sql`COUNT(DISTINCT team_id)::int` }).from(teamPlayers))[0].count;
    return stats.map(s => ({
      playerId: s.playerId,
      count: s.count,
      percentage: Math.round((s.count / totalTeams) * 100)
    }));
  }

  async updatePlayerPoints(data: UpdatePlayerPoints) {
    const [player] = await db
      .update(players)
      .set({ runs: data.runs, wickets: data.wickets, performancePoints: data.points })
      .where(eq(players.id, data.id))
      .returning();
    return player;
  }

  // Teams
  async getTeamsWithPlayers() {
    const teamsList = await db.select().from(teams);
    const result = await Promise.all(
      teamsList.map(async t => {
        const playersInTeam = await this.getTeamPlayers(t.id);
        const totalPoints = await this.calculateTeamPoints(t.id);
        return { ...t, players: playersInTeam, totalPoints };
      })
    );
    return result;
  }

  async getUserTeam(userId: number) {
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    return team;
  }

  async getTeamPlayers(teamId: number) {
    return db
      .select({ ...players, isCaptain: teamPlayers.isCaptain, isViceCaptain: teamPlayers.isViceCaptain })
      .from(teamPlayers)
      .innerJoin(players, eq(teamPlayers.playerId, players.id))
      .where(eq(teamPlayers.teamId, teamId));
  }

  async calculateTeamPoints(teamId: number) {
    const plyrs = await this.getTeamPlayers(teamId);
    return plyrs.reduce((sum, p) => sum + (p.isCaptain ? p.performancePoints * 2 : p.isViceCaptain ? p.performancePoints * 1.5 : p.performancePoints), 0);
  }

  async getTeamRank(teamId: number) {
    const lb = await this.getLeaderboard();
    return lb.findIndex(e => e.teamId === teamId) + 1;
  }

  async createTeam(data: InsertTeam) {
    const [team] = await db.insert(teams).values(data).returning();
    return team;
  }

  async addPlayerToTeam(data: InsertTeamPlayer) {
    await db.insert(teamPlayers).values(data);
  }

  // Matches
  async getCurrentMatch() {
    const [m] = await db
      .select()
      .from(matches)
      .where(eq(matches.status, 'live'))
      .orderBy(desc(matches.createdAt))
      .limit(1);
    return m;
  }

  async createMatch(data: Partial<Match>) {
    const [m] = await db.insert(matches).values(data).returning();
    return m;
  }

  // Leaderboard
  async getLeaderboard() {
    const teamsWith = await this.getTeamsWithPlayers();
    return teamsWith
      .map(t => ({ teamId: t.id, teamName: t.name, totalPoints: t.totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }
}

export const storage = new DatabaseStorage();
