import { Request, Response, NextFunction } from 'express';
import { getDynamicDB, extractDbEnv } from './db';

// Extend the Request interface to include database environment info
export interface RequestWithDB extends Request {
  dbEnv?: string;
  dynamicDB?: ReturnType<typeof getDynamicDB>;
}

/**
 * Middleware to extract database environment from URL and attach dynamic database connection
 */
export const dbEnvironmentMiddleware = (req: RequestWithDB, res: Response, next: NextFunction) => {
  // Extract database environment from URL parameters, headers, or subdomain
  const dbEnv = extractDbEnv(req);
  
  if (dbEnv) {
    req.dbEnv = dbEnv;
    req.dynamicDB = getDynamicDB(dbEnv);
    
    // Add database environment info to response headers for debugging
    res.setHeader('X-Database-Environment', dbEnv);
    
    console.log(`Request using database environment: ${dbEnv}`);
  } else {
    // Use default database
    req.dynamicDB = getDynamicDB();
  }
  
  next();
};

/**
 * Helper function to get the appropriate database connection from request
 */
export const getRequestDB = (req: RequestWithDB) => {
  return req.dynamicDB || getDynamicDB();
};

/**
 * Middleware specifically for admin routes that allows database switching
 */
export const adminDbMiddleware = (req: RequestWithDB, res: Response, next: NextFunction) => {
  // Only allow database switching for super_admin users
  const currentUser = (req as any).currentUser;
  
  if (currentUser?.role === 'super_admin') {
    dbEnvironmentMiddleware(req, res, next);
  } else {
    // Regular users always use default database
    req.dynamicDB = getDynamicDB();
    next();
  }
};