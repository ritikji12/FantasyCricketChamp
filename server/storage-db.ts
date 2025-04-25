import { db, pool } from "./db";
import { 
  users, players, teams, teamPlayers, contests, sessions, playerPerformances,
  type User, type InsertUser,
  type Player, type InsertPlayer, type UpdatePlayer,
  type Team, type InsertTeam,
  type TeamPlayer, type InsertTeamPlayer,
  type Contest, type InsertContest, type UpdateContest,
  type PlayerPerformance, type InsertPlayerPerformance, type UpdatePlayerPerformance
} from "@shared/schema";
import { eq, and, count, sql, desc } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import expressSession from "express-session";

// Create a session store
const PostgresSessionStore = connectPgSimple(expressSession);

export interface IStorage {
  // User related
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Player related
  getPlayers(): Promise<Player[]>;
  getPlayersByType(type: string): Promise<Player[]>;
  getPlayerById(id: number): Promise<Player | undefined>;
  updatePlayer(id: number, data: UpdatePlayer): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayerSelectionPercentage(playerId: number): Promise<number>;

  // Team related
  getTeams(): Promise<Team[]>;
  getTeamById(id: number): Promise<Team | undefined>;
  getTeamsByUserId(userId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeamPoints(id: number): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  // Team Player related
  getTeamPlayers(teamId: number): Promise<TeamPlayer[]>;
  getTeamPlayersByIds(teamId: number, playerId: number): Promise<TeamPlayer | undefined>;
  createTeamPlayer(teamPlayer: InsertTeamPlayer): Promise<TeamPlayer>;

  // Contest related
  getContests(): Promise<Contest[]>;
  getContestById(id: number): Promise<Contest | undefined>;
  createContest(contest: InsertContest): Promise<Contest>;
  updateContest(id: number, data: UpdateContest): Promise<Contest | undefined>;
  deleteContest(id: number): Promise<boolean>;
  getTeamsByContestId(contestId: number): Promise<Team[]>;

  // Player performance related (per contest)
  getPlayerPerformance(playerId: number, contestId: number): Promise<PlayerPerformance | undefined>;
  getPlayerPerformancesByContest(contestId: number): Promise<PlayerPerformance[]>;
  createPlayerPerformance(performance: InsertPlayerPerformance): Promise<PlayerPerformance>;
  updatePlayerPerformance(playerId: number, contestId: number, data: UpdatePlayerPerformance): Promise<PlayerPerformance | undefined>;

  // Complex queries
  getTeamWithPlayers(teamId: number): Promise<{
    team: Team;
    players: Player[];
  } | undefined>;

  getLeaderboard(): Promise<{
    team: Team;
    user: User;
    numPlayers: number;
  }[]>;

  getContestLeaderboard(contestId: number): Promise<{
    team: Team;
    user: User;
    numPlayers: number;
  }[]>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
    });
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getPlayers(): Promise<Player[]> {
    return db.select().from(players);
  }

  async getPlayersByType(type: string): Promise<Player[]> {
    return db.select().from(players).where(eq(players.type, type));
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.id, id));
    return result[0];
  }

  async updatePlayer(id: number, data: UpdatePlayer): Promise<Player | undefined> {
    const result = await db.update(players)
      .set(data)
      .where(eq(players.id, id))
      .returning();

    if (result.length === 0) {
      return undefined;
    }

    // Update all teams containing this player to recalculate performance points
    const playerTeams = await db
      .select({ teamId: teamPlayers.teamId })
      .from(teamPlayers)
      .where(eq(teamPlayers.playerId, id));

    for (const { teamId } of playerTeams) {
      await this.updateTeamPoints(teamId);
    }

    return result[0];
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    // Check if player with same name exists
    const existing = await db.select().from(players).where(eq(players.name, player.name));
    if (existing.length > 0) {
      throw new Error(`Player with name ${player.name} already exists`);
    }
    const result = await db.insert(players).values(player).returning();
    return result[0];
  }

  async deletePlayer(id: number): Promise<boolean> {
    // Delete player from team_players first to maintain referential integrity
    await db.delete(teamPlayers).where(eq(teamPlayers.playerId, id));
    
    // Delete player performances
    await db.delete(playerPerformances).where(eq(playerPerformances.playerId, id));
    
    // Then delete the player
    const result = await db.delete(players).where(eq(players.id, id)).returning();
    return result.length > 0;
  }

  async getPlayerSelectionPercentage(playerId: number): Promise<number> {
    // Count total teams
    const totalTeamsResult = await db.select({ count: count() }).from(teams);
    const totalTeams = totalTeamsResult[0].count;

    if (totalTeams === 0) {
      return 0;
    }

    // Count teams with this player
    const teamsWithPlayerResult = await db.select({ count: count() })
      .from(teamPlayers)
      .where(eq(teamPlayers.playerId, playerId));

    const teamsWithPlayer = teamsWithPlayerResult[0].count;

    return (teamsWithPlayer / totalTeams) * 100;
  }

  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.userId, userId));
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const result = await db.insert(teams).values({
      ...insertTeam,
      totalPerformancePoints: 0,
      createdAt: new Date().toISOString(),
    }).returning();
    return result[0];
  }

  async updateTeamPoints(id: number): Promise<Team | undefined> {
    // Get team
    const team = await this.getTeamById(id);
    if (!team) return undefined;

    // If team is not associated with a contest, we can't calculate performance points
    if (!team.contestId) {
      const result = await db.update(teams)
        .set({ totalPerformancePoints: 0 })
        .where(eq(teams.id, id))
        .returning();

      return result[0];
    }

    // Get team players
    const teamPlayersList = await this.getTeamPlayers(id);

    if (teamPlayersList.length === 0) {
      return team;
    }

    // Calculate total performance points using contest-specific performance data
    let totalPerformancePoints = 0;

    for (const teamPlayer of teamPlayersList) {
      // Get player performance for this specific contest
      const playerPerformance = await this.getPlayerPerformance(teamPlayer.playerId, team.contestId);

      // If no performance data for this contest, skip this player
      if (!playerPerformance) continue;

      let points = playerPerformance.performancePoints;

      // Apply captain/vice-captain multipliers
      if (teamPlayer.isCaptain) {
        points *= 2;
      } else if (teamPlayer.isViceCaptain) {
        points *= 1.5;
      }

      totalPerformancePoints += points;
    }

    // Update team
    const result = await db.update(teams)
      .set({ totalPerformancePoints: Math.round(totalPerformancePoints) })
      .where(eq(teams.id, id))
      .returning();

    return result[0];
  }

  async deleteTeam(id: number): Promise<boolean> {
    // Delete team players first
    await db.delete(teamPlayers).where(eq(teamPlayers.teamId, id));

    // Then delete the team
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  async getTeamPlayers(teamId: number): Promise<TeamPlayer[]> {
    return db.select().from(teamPlayers).where(eq(teamPlayers.teamId, teamId));
  }

  async getTeamPlayersByIds(teamId: number, playerId: number): Promise<TeamPlayer | undefined> {
    const result = await db.select().from(teamPlayers).where(
      and(
        eq(teamPlayers.teamId, teamId),
        eq(teamPlayers.playerId, playerId)
      )
    );
    return result[0];
  }

  async createTeamPlayer(insertTeamPlayer: InsertTeamPlayer): Promise<TeamPlayer> {
    const result = await db.insert(teamPlayers).values(insertTeamPlayer).returning();
    return result[0];
  }

  async getContests(): Promise<Contest[]> {
    return db.select().from(contests);
  }

  async getContestById(id: number): Promise<Contest | undefined> {
    const result = await db.select().from(contests).where(eq(contests.id, id));
    return result[0];
  }

  async createContest(insertContest: InsertContest): Promise<Contest> {
    const now = new Date().toISOString();
    const result = await db.insert(contests).values({
      ...insertContest,
      createdAt: now,
      updatedAt: now
    }).returning();
    return result[0];
  }

  async updateContest(id: number, data: UpdateContest): Promise<Contest | undefined> {
    const result = await db.update(contests)
      .set(data)
      .where(eq(contests.id, id))
      .returning();

    return result[0];
  }

  async deleteContest(id: number): Promise<boolean> {
    // Update teams to remove contest reference
    await db.update(teams)
      .set({ contestId: null })
      .where(eq(teams.contestId, id));

    // Delete the contest
    const result = await db.delete(contests).where(eq(contests.id, id)).returning();
    return result.length > 0;
  }

  async getTeamsByContestId(contestId: number): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.contestId, contestId));
  }

  // Player Performance methods
  async getPlayerPerformance(playerId: number, contestId: number): Promise<PlayerPerformance | undefined> {
    const result = await db.select().from(playerPerformances).where(
      and(
        eq(playerPerformances.playerId, playerId),
        eq(playerPerformances.contestId, contestId)
      )
    );
    return result[0];
  }

  async getPlayerPerformancesByContest(contestId: number): Promise<PlayerPerformance[]> {
    return db.select().from(playerPerformances).where(eq(playerPerformances.contestId, contestId));
  }

  async createPlayerPerformance(performance: InsertPlayerPerformance): Promise<PlayerPerformance> {
    const now = new Date().toISOString();
    const result = await db.insert(playerPerformances).values({
      ...performance,
      performancePoints: performance.performancePoints || 0,
      runs: performance.runs || 0,
      boundaries: performance.boundaries || 0,
      sixes: performance.sixes || 0,
      dotBalls: performance.dotBalls || 0,
      wickets: performance.wickets || 0,
      updatedAt: now
    }).returning();

    // Update team points for all teams in this contest
    const contestTeams = await this.getTeamsByContestId(performance.contestId);
    for (const team of contestTeams) {
      await this.updateTeamPoints(team.id);
    }

    return result[0];
  }

  async updatePlayerPerformance(playerId: number, contestId: number, data: UpdatePlayerPerformance): Promise<PlayerPerformance | undefined> {
    // Check if there's an existing performance record
    const existingPerformance = await this.getPlayerPerformance(playerId, contestId);

    if (!existingPerformance) {
      // No existing record, create a new one
      return this.createPlayerPerformance({
        playerId,
        contestId,
        ...data
      });
    }

    // Update existing performance
    const now = new Date().toISOString();
    const result = await db.update(playerPerformances)
      .set({
        ...data,
        updatedAt: now
      })
      .where(
        and(
          eq(playerPerformances.playerId, playerId),
          eq(playerPerformances.contestId, contestId)
        )
      )
      .returning();

    if (result.length === 0) {
      return undefined;
    }

    // Update team points for all teams in this contest
    const contestTeams = await this.getTeamsByContestId(contestId);
    for (const team of contestTeams) {
      await this.updateTeamPoints(team.id);
    }

    return result[0];
  }

  async getTeamWithPlayers(teamId: number): Promise<{
    team: Team;
    players: Player[];
  } | undefined> {
    const team = await this.getTeamById(teamId);
    if (!team) return undefined;

    const teamPlayersList = await this.getTeamPlayers(teamId);
    const playerIds = teamPlayersList.map(tp => tp.playerId);

    let playersList: Player[] = [];

    if (playerIds.length > 0) {
      playersList = await db.select()
        .from(players)
        .where(sql`${players.id} IN (${playerIds})`);
    }

    return {
      team,
      players: playersList,
    };
  }

  async getLeaderboard(): Promise<{
    team: Team;
    user: User;
    numPlayers: number;
  }[]> {
    // Get all teams
    const allTeams = await db.select().from(teams);

    // Create the result array
    const result: {
      team: Team;
      user: User;
      numPlayers: number;
    }[] = [];

    // Process each team
    for (const team of allTeams) {
      const user = await this.getUserById(team.userId);
      if (!user) continue;

      const teamPlayersList = await this.getTeamPlayers(team.id);

      result.push({
        team,
        user,
        numPlayers: teamPlayersList.length,
      });
    }

    return result;
  }

  async getContestLeaderboard(contestId: number): Promise<{
    team: Team;
    user: User;
    numPlayers: number;
  }[]> {
    // Get teams for this contest
    const contestTeams = await this.getTeamsByContestId(contestId);

    // Create the result array
    const result: {
      team: Team;
      user: User;
      numPlayers: number;
    }[] = [];

    // Process each team
    for (const team of contestTeams) {
      const user = await this.getUserById(team.userId);
      if (!user) continue;

      const teamPlayersList = await this.getTeamPlayers(team.id);

      result.push({
        team,
        user,
        numPlayers: teamPlayersList.length,
      });
    }

    return result;
  }
}

export const storage = new DatabaseStorage();