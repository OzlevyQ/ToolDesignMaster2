import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { formatToolsForClient } from "@shared/tools";
import { ToolExecutor } from "./tools";
import { MCPServer } from "./mcp";
import { db } from "./db";
import { tools as toolsTable } from "@shared/schema";

// Validation schemas
const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.string()).optional()
  })).optional().or(z.undefined())
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize MCP server and tool executor
  const toolExecutor = new ToolExecutor();
  const mcpServer = new MCPServer(toolExecutor);

  // Get available tools from database
  app.get("/api/tools", async (_req: Request, res: Response) => {
    try {
      const dbTools = await db.select().from(toolsTable);

      // Convert DB tools to the format expected by the client
      const tools = dbTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ? (tool.parameters as Record<string, any>) : undefined
      }));

      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = chatRequestSchema.parse(req.body);
      
      // Process the message using Gemini API with function calling
      const result = await mcpServer.processMessage(validatedData.message);
      
      res.json(result);
    } catch (error) {
      console.error("Error processing chat message:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  return httpServer;
}
