import { pgTable, text, serial, integer, boolean, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Define the tool schema
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  parameters: jsonb("parameters"), // Store parameters as JSON
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Define the users schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Define schema for chat sessions
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  session_id: uuid("session_id").defaultRandom().notNull().unique(),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  last_active: timestamp("last_active").defaultNow().notNull(),
});

// Define schema for chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  session_id: integer("session_id").references(() => chatSessions.id).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  function_call: jsonb("function_call"),
  execution_time: integer("execution_time"),
});

// Define schema for function calls
export const functionCalls = pgTable("function_calls", {
  id: serial("id").primaryKey(),
  message_id: integer("message_id").references(() => messages.id).notNull(),
  tool_id: integer("tool_id").references(() => tools.id).notNull(),
  arguments: jsonb("arguments").notNull(),
  result: jsonb("result"),
  execution_time: integer("execution_time"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const userRelations = relations(users, ({ many }) => ({
  chatSessions: many(chatSessions),
}));

export const chatSessionRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.user_id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one, many }) => ({
  chatSession: one(chatSessions, {
    fields: [messages.session_id],
    references: [chatSessions.id],
  }),
  functionCalls: many(functionCalls),
}));

export const functionCallRelations = relations(functionCalls, ({ one }) => ({
  message: one(messages, {
    fields: [functionCalls.message_id],
    references: [messages.id],
  }),
  tool: one(tools, {
    fields: [functionCalls.tool_id],
    references: [tools.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertToolSchema = createInsertSchema(tools).pick({
  name: true,
  description: true,
  parameters: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  user_id: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  role: true,
  content: true,
  session_id: true,
  function_call: true,
  execution_time: true,
});

export const insertFunctionCallSchema = createInsertSchema(functionCalls).pick({
  message_id: true,
  tool_id: true,
  arguments: true,
  result: true,
  execution_time: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof tools.$inferSelect;

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertFunctionCall = z.infer<typeof insertFunctionCallSchema>;
export type FunctionCall = typeof functionCalls.$inferSelect;
