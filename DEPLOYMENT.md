# Deployment Guide

## Database Schema Synchronization

To maintain consistent database schemas across all environments (production, test, development), we've implemented comprehensive synchronization scripts.

### Quick Commands

```bash
# Synchronize all database environments
tsx scripts/sync-database-schemas.ts all

# Synchronize specific environments
tsx scripts/sync-database-schemas.ts test
tsx scripts/sync-database-schemas.ts dev
tsx scripts/sync-database-schemas.ts production

# Run deployment readiness check
tsx scripts/deploy-ready-check.ts
```

### Pre-Deployment Checklist

Before deploying to production, always run:

```bash
# 1. Check deployment readiness
tsx scripts/deploy-ready-check.ts

# 2. Synchronize all database schemas
tsx scripts/sync-database-schemas.ts all

# 3. Run tests
npm test

# 4. Build application
npm run build
```

### Database Environment Variables

Ensure these environment variables are configured:

- `DATABASE_URL` - Production database connection
- `TEST_DATABASE_URL` - Test database connection  
- `DEV_DATABASE_URL` - Development database connection
- `SENDGRID_API_KEY` - Email service API key
- `SENDGRID_FROM_EMAIL` - Default sender email
- `SESSION_SECRET` - Session encryption key (optional, has fallback)

### Schema Synchronization Process

The synchronization scripts perform these operations:

1. **Backup Current Schema** - Creates timestamped schema backups
2. **Environment Validation** - Checks all database connections
3. **Schema Push** - Uses `drizzle-kit push` to synchronize schemas
4. **Consistency Check** - Validates schemas across environments
5. **Report Generation** - Provides detailed synchronization results

### Deployment Readiness Check

The deployment check script validates:

- ✅ Environment variable configuration
- ✅ Database connectivity for all environments
- ✅ Schema consistency across databases
- ✅ Application build process
- ✅ Test suite execution
- ✅ Security configuration

### Manual Database Operations

For manual database management:

```bash
# Push schema to current DATABASE_URL
drizzle-kit push

# Push to specific environment
DATABASE_URL="your-database-url" drizzle-kit push

# Generate migrations
drizzle-kit generate

# Open database studio
drizzle-kit studio
```

### Environment-Specific Database Access

The application supports multiple database environments for development and testing:

- **Production**: Always uses production database (DATABASE_URL) - environment switching disabled
- **Development**: Supports switching via `?db=test` or `?db=dev` URL parameters
- **Test**: Available in development builds only

**Security Feature**: In production deployments (`NODE_ENV=production`), database environment switching is completely disabled for security. All requests use the production database regardless of URL parameters.

The database environment indicator in the header shows which database is currently active:
- 🔵 DEV DB (Development builds only)
- 🟠 TEST DB (Development builds only)  
- Hidden in Production (for security)

### Troubleshooting

**Schema Sync Issues:**
1. Check database connectivity: `tsx scripts/deploy-ready-check.ts`
2. Verify environment variables are set correctly
3. Run manual schema push: `drizzle-kit push`
4. Check Drizzle configuration in `drizzle.config.ts`

**Deployment Failures:**
1. Run full deployment check: `tsx scripts/deploy-ready-check.ts`
2. Address any failing checks
3. Re-run synchronization: `tsx scripts/sync-database-schemas.ts all`
4. Verify all tests pass: `npm test`

**Database Connection Errors:**
1. Verify database URLs are correct and accessible
2. Check SSL configuration for production databases
3. Ensure database permissions allow schema modifications
4. Test connections individually per environment

### Best Practices

1. **Always run deployment checks before deploying**
2. **Synchronize schemas after any database structure changes**
3. **Test schema changes in development and test environments first**
4. **Keep schema backups for rollback capability**
5. **Monitor application logs after deployment**

### Security Considerations

- **Database Security**: Production deployments always use production database - environment switching disabled
- Database URLs should include SSL configuration for production
- Session secrets should be at least 32 characters long
- Email service credentials should be properly configured
- Environment variables should never be committed to version control
- **Testing Features**: Database environment switching and testing utilities are hidden in production builds

### Replit Deployment

For Replit deployment:

1. Ensure all environment variables are configured in Replit Secrets
2. Run the deployment readiness check
3. Use Replit's Deploy button after verification
4. Monitor deployment logs for any issues

The application is configured for zero-downtime deployments with proper health checks and graceful shutdown handling.