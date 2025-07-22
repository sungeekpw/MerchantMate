# Database Management Scripts

This directory contains scripts for managing database schemas and deployment readiness across multiple environments.

## Available Scripts

### 1. sync-database-schemas.ts

Synchronizes database schemas across all environments (production, test, development).

**Usage:**
```bash
# Sync all environments
tsx scripts/sync-database-schemas.ts all

# Sync specific environment
tsx scripts/sync-database-schemas.ts test
tsx scripts/sync-database-schemas.ts dev  
tsx scripts/sync-database-schemas.ts production
```

**Features:**
- Automatic schema backup creation
- Environment-specific database connections
- Schema consistency validation
- Detailed reporting and error handling
- Graceful failure handling

### 2. deploy-ready-check.ts

Comprehensive deployment readiness validation.

**Usage:**
```bash
tsx scripts/deploy-ready-check.ts
```

**Checks Performed:**
- Environment variable configuration
- Database connectivity for all environments
- Schema consistency across databases
- Application build process
- Test suite execution
- Security configuration

**Exit Codes:**
- `0` - All checks passed, ready for deployment
- `1` - Some checks failed, deployment not recommended

## Integration with Package.json

To use these scripts, add the following to your package.json scripts section:

```json
{
  "scripts": {
    "db:sync-all": "tsx scripts/sync-database-schemas.ts all",
    "db:sync-test": "tsx scripts/sync-database-schemas.ts test",
    "db:sync-dev": "tsx scripts/sync-database-schemas.ts dev",
    "db:sync-production": "tsx scripts/sync-database-schemas.ts production",
    "deploy:check": "tsx scripts/deploy-ready-check.ts"
  }
}
```

## Environment Variables Required

The scripts require these environment variables:

### Database Connections
- `DATABASE_URL` - Production database
- `TEST_DATABASE_URL` - Test database
- `DEV_DATABASE_URL` - Development database

### Application Configuration
- `SENDGRID_API_KEY` - Email service
- `SENDGRID_FROM_EMAIL` - Default sender
- `SESSION_SECRET` - Session encryption (optional)

## Workflow Integration

### Pre-Deployment Workflow
1. Run `tsx scripts/deploy-ready-check.ts`
2. Fix any failing checks
3. Run `tsx scripts/sync-database-schemas.ts all`
4. Verify all tests pass
5. Deploy application

### Development Workflow
1. Make schema changes in `shared/schema.ts`
2. Run `tsx scripts/sync-database-schemas.ts dev`
3. Test changes in development
4. Run `tsx scripts/sync-database-schemas.ts test`
5. Run tests against test database
6. Prepare for production deployment

### CI/CD Integration

For automated deployments, integrate these scripts:

```yaml
# Example GitHub Actions workflow
- name: Check deployment readiness
  run: tsx scripts/deploy-ready-check.ts

- name: Sync database schemas
  run: tsx scripts/sync-database-schemas.ts all
  
- name: Deploy application
  run: npm run build && deploy
```

## Error Handling

The scripts include comprehensive error handling:

- **Connection Failures**: Graceful handling of database connection issues
- **Schema Conflicts**: Detection and reporting of schema inconsistencies
- **Build Errors**: Identification of application build problems
- **Test Failures**: Reporting of failing test cases

## Logging and Monitoring

All scripts provide detailed logging:

- ✅ Success indicators for passed checks
- ❌ Error indicators for failed operations
- 📊 Summary reports with statistics
- 🔍 Detailed error messages for troubleshooting

## Security

- Database credentials are never logged or exposed
- Connections use secure SSL when configured
- Session secrets are validated for adequate length
- Environment variables are checked for completeness

## Troubleshooting

### Common Issues

**"Environment variable missing"**
- Check your `.env` file configuration
- Verify environment variables in Replit Secrets

**"Database connection failed"**
- Verify database URL format
- Check network connectivity
- Ensure database permissions

**"Schema sync failed"**
- Check drizzle.config.ts configuration
- Verify database user has schema modification permissions
- Review detailed error messages

**"Build process failed"**
- Check TypeScript compilation errors
- Verify all dependencies are installed
- Review build configuration

### Getting Help

1. Run scripts with verbose output for detailed logging
2. Check database connection status individually
3. Verify environment variable configuration
4. Review application logs for specific error details

## Contributing

When adding new deployment checks:

1. Follow the existing error handling patterns
2. Add detailed logging for troubleshooting
3. Include both success and failure scenarios
4. Update documentation accordingly