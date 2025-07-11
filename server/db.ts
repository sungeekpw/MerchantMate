import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon with WebSocket constructor for serverless environments
neonConfig.webSocketConstructor = ws;

// Disable pipelining and fetch connection for better stability
neonConfig.pipelineConnect = false;
neonConfig.fetchConnectionCache = true;

// Determine which database URL to use based on environment or URL parameter
const getDatabaseUrl = (dbEnv?: string) => {
  // URL parameter takes precedence
  if (dbEnv === 'test') {
    return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  }
  if (dbEnv === 'dev' || dbEnv === 'development') {
    return process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  }
  if (dbEnv === 'prod' || dbEnv === 'production') {
    return process.env.DATABASE_URL;
  }
  
  // Fallback to NODE_ENV environment variable
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  }
  return process.env.DATABASE_URL; // Production
};

// Default database connection
const defaultDatabaseUrl = getDatabaseUrl();

if (!defaultDatabaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log(`Default database for ${process.env.NODE_ENV || 'production'} environment`);

// Create default pool with minimal settings for maximum stability
export const pool = new Pool({ 
  connectionString: defaultDatabaseUrl,
  max: 1, // Minimal pool size to avoid connection issues
  idleTimeoutMillis: 60000, // 1 minute
  connectionTimeoutMillis: 5000, // 5 seconds (reduced)
  maxUses: 1000, // Limit connection reuse
  allowExitOnIdle: true // Allow exit when idle
});

export const db = drizzle({ client: pool, schema });

// Dynamic database connection based on URL parameter
const connectionPools = new Map<string, Pool>();

export const getDynamicDB = (dbEnv?: string) => {
  if (!dbEnv) return db; // Return default connection
  
  // Check if we already have a connection pool for this environment
  if (connectionPools.has(dbEnv)) {
    return drizzle({ client: connectionPools.get(dbEnv)!, schema });
  }
  
  // Create new connection pool for this environment
  const envDatabaseUrl = getDatabaseUrl(dbEnv);
  if (!envDatabaseUrl) {
    console.warn(`No database URL found for environment: ${dbEnv}, using default`);
    return db;
  }
  
  const envPool = new Pool({
    connectionString: envDatabaseUrl,
    max: 1, // Minimal pool size
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 5000,
    maxUses: 1000,
    allowExitOnIdle: true
  });
  
  connectionPools.set(dbEnv, envPool);
  console.log(`Created new connection pool for environment: ${dbEnv}`);
  
  return drizzle({ client: envPool, schema });
};

// Middleware to extract database environment from URL
export const extractDbEnv = (req: any) => {
  // Check query parameter: ?db=test
  if (req.query?.db) {
    return req.query.db;
  }
  
  // Check custom header: X-Database-Env
  if (req.headers['x-database-env']) {
    return req.headers['x-database-env'];
  }
  
  // Check subdomain: test.yourapp.com
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (['test', 'dev', 'staging'].includes(subdomain)) {
    return subdomain;
  }
  
  return null;
};

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