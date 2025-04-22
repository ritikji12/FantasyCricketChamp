import { db } from "./db";
import { eq, sql, and, desc, asc } from "drizzle-orm";
import { 
  users, teams, players, teamPlayers, playerCategories, contests, matches,
  type User, type InsertUser, type Player, type InsertPlayer,
  type Team, type InsertTeam, type TeamPlayer, type InsertTeamPlayer,
  type PlayerWithCategory, type TeamWithPlayers, type TeamRanking,
  type Contest, type InsertContest, type Match
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
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
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
  updatePlayerCreditPoints(id: number, credit: number): Promise<Player>; 
  updatePlayerSelectionPercent(id: number, percent: number): Promise<Player>;
  getPlayerSelectionStats(): Promise<any[]>;
  
  // Match operations
  getMatches(): Promise<Match[]>;
  getMatchById(id: number): Promise<Match | undefined>;
  createMatch(matchData: any): Promise<Match>;
  updateMatchStatus(id: number, status: string): Promise<Match>;
  
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

  // New method added
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(asc(users.username));
    return allUsers;
  }
  
  async deleteUser(id: number): Promise<void> {
    // First get user's teams
    const userTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.userId, id));
    
    // Delete team players for each team
    for (const team of userTeams) {
      await db
        .delete(teamPlayers)
        .where(eq(teamPlayers.teamId, team.id));
    }
    
    // Delete teams
    if (userTeams.length > 0) {
      await db
        .delete(teams)
        .where(eq(teams.userId, id));
    }
    
    // Delete user's session
    try {
      // This is a raw query as there's no direct drizzle method to delete from the session table
      await db.execute(sql`
        DELETE FROM "session"
        WHERE sess -> 'passport' -> 'user' = ${id.toString()}::jsonb
      `);
    } catch (error) {
      console.error("Error deleting user sessions:", error);
      // Continue with user deletion even if session deletion fails
    }
    
    // Finally delete the user
    await db
      .delete(users)
      .where(eq(users.id, id));
  }

  async getPlayerCategories(): Promise<typeof playerCategories.$inferSelect[]> {
    const result = await db.select().from(playerCategories);
    return result;
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

  // New method added
  async getPlayerSelectionStats(): Promise<any[]> {
    // Use sql template literal instead of db.sql function
    const result = await db.execute(
      sql`
        SELECT 
          p.id,
          p.name,
          p.category_id as "categoryId",
          pc.name as "categoryName",
          p.credit_points as "creditPoints",
          p.performance_points as "performancePoints",
          p.selection_percent as "selectionPercent",
          COUNT(tp.player_id) as "selectedCount"
        FROM players p
        LEFT JOIN player_categories pc ON p.category_id = pc.id
        LEFT JOIN team_players tp ON p.id = tp.player_id
        GROUP BY p.id, pc.name
        ORDER BY "selectedCount" DESC, p.name ASC
      `
    );
    
    return result.rows;
  }
  
  // Match operations
  async getMatches(): Promise<Match[]> {
    const allMatches = await db.select().from(matches).orderBy(desc(matches.createdAt));
    return allMatches;
  }
  
  async getMatchById(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }
  
  async createMatch(matchData: any): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(matchData).returning();
    return newMatch;
  }
  
  async updateMatchStatus(id: number, status: string): Promise<Match> {
    const [updatedMatch] = await db
      .update(matches)
      .set({ status })
      .where(eq(matches.id, id))
      .returning();
    
    return updatedMatch;
  }
  
  async updatePlayerCreditPoints(id: number, credit: number): Promise<Player> {
    const [updatedPlayer] = await db
      .update(players)
      .set({ creditPoints: credit })
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
    // Get the team
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    if (!team) return undefined;

    // Get team players
    const teamPlayersList = await db
      .select()
      .from(teamPlayers)
      .where(eq(teamPlayers.teamId, id));

    // Get player details for each team player
    const playerDetails = await Promise.all(
      teamPlayersList.map(async (tp) => {
        const [player] = await db
          .select()
          .from(players)
          .where(eq(players.id, tp.playerId));
        
        return {
          ...player,
          isCaptain: tp.isCaptain,
          isViceCaptain: tp.isViceCaptain
        };
      })
    );

    // Calculate total points
    const totalPoints = playerDetails.reduce((sum, player) => {
      // Captain gets 2x points, vice captain gets 1.5x points
      if (player.isCaptain) {
        return sum + (player.performancePoints || 0) * 2;
      } else if (player.isViceCaptain) {
        return sum + (player.performancePoints || 0) * 1.5;
      } else {
        return sum + (player.performancePoints || 0);
      }
    }, 0);

    return {
      team,
      players: playerDetails,
      totalPoints,
      rank: 0 // Will be calculated by the caller if needed
    };
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    const userTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.userId, userId))
      .orderBy(desc(teams.createdAt));
    
    return userTeams;
  }

  async getTeamByUserId(userId: number): Promise<TeamWithPlayers | undefined> {
    // Get the most recent team for this user
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.userId, userId))
      .orderBy(desc(teams.createdAt))
      .limit(1);
    
    if (!team) return undefined;
    
    // Get the team with players
    return this.getTeamWithPlayers(team.id);
  }

  async deleteTeamById(id: number): Promise<void> {
    // First delete team players
    await db
      .delete(teamPlayers)
      .where(eq(teamPlayers.teamId, id));
    
    // Then delete the team
    await db
      .delete(teams)
      .where(eq(teams.id, id));
  }

  async getTeamRankings(): Promise<TeamRanking[]> {
    // Get all teams with their players
    const allTeams = await db.select().from(teams);
    
    const teamsWithPoints = await Promise.all(
      allTeams.map(async (team) => {
        const teamWithPlayers = await this.getTeamWithPlayers(team.id);
        const [user] = await db.select().from(users).where(eq(users.id, team.userId));
        
        return {
          teamId: team.id,
          teamName: team.name,
          userId: team.userId,
          userName: user ? user.username : 'Unknown',
          totalPoints: teamWithPlayers ? teamWithPlayers.totalPoints : 0
        };
      })
    );
    
    // Sort by points (descending)
    teamsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Add rank
    const rankings = teamsWithPoints.map((team, index) => ({
      ...team,
      rank: index + 1
    }));
    
    return rankings;
  }

  async getAllTeamsWithPlayers(): Promise<TeamWithPlayers[]> {
    const allTeams = await db.select().from(teams);
    
    const teamsWithPlayers = await Promise.all(
      allTeams.map(async (team) => {
        const teamWithPlayers = await this.getTeamWithPlayers(team.id);
        return teamWithPlayers!;
      })
    );
    
    // Filter out undefined values
    const validTeams = teamsWithPlayers.filter(t => t !== undefined) as TeamWithPlayers[];
    
    // Sort by total points
    validTeams.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Add rank
    validTeams.forEach((team, index) => {
      team.rank = index + 1;
    });
    
    return validTeams;
  }

  async getTeamsByContestId(contestId: number): Promise<TeamWithPlayers[]> {
    const teamsInContest = await db
      .select()
      .from(teams)
      .where(eq(teams.contestId, contestId));
    
    const teamsWithPlayers = await Promise.all(
      teamsInContest.map(async (team) => {
        const teamWithPlayers = await this.getTeamWithPlayers(team.id);
        return teamWithPlayers!;
      })
    );
    
    // Filter out undefined values
    const validTeams = teamsWithPlayers.filter(t => t !== undefined) as TeamWithPlayers[];
    
    // Sort by total points
    validTeams.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Add rank
    validTeams.forEach((team, index) => {
      team.rank = index + 1;
    });
    
    return validTeams;
  }
}

export const storage = new DatabaseStorage();
