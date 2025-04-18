import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  isAdmin: true,
});

// Player Categories
export const playerCategories = pgTable("player_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});
export type PlayerCategory = typeof playerCategories.$inferSelect;
export type InsertPlayerCategory = z.infer<typeof insertPlayerCategorySchema>;
export const insertPlayerCategorySchema = createInsertSchema(playerCategories).pick({ name: true });

// Players Table
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  creditPoints: integer("credit_points").default(0).notNull(),
  performancePoints: integer("performance_points").default(0).notNull(),
  runs: integer("runs").default(0),
  wickets: integer("wickets").default(0),
});
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export const insertPlayerSchema = createInsertSchema(players).pick({
  name: true,
  categoryId: true,
  creditPoints: true,
  performancePoints: true,
  runs: true,
  wickets: true,
});

// Teams Table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export const insertTeamSchema = createInsertSchema(teams).pick({ name: true, userId: true });

// Team Players Junction
export const teamPlayers = pgTable("team_players", {
  teamId: integer("team_id").notNull(),
  playerId: integer("player_id").notNull(),
  isCaptain: boolean("is_captain").default(false).notNull(),
  isViceCaptain: boolean("is_vice_captain").default(false).notNull(),
  creditPointsAtSelection: integer("credit_points_at_selection").default(0).notNull(),
});
export type TeamPlayer = typeof teamPlayers.$inferSelect;
export type InsertTeamPlayer = z.infer<typeof insertTeamPlayerSchema>;
export const insertTeamPlayerSchema = createInsertSchema(teamPlayers).pick({
  teamId: true,
  playerId: true,
  isCaptain: true,
  isViceCaptain: true,
});

// Matches Table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  status: text("status").default("live").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Match = typeof matches.$inferSelect;

// Extended Types
export const playerWithCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  categoryId: z.number(),
  categoryName: z.string(),
  creditPoints: z.number(),
  performancePoints: z.number(),
  runs: z.number().optional(),
  wickets: z.number().optional(),
  isCaptain: z.boolean().optional(),
  isViceCaptain: z.boolean().optional(),
});
export type PlayerWithCategory = z.infer<typeof playerWithCategorySchema>;

export const teamWithPlayersSchema = z.object({
  id: z.number(),
  name: z.string(),
  userId: z.number(),
  username: z.string().nullable(),
  createdAt: z.date().optional(),
  players: z.array(playerWithCategorySchema),
  totalPoints: z.number(),
});
export type TeamWithPlayers = z.infer<typeof teamWithPlayersSchema>;

export const teamRankingSchema = z.object({
  teamId: z.number(),
  teamName: z.string(),
  totalPoints: z.number(),
});
export type TeamRanking = z.infer<typeof teamRankingSchema>;

// Zod validation for requests
export const updatePlayerPointsSchema = z.object({
  id: z.number(),
  runs: z.number().optional(),
  wickets: z.number().optional(),
  points: z.number(),
});

export const createTeamWithPlayersSchema = z.object({
  teamName: z.string().min(3),
  playerIds: z.array(z.number()),
  captainId: z.number(),
  viceCaptainId: z.number(),
  totalCredits: z.number().max(1000),
});
