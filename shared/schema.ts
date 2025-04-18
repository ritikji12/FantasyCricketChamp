import { db } from "./db";
import { eq, sql, and, desc, asc } from "drizzle-orm";
import { 
  users, teams, players, teamPlayers, playerCategories, contests,
  type User, type InsertUser, type Player, type InsertPlayer,
  type Team, type InsertTeam, type TeamPlayer, type InsertTeamPlayer,
  type PlayerWithCategory, type TeamWithPlayers, type TeamRanking,
  type Contest, type InsertContest
} from "@shared/schema";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPlayerCategories(): Promise<typeof playerCategories.$inferSelect[]>;
  
  // Contest operations
  getContests(): Promise<Contest[]>;
  getContestById(id: number): Promise<Contest | undefined>;
  createContest(contest: InsertContest): Promise<Contest>;
  updateContest(id: number, data: Partial<InsertContest>): Promise<Contest>;
  deleteContest(id: number): Promise<void>;
  setContestLiveStatus(id: number, isLive: boolean): Promise<Contest>;
  
  // Player operations
  getPlayers(): Promise<PlayerWithCategory[]>;
  getPlayersByCategory(categoryId: number): Promise<PlayerWithCategory[]>;
  getPlayerById(id: number): Promise<Player | undefined>;
  updatePlayerPoints(id: number, points: number): Promise<Player>;
  updatePlayerSelectionPercent(id: number, percent: number): Promise<Player>;
  
  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  addPlayerToTeam(teamPlayer: InsertTeamPlayer): Promise<TeamPlayer>;
  getTeamById(id: number): Promise<Team | undefined>;
  getTeamWithPlayers(id: number): Promise<TeamWithPlayers | undefined>;
  getTeamsByUserId(userId: number): Promise<Team[]>;
  getTeamByUserId(userId: number): Promise<TeamWithPlayers | undefined>;
  deleteTeamById(id: number): Promise<void>;
  
  // Ranking operations
  getTeamRankings(): Promise<TeamRanking[]>;
  
  // Admin operations
  getAllTeamsWithPlayers(): Promise<TeamWithPlayers[]>;
  getTeamsByContestId(contestId: number): Promise<TeamWithPlayers[]>;
  
  // Session store
  sessionStore: Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getPlayerCategories() {
    return await db.select().from(playerCategories);
  }
  
  // Contest Operations
  async getContests(): Promise<Contest[]> {
    const result = await db.select().from(contests).orderBy(desc(contests.createdAt));
    return result;
  }
  
  async getContestById(id: number): Promise<Contest | undefined> {
    const [contest] = await db.select().from(contests).where(eq(contests.id, id));
    return contest;
  }
  
  async createContest(contest: InsertContest): Promise<Contest> {
    const [newContest] = await db.insert(contests).values(contest).returning();
    return newContest;
  }
  
  async updateContest(id: number, data: Partial<InsertContest>): Promise<Contest> {
    const [updatedContest] = await db
      .update(contests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contests.id, id))
      .returning();
    
    return updatedContest;
  }
  
  async deleteContest(id: number): Promise<void> {
    // First find all teams in this contest
    const teamsInContest = await db
      .select()
      .from(teams)
      .where(eq(teams.contestId, id));
    
    // Delete team players for each team
    for (const team of teamsInContest) {
      await db
        .delete(teamPlayers)
        .where(eq(teamPlayers.teamId, team.id));
    }
    
    // Delete teams
    await db
      .delete(teams)
      .where(eq(teams.contestId, id));
    
    // Delete contest
    await db
      .delete(contests)
      .where(eq(contests.id, id));
  }
  
  async setContestLiveStatus(id: number, isLive: boolean): Promise<Contest> {
    const [updatedContest] = await db
      .update(contests)
      .set({ isLive, updatedAt: new Date() })
      .where(eq(contests.id, id))
      .returning();
    
    return updatedContest;
  }

  async getPlayers(): Promise<PlayerWithCategory[]> {
    const result = await db
      .select({
        id: players.id,
        name: players.name,
        categoryId: players.categoryId,
        categoryName: playerCategories.name,
        creditPoints: players.creditPoints,
        performancePoints: players.performancePoints,
        selectionPercent: players.selectionPercent
      })
      .from(players)
      .innerJoin(playerCategories, eq(players.categoryId, playerCategories.id));
    
    return result;
  }

  async getPlayersByCategory(categoryId: number): Promise<PlayerWithCategory[]> {
    const result = await db
      .select({
        id: players.id,
        name: players.name,
        categoryId: players.categoryId,
        categoryName: playerCategories.name,
        creditPoints: players.creditPoints,
        performancePoints: players.performancePoints,
        selectionPercent: players.selectionPercent
      })
      .from(players)
      .innerJoin(playerCategories, eq(players.categoryId, playerCategories.id))
      .where(eq(players.categoryId, categoryId));
    
    return result;
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async updatePlayerPoints(id: number, points: number): Promise<Player> {
    // Update only the performance points
    const [updatedPlayer] = await db
      .update(players)
      .set({ performancePoints: points })
      .where(eq(players.id, id))
      .returning();
    
    return updatedPlayer;
  }
  
  async updatePlayerSelectionPercent(id: number, percent: number): Promise<Player> {
    const [updatedPlayer] = await db
      .update(players)
      .set({ selectionPercent: percent })
      .where(eq(players.id, id))
      .returning();
    
    return updatedPlayer;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async addPlayerToTeam(teamPlayer: InsertTeamPlayer): Promise<TeamPlayer> {
    const [newTeamPlayer] = await db.insert(teamPlayers).values(teamPlayer).returning();
    return newTeamPlayer;
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamWithPlayers(id: number): Promise<TeamWithPlayers | undefined> {
    const team = await this.getTeamById(id);
    if (!team) return undefined;

    // Get user info to include username
    const user = await this.getUser(team.userId);
    const username = user?.username || null;
    
    // Get contest info
    const contest = await this.getContestById(team.contestId);

    const playersInTeam = await db
      .select({
        id: players.id,
        name: players.name,
        categoryId: players.categoryId,
        categoryName: playerCategories.name,
        creditPoints: players.creditPoints,
        performancePoints: players.performancePoints,
        selectionPercent: players.selectionPercent,
        isCaptain: teamPlayers.isCaptain,
        isViceCaptain: teamPlayers.isViceCaptain
      })
      .from(teamPlayers)
      .innerJoin(players, eq(teamPlayers.playerId, players.id))
      .innerJoin(playerCategories, eq(players.categoryId, playerCategories.id))
      .where(eq(teamPlayers.teamId, id));

    // Calculate total points with captain (2x) and vice-captain (1.5x) multipliers
    const totalPoints = playersInTeam.reduce((sum, player) => {
      let playerPoints = player.performancePoints; // Use performance points for scoring
      
      // Apply multipliers for captain and vice-captain
      if (player.isCaptain) {
        playerPoints *= 2; // Captain gets 2x points
      } else if (player.isViceCaptain) {
        playerPoints *= 1.5; // Vice-Captain gets 1.5x points
      }
      
      return sum + playerPoints;
    }, 0);

    return {
      ...team,
      username,
      contestName: contest?.name,
      isLive: contest?.isLive,
      players: playersInTeam,
      totalPoints
    };
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    const userTeams = await db.select().from(teams).where(eq(teams.userId, userId));
    return userTeams;
  }

  async getTeamByUserId(userId: number): Promise<TeamWithPlayers | undefined> {
    const [userTeam] = await db.select().from(teams).where(eq(teams.userId, userId));
    if (!userTeam) return undefined;

    return this.getTeamWithPlayers(userTeam.id);
  }
  
  async deleteTeamById(id: number): Promise<void> {
    // First delete all team players
    await db
      .delete(teamPlayers)
      .where(eq(teamPlayers.teamId, id));
    
    // Then delete the team
    await db
      .delete(teams)
      .where(eq(teams.id, id));
  }
  
  async getTeamsByContestId(contestId: number): Promise<TeamWithPlayers[]> {
    const teamsInContest = await db
      .select({
        id: teams.id,
        name: teams.name,
        userId: teams.userId,
        contestId: teams.contestId,
        username: users.username
      })
      .from(teams)
      .leftJoin(users, eq(teams.userId, users.id))
      .where(eq(teams.contestId, contestId));
    
    // Get contest details
    const contest = await this.getContestById(contestId);
    
    const result = await Promise.all(
      teamsInContest.map(async (team) => {
        const playersInTeam = await db
          .select({
            id: players.id,
            name: players.name,
            categoryId: players.categoryId,
            categoryName: playerCategories.name,
            creditPoints: players.creditPoints,
            performancePoints: players.performancePoints,
            selectionPercent: players.selectionPercent,
            isCaptain: teamPlayers.isCaptain,
            isViceCaptain: teamPlayers.isViceCaptain
          })
          .from(teamPlayers)
          .innerJoin(players, eq(teamPlayers.playerId, players.id))
          .innerJoin(playerCategories, eq(players.categoryId, playerCategories.id))
          .where(eq(teamPlayers.teamId, team.id));

        // Calculate total points with captain (2x) and vice-captain (1.5x) multipliers
        const totalPoints = playersInTeam.reduce((sum, player) => {
          let playerPoints = player.performancePoints;
          
          // Apply multipliers for captain and vice-captain
          if (player.isCaptain) {
            playerPoints *= 2; // Captain gets 2x points
          } else if (player.isViceCaptain) {
            playerPoints *= 1.5; // Vice-Captain gets 1.5x points
          }
          
          return sum + playerPoints;
        }, 0);

        return {
          ...team,
          contestName: contest?.name,
          isLive: contest?.isLive,
          players: playersInTeam,
          totalPoints
        };
      })
    );
    
    return result;
  }

  async getTeamRankings(): Promise<TeamRanking[]> {
    // This is a complex query that needs a subquery to calculate total points
    const teamsWithPlayers = await this.getAllTeamsWithPlayers();
    
    // Sort by points and assign rank
    const sortedTeams = teamsWithPlayers
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((team, index) => ({
        id: team.id,
        name: team.name,
        userId: team.userId,
        username: team.username || 'Unknown',
        totalPoints: team.totalPoints,
        rank: index + 1
      }));
    
    return sortedTeams;
  }

  async getAllTeamsWithPlayers(): Promise<TeamWithPlayers[]> {
    const allTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        userId: teams.userId,
        contestId: teams.contestId,
        username: users.username
      })
      .from(teams)
      .leftJoin(users, eq(teams.userId, users.id));

    // Map to collect contests data efficiently
    const contestIds = new Set<number>();
    allTeams.forEach(team => contestIds.add(team.contestId));
    
    // Fetch contests data
    const contestsData = await Promise.all(
      Array.from(contestIds).map(id => this.getContestById(id))
    );
    
    // Create a lookup map for contest data
    const contestsMap = new Map<number, Contest>();
    contestsData.forEach(contest => {
      if (contest) {
        contestsMap.set(contest.id, contest);
      }
    });

    const result = await Promise.all(
      allTeams.map(async (team) => {
        const playersInTeam = await db
          .select({
            id: players.id,
            name: players.name,
            categoryId: players.categoryId,
            categoryName: playerCategories.name,
            creditPoints: players.creditPoints,
            performancePoints: players.performancePoints,
            selectionPercent: players.selectionPercent,
            isCaptain: teamPlayers.isCaptain,
            isViceCaptain: teamPlayers.isViceCaptain
          })
          .from(teamPlayers)
          .innerJoin(players, eq(teamPlayers.playerId, players.id))
          .innerJoin(playerCategories, eq(players.categoryId, playerCategories.id))
          .where(eq(teamPlayers.teamId, team.id));

        // Calculate total points with captain (2x) and vice-captain (1.5x) multipliers
        const totalPoints = playersInTeam.reduce((sum, player) => {
          let playerPoints = player.performancePoints;
          
          // Apply multipliers for captain and vice-captain
          if (player.isCaptain) {
            playerPoints *= 2; // Captain gets 2x points
          } else if (player.isViceCaptain) {
            playerPoints *= 1.5; // Vice-Captain gets 1.5x points
          }
          
          return sum + playerPoints;
        }, 0);
        
        // Get contest info
        const contest = contestsMap.get(team.contestId);

        return {
          ...team,
          contestName: contest?.name,
          isLive: contest?.isLive,
          players: playersInTeam,
          totalPoints
        };
      })
    );

    return result;
  }
}

export const storage = new DatabaseStorage();
