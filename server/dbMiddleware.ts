import { Request, Response, NextFunction } from 'express';
import { getDynamicDatabase, extractDbEnv } from './db';

// Extend the Request interface to include database environment info
export interface RequestWithDB extends Request {
  dbEnv?: string;
  dynamicDB?: ReturnType<typeof getDynamicDatabase>;
}

/**
 * Middleware to extract database environment from URL and attach dynamic database connection
 */
export const dbEnvironmentMiddleware = (req: RequestWithDB, res: Response, next: NextFunction) => {
  // Check if we're in a production deployment environment (Replit production domain)
  const isProductionDomain = req.get('host')?.includes('.replit.app') || 
                            req.get('host')?.includes('charrg.com') ||
                            process.env.NODE_ENV === 'production';
  
  if (isProductionDomain) {
    // Force production database for production deployments
    req.dbEnv = 'production';
    req.dynamicDB = getDynamicDatabase('production');
    res.setHeader('X-Database-Environment', 'production');
    console.log('Production deployment: forcing production database');
    next();
    return;
  }
  
  // Force production database for all requests to show seeded data
  req.dbEnv = 'production';
  req.dynamicDB = getDynamicDatabase('production');
  res.setHeader('X-Database-Environment', 'production');
  console.log('Forcing production database for all requests');
  
  next();
};

/**
 * Helper function to get the appropriate database connection from request
 */
export const getRequestDB = (req: RequestWithDB) => {
  return req.dynamicDB || getDynamicDatabase();
};

/**
 * Middleware specifically for admin routes that allows database switching
 */
export const adminDbMiddleware = (req: RequestWithDB, res: Response, next: NextFunction) => {
  // Force production database for all admin routes
  req.dbEnv = 'production';
  req.dynamicDB = getDynamicDatabase('production');
  res.setHeader('X-Database-Environment', 'production');
  console.log('Admin middleware: forcing production database');
  next();
};