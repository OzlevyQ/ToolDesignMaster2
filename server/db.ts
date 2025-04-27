
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Use connection pooling with pooler URL
const poolConfig = {
  connectionString: process.env.DATABASE_URL.replace('.us-east-2', '-pooler.us-east-2'),
  max: 10,
  ssl: true,
  wsProxy: true
};

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
