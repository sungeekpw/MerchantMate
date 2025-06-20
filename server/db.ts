import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon with WebSocket constructor for serverless environments
neonConfig.webSocketConstructor = ws;

// Disable pipelining and fetch connection for better stability
neonConfig.pipelineConnect = false;
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with minimal settings for maximum stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Minimal pool size to avoid connection issues
  idleTimeoutMillis: 60000, // 1 minute
  connectionTimeoutMillis: 5000, // 5 seconds (reduced)
  maxUses: 1000, // Limit connection reuse
  allowExitOnIdle: true // Allow exit when idle
});

export const db = drizzle({ client: pool, schema });

// Enhanced graceful shutdown handling with timeout
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await Promise.race([
      pool.end(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    console.log('Database pool closed successfully');
  } catch (error) {
    console.log('Force closing database pool');
  }
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions to prevent hanging connections
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason);
  await gracefulShutdown('UNHANDLED_REJECTION');
});