import { pgTable, text, integer, serial, boolean, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player categories
export const playerCategories = pgTable("player_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

// Players table
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull().references(() => playerCategories.id),
  selectionPoints: integer("selection_points").notNull().default(0),
  creditPoints: integer("credit_points").notNull().default(0),
  performancePoints: integer("performance_points").notNull().default(0),
  runs: integer("runs").default(0),
  wickets: integer("wickets").default(0),
});

// Add contest status column to matches
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  status: text("status").notNull().default("upcoming"), // upcoming, live, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// TeamPlayers junction table
export const teamPlayers = pgTable("team_players", {
  teamId: integer("team_id").notNull().references(() => teams.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  isCaptain: boolean("is_captain").default(false).notNull(),
  isViceCaptain: boolean("is_vice_captain").default(false).notNull(),
  creditPointsAtSelection: integer("credit_points_at_selection").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.teamId, t.playerId] }),
}));

// Match table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  status: text("status").notNull().default("live"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  isAdmin: true,
});

export const insertPlayerCategorySchema = createInsertSchema(playerCategories).pick({
  name: true,
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  name: true,
  categoryId: true,
  points: true,
  runs: true,
  wickets: true,
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  userId: true,
});

export const insertTeamPlayerSchema = createInsertSchema(teamPlayers).pick({
  teamId: true,
  playerId: true,
  isCaptain: true,
  isViceCaptain: true,
});

export const insertMatchSchema = createInsertSchema(matches).pick({
  team1: true,
  team2: true,
  status: true,
});

// Custom schemas
export const updatePlayerPointsSchema = z.object({
  id: z.number(),
  runs: z.number().optional(),
  wickets: z.number().optional(),
  points: z.number(),
});

export const createTeamWithPlayersSchema = z.object({
  teamName: z.string().min(3, "Team name must be at least 3 characters"),
  playerIds: z.array(z.number()),
  captainId: z.number(),
  viceCaptainId: z.number(),
  wicketkeeper: z.literal("None"),
  totalCredits: z.number().max(1000, "Total credits cannot exceed 1000 points"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export type PlayerCategory = typeof playerCategories.$inferSelect;
export type InsertPlayerCategory = z.infer<typeof insertPlayerCategorySchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type UpdatePlayerPoints = z.infer<typeof updatePlayerPointsSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamPlayer = typeof teamPlayers.$inferSelect;
export type InsertTeamPlayer = z.infer<typeof insertTeamPlayerSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type CreateTeamWithPlayers = z.infer<typeof createTeamWithPlayersSchema>;
