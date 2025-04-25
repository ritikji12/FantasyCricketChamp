import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  isAdmin: true,
}).partial({ isAdmin: true });

// Player schema
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // allrounder, batsman, bowler, wicketkeeper
  creditPoints: integer("credit_points").notNull(),
  performancePoints: integer("performance_points").default(0).notNull(),
  runs: integer("runs").default(0).notNull(),
  wickets: integer("wickets").default(0).notNull(),
  economy: real("economy").default(0).notNull(),
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  name: true,
  type: true,
  creditPoints: true,
});

export const updatePlayerSchema = createInsertSchema(players).pick({
  performancePoints: true,
  runs: true,
  wickets: true,
  economy: true,
});

// Team schema
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
  contestId: integer("contest_id"),
  totalCreditPoints: integer("total_credit_points").notNull(),
  totalPerformancePoints: integer("total_performance_points").default(0).notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  userId: true,
  contestId: true,
  totalCreditPoints: true,
}).partial({ contestId: true });

// Team Player schema (join table)
export const teamPlayers = pgTable("team_players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  playerId: integer("player_id").notNull(),
  isCaptain: boolean("is_captain").default(false).notNull(),
  isViceCaptain: boolean("is_vice_captain").default(false).notNull(),
});

export const insertTeamPlayerSchema = createInsertSchema(teamPlayers).pick({
  teamId: true,
  playerId: true,
  isCaptain: true,
  isViceCaptain: true,
});

// Contest schema
export const contests = pgTable("contests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("not_live"), // not_live, live, completed
  rules: text("rules"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertContestSchema = createInsertSchema(contests).pick({
  name: true,
  status: true,
  rules: true,
});

export const updateContestSchema = createInsertSchema(contests).pick({
  name: true,
  status: true,
  rules: true,
});

// Player performance schema (for contest-specific performance tracking)
export const playerPerformances = pgTable("player_performances", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  contestId: integer("contest_id").notNull(),
  performancePoints: integer("performance_points").default(0).notNull(),
  runs: integer("runs").default(0).notNull(),
  boundaries: integer("boundaries").default(0).notNull(),
  sixes: integer("sixes").default(0).notNull(),
  dotBalls: integer("dot_balls").default(0).notNull(),
  wickets: integer("wickets").default(0).notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPlayerPerformanceSchema = createInsertSchema(playerPerformances).pick({
  playerId: true,
  contestId: true,
  performancePoints: true,
  runs: true,
  boundaries: true,
  sixes: true,
  dotBalls: true,
  wickets: true,
}).partial({
  performancePoints: true,
  runs: true,
  boundaries: true,
  sixes: true,
  dotBalls: true,
  wickets: true,
});

export const updatePlayerPerformanceSchema = createInsertSchema(playerPerformances).pick({
  performancePoints: true,
  runs: true,
  boundaries: true,
  sixes: true,
  dotBalls: true,
  wickets: true,
});

// Session schema (for auth)
export const sessions = pgTable("sessions", {
  sid: text("sid").notNull().primaryKey(),
  sess: text("sess").notNull(),
  expire: text("expire").notNull(),
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type UpdatePlayer = z.infer<typeof updatePlayerSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamPlayer = typeof teamPlayers.$inferSelect;
export type InsertTeamPlayer = z.infer<typeof insertTeamPlayerSchema>;

export type Contest = typeof contests.$inferSelect;
export type InsertContest = z.infer<typeof insertContestSchema>;
export type UpdateContest = z.infer<typeof updateContestSchema>;

export type PlayerPerformance = typeof playerPerformances.$inferSelect;
export type InsertPlayerPerformance = z.infer<typeof insertPlayerPerformanceSchema>;
export type UpdatePlayerPerformance = z.infer<typeof updatePlayerPerformanceSchema>;
