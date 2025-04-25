import {
  users, User, InsertUser,
  players, Player, InsertPlayer, UpdatePlayer,
  teams, Team, InsertTeam,
  teamPlayers, TeamPlayer, InsertTeamPlayer,
  contests, Contest, InsertContest, UpdateContest,
  playerPerformances, PlayerPerformance, InsertPlayerPerformance, UpdatePlayerPerformance
} from "@shared/schema";

export interface IStorage {
  // User related
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
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
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private playersMap: Map<number, Player>;
  private teamsMap: Map<number, Team>;
  private teamPlayersMap: Map<number, TeamPlayer>;
  private contestsMap: Map<number, Contest>;
  private playerPerformancesMap: Map<string, PlayerPerformance>; // key: `${playerId}-${contestId}`
  private userId: number;
  private playerId: number;
  private teamId: number;
  private teamPlayerId: number;
  private contestId: number;
  private performanceId: number;

  constructor() {
    this.usersMap = new Map();
    this.playersMap = new Map();
    this.teamsMap = new Map();
    this.teamPlayersMap = new Map();
    this.contestsMap = new Map();
    this.playerPerformancesMap = new Map();
    this.userId = 1;
    this.playerId = 1;
    this.teamId = 1;
    this.teamPlayerId = 1;
    this.contestId = 1;
    this.performanceId = 1;
    
    // Add initial admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$kPqr1vS8sGR3qupMVz9xDeExPxmNb9CoXz.APu.PEt/ZJuZCPDK3i", // password: admin123
      name: "Admin User"
    }).then(user => {
      // Set admin privileges
      const adminUser = { ...user, isAdmin: true };
      this.usersMap.set(user.id, adminUser);
    });
    
    // Initialize players with data
    this.initializePlayers();
  }
  
  private async initializePlayers() {
    // All Rounders
    await this.createPlayer({ name: "Ankur", type: "allrounder", creditPoints: 200 });
    await this.createPlayer({ name: "Prince", type: "allrounder", creditPoints: 150 });
    await this.createPlayer({ name: "Mayank", type: "allrounder", creditPoints: 140 });
    await this.createPlayer({ name: "Amit", type: "allrounder", creditPoints: 150 });
    
    // Batsmen
    await this.createPlayer({ name: "Kuki", type: "batsman", creditPoints: 160 });
    await this.createPlayer({ name: "Captain", type: "batsman", creditPoints: 90 });
    await this.createPlayer({ name: "Chintu", type: "batsman", creditPoints: 110 });
    await this.createPlayer({ name: "Paras Kumar", type: "batsman", creditPoints: 90 });
    await this.createPlayer({ name: "Pushkar", type: "batsman", creditPoints: 100 });
    await this.createPlayer({ name: "Dhilu", type: "batsman", creditPoints: 55 });
    await this.createPlayer({ name: "Kamal", type: "batsman", creditPoints: 110 });
    await this.createPlayer({ name: "Ajay", type: "batsman", creditPoints: 35 });
    
    // Bowlers
    await this.createPlayer({ name: "Pulkit", type: "bowler", creditPoints: 55 });
    await this.createPlayer({ name: "Nitish", type: "bowler", creditPoints: 110 });
    await this.createPlayer({ name: "Rahul", type: "bowler", creditPoints: 110 });
    await this.createPlayer({ name: "Karambeer", type: "bowler", creditPoints: 95 });
    await this.createPlayer({ name: "Manga", type: "bowler", creditPoints: 90 });
    
    // Wicketkeeper
    await this.createPlayer({ name: "None", type: "wicketkeeper", creditPoints: 0 });
  }

  // User Methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id, isAdmin: false };
    this.usersMap.set(id, user);
    return user;
  }

  // Player Methods
  async getPlayers(): Promise<Player[]> {
    return Array.from(this.playersMap.values());
  }

  async getPlayersByType(type: string): Promise<Player[]> {
    return Array.from(this.playersMap.values()).filter(
      (player) => player.type === type
    );
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    return this.playersMap.get(id);
  }

  async updatePlayer(id: number, data: UpdatePlayer): Promise<Player | undefined> {
    const player = this.playersMap.get(id);
    if (!player) return undefined;
    
    // Only update performance-related stats, not credit points
    const updatedPlayer = { 
      ...player, 
      performancePoints: data.performancePoints ?? player.performancePoints,
      runs: data.runs ?? player.runs,
      wickets: data.wickets ?? player.wickets,
      economy: data.economy ?? player.economy 
    };
    
    this.playersMap.set(id, updatedPlayer);
    
    // Update points in teams containing this player
    for (const team of this.teamsMap.values()) {
      this.updateTeamPoints(team.id);
    }
    
    return updatedPlayer;
  }
  
  async getPlayerSelectionPercentage(playerId: number): Promise<number> {
    const totalTeams = this.teamsMap.size;
    if (totalTeams === 0) return 0;
    
    // Count how many teams have this player
    let teamsWithPlayer = 0;
    const teamPlayers = Array.from(this.teamPlayersMap.values());
    
    for (const team of this.teamsMap.values()) {
      const hasPlayer = teamPlayers.some(tp => tp.teamId === team.id && tp.playerId === playerId);
      if (hasPlayer) {
        teamsWithPlayer++;
      }
    }
    
    // Calculate percentage
    return Math.round((teamsWithPlayer / totalTeams) * 100);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerId++;
    const player: Player = { 
      ...insertPlayer, 
      id, 
      performancePoints: 0,
      runs: 0,
      wickets: 0,
      economy: 0
    };
    this.playersMap.set(id, player);
    return player;
  }

  // Team Methods
  async getTeams(): Promise<Team[]> {
    return Array.from(this.teamsMap.values());
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    return this.teamsMap.get(id);
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    return Array.from(this.teamsMap.values()).filter(
      (team) => team.userId === userId
    );
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.teamId++;
    const team: Team = { 
      ...insertTeam, 
      id, 
      contestId: insertTeam.contestId || null,
      totalPerformancePoints: 0,
      createdAt: new Date().toISOString()
    };
    this.teamsMap.set(id, team);
    return team;
  }

  async updateTeamPoints(id: number): Promise<Team | undefined> {
    const team = this.teamsMap.get(id);
    if (!team) return undefined;

    const teamPlayers = Array.from(this.teamPlayersMap.values())
      .filter(tp => tp.teamId === id);
    
    let totalPerformancePoints = 0;
    
    // If the team is not associated with a contest, we can't calculate points
    if (!team.contestId) {
      const updatedTeam = { ...team, totalPerformancePoints: 0 };
      this.teamsMap.set(id, updatedTeam);
      return updatedTeam;
    }
    
    const contestId = team.contestId;
    
    for (const teamPlayer of teamPlayers) {
      // Get player performance specifically for this contest
      const playerPerformance = await this.getPlayerPerformance(teamPlayer.playerId, contestId);
      
      if (playerPerformance) {
        // Apply multipliers for captain (2x) and vice-captain (1.5x)
        if (teamPlayer.isCaptain) {
          totalPerformancePoints += playerPerformance.performancePoints * 2;  // 2x for captain
        } else if (teamPlayer.isViceCaptain) {
          totalPerformancePoints += playerPerformance.performancePoints * 1.5; // 1.5x for vice-captain
        } else {
          totalPerformancePoints += playerPerformance.performancePoints;
        }
      }
    }
    
    const updatedTeam = { ...team, totalPerformancePoints: Math.round(totalPerformancePoints) };
    this.teamsMap.set(id, updatedTeam);
    
    return updatedTeam;
  }
  
  async deleteTeam(id: number): Promise<boolean> {
    // First check if the team exists
    const team = this.teamsMap.get(id);
    if (!team) return false;
    
    // Delete all team players associated with this team
    const teamPlayers = Array.from(this.teamPlayersMap.values())
      .filter(tp => tp.teamId === id);
      
    for (const tp of teamPlayers) {
      this.teamPlayersMap.delete(tp.id);
    }
    
    // Finally delete the team
    this.teamsMap.delete(id);
    return true;
  }

  // Team Player Methods
  async getTeamPlayers(teamId: number): Promise<TeamPlayer[]> {
    return Array.from(this.teamPlayersMap.values()).filter(
      (tp) => tp.teamId === teamId
    );
  }

  async getTeamPlayersByIds(teamId: number, playerId: number): Promise<TeamPlayer | undefined> {
    return Array.from(this.teamPlayersMap.values()).find(
      (tp) => tp.teamId === teamId && tp.playerId === playerId
    );
  }

  async createTeamPlayer(insertTeamPlayer: InsertTeamPlayer): Promise<TeamPlayer> {
    const id = this.teamPlayerId++;
    // Ensure isCaptain and isViceCaptain have default values
    const teamPlayer: TeamPlayer = { 
      ...insertTeamPlayer, 
      id,
      isCaptain: insertTeamPlayer.isCaptain || false,
      isViceCaptain: insertTeamPlayer.isViceCaptain || false
    };
    this.teamPlayersMap.set(id, teamPlayer);
    return teamPlayer;
  }

  // Complex queries
  async getTeamWithPlayers(teamId: number): Promise<{
    team: Team;
    players: Player[];
  } | undefined> {
    const team = await this.getTeamById(teamId);
    if (!team) return undefined;

    const teamPlayers = await this.getTeamPlayers(teamId);
    const playerIds = teamPlayers.map(tp => tp.playerId);
    
    const players: Player[] = [];
    for (const playerId of playerIds) {
      const player = await this.getPlayerById(playerId);
      if (player) players.push(player);
    }

    return { team, players };
  }

  // Contest Methods
  async getContests(): Promise<Contest[]> {
    return Array.from(this.contestsMap.values());
  }

  async getContestById(id: number): Promise<Contest | undefined> {
    return this.contestsMap.get(id);
  }

  async createContest(insertContest: InsertContest): Promise<Contest> {
    const id = this.contestId++;
    const now = new Date().toISOString();
    const contest: Contest = {
      ...insertContest,
      id,
      status: insertContest.status || "not_live",
      rules: insertContest.rules || null,
      createdAt: now,
      updatedAt: now
    };
    this.contestsMap.set(id, contest);
    return contest;
  }

  async updateContest(id: number, data: UpdateContest): Promise<Contest | undefined> {
    const contest = this.contestsMap.get(id);
    if (!contest) return undefined;
    
    const updatedContest: Contest = {
      ...contest,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.contestsMap.set(id, updatedContest);
    return updatedContest;
  }

  async deleteContest(id: number): Promise<boolean> {
    if (!this.contestsMap.has(id)) return false;
    this.contestsMap.delete(id);
    return true;
  }

  async getTeamsByContestId(contestId: number): Promise<Team[]> {
    return Array.from(this.teamsMap.values()).filter(
      (team) => team.contestId === contestId
    );
  }
  
  // Player Performance methods
  async getPlayerPerformance(playerId: number, contestId: number): Promise<PlayerPerformance | undefined> {
    const key = `${playerId}-${contestId}`;
    return this.playerPerformancesMap.get(key);
  }
  
  async getPlayerPerformancesByContest(contestId: number): Promise<PlayerPerformance[]> {
    return Array.from(this.playerPerformancesMap.values()).filter(
      (perf) => perf.contestId === contestId
    );
  }
  
  async createPlayerPerformance(performance: InsertPlayerPerformance): Promise<PlayerPerformance> {
    const id = this.performanceId++;
    const now = new Date().toISOString();
    const playerPerformance: PlayerPerformance = {
      ...performance,
      id,
      performancePoints: performance.performancePoints || 0,
      runs: performance.runs || 0,
      boundaries: performance.boundaries || 0,
      sixes: performance.sixes || 0,
      dotBalls: performance.dotBalls || 0,
      wickets: performance.wickets || 0,
      updatedAt: now
    };
    
    const key = `${playerPerformance.playerId}-${playerPerformance.contestId}`;
    this.playerPerformancesMap.set(key, playerPerformance);
    
    // Now we need to update the player's global stats with these performance stats
    const player = this.playersMap.get(playerPerformance.playerId);
    if (player) {
      const updatedPlayer = {
        ...player,
        performancePoints: playerPerformance.performancePoints
      };
      this.playersMap.set(player.id, updatedPlayer);
      
      // Update team points
      for (const team of this.teamsMap.values()) {
        if (team.contestId === playerPerformance.contestId) {
          this.updateTeamPoints(team.id);
        }
      }
    }
    
    return playerPerformance;
  }
  
  async updatePlayerPerformance(playerId: number, contestId: number, data: UpdatePlayerPerformance): Promise<PlayerPerformance | undefined> {
    const key = `${playerId}-${contestId}`;
    const performance = this.playerPerformancesMap.get(key);
    
    if (!performance) {
      // If no performance record exists yet, create one
      return this.createPlayerPerformance({
        playerId,
        contestId,
        ...data
      });
    }
    
    // Update the existing performance record
    const updatedPerformance: PlayerPerformance = {
      ...performance,
      performancePoints: data.performancePoints ?? performance.performancePoints,
      runs: data.runs ?? performance.runs,
      boundaries: data.boundaries ?? performance.boundaries,
      sixes: data.sixes ?? performance.sixes,
      dotBalls: data.dotBalls ?? performance.dotBalls,
      wickets: data.wickets ?? performance.wickets,
      updatedAt: new Date().toISOString()
    };
    
    this.playerPerformancesMap.set(key, updatedPerformance);
    
    // Update the player's global stats
    const player = this.playersMap.get(playerId);
    if (player) {
      const updatedPlayer = {
        ...player,
        performancePoints: updatedPerformance.performancePoints
      };
      this.playersMap.set(playerId, updatedPlayer);
      
      // Update team points
      for (const team of this.teamsMap.values()) {
        if (team.contestId === contestId) {
          this.updateTeamPoints(team.id);
        }
      }
    }
    
    return updatedPerformance;
  }

  async getContestLeaderboard(contestId: number): Promise<{
    team: Team;
    user: User;
    numPlayers: number;
  }[]> {
    const result: {
      team: Team;
      user: User;
      numPlayers: number;
    }[] = [];

    // Get only teams from this contest
    const teams = await this.getTeamsByContestId(contestId);
    
    for (const team of teams) {
      const user = await this.getUserById(team.userId);
      if (!user) continue;

      const teamPlayers = await this.getTeamPlayers(team.id);
      
      result.push({
        team,
        user,
        numPlayers: teamPlayers.length
      });
    }

    // Sort by performance points in descending order
    return result.sort((a, b) => 
      b.team.totalPerformancePoints - a.team.totalPerformancePoints
    );
  }

  async getLeaderboard(): Promise<{
    team: Team;
    user: User;
    numPlayers: number;
  }[]> {
    const result: {
      team: Team;
      user: User;
      numPlayers: number;
    }[] = [];

    for (const team of this.teamsMap.values()) {
      const user = await this.getUserById(team.userId);
      if (!user) continue;

      const teamPlayers = await this.getTeamPlayers(team.id);
      
      result.push({
        team,
        user,
        numPlayers: teamPlayers.length
      });
    }

    // Sort by performance points in descending order
    return result.sort((a, b) => 
      b.team.totalPerformancePoints - a.team.totalPerformancePoints
    );
  }
}

// Use database storage instead of memory storage
import { storage as dbStorage } from './storage-db';
export const storage = dbStorage;
