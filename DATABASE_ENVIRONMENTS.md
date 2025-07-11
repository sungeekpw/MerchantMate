# Database Environment Management

Core CRM supports URL-driven database environment switching for testing and development scenarios.

## Overview

The system can dynamically switch between different database environments based on:
- URL query parameters (`?db=test`)
- Custom HTTP headers (`X-Database-Env: test`)
- Subdomain detection (`test.yourapp.com`)

## Environment Variables

Set up different database URLs for each environment:

```bash
# Production (default)
DATABASE_URL="postgresql://user:pass@prod-server/corecrm"

# Test environment
TEST_DATABASE_URL="postgresql://user:pass@test-server/corecrm_test"

# Development environment
DEV_DATABASE_URL="postgresql://user:pass@dev-server/corecrm_dev"
```

## Usage Examples

### 1. URL Query Parameters

Switch to test database by adding `?db=test` to any URL:

```
https://yourapp.com/testing-utilities?db=test
https://yourapp.com/prospects?db=test
https://yourapp.com/campaigns?db=test
```

### 2. API Requests

Include database environment in API calls:

```bash
# Reset test data in test database
curl -X POST "http://localhost:5000/api/admin/reset-testing-data?db=test" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session" \
  -d '{"prospects": true}'

# Check database environment
curl "http://localhost:5000/api/admin/db-environment?db=test" \
  -H "Cookie: connect.sid=your-session"
```

### 3. Using Custom Headers

```bash
curl -X POST "http://localhost:5000/api/admin/reset-testing-data" \
  -H "Content-Type: application/json" \
  -H "X-Database-Env: test" \
  -H "Cookie: connect.sid=your-session" \
  -d '{"signatures": true}'
```

### 4. Subdomain Support

Configure DNS for automatic environment detection:

```
test.yourapp.com     → Uses TEST_DATABASE_URL
dev.yourapp.com      → Uses DEV_DATABASE_URL
yourapp.com          → Uses DATABASE_URL (production)
```

## Security

- Only users with `super_admin` role can use database environment switching
- Regular users always use the default production database
- Database switching is logged for audit purposes
- Environment information is included in response headers for debugging

## Testing Utilities Integration

The Testing Utilities page provides a user-friendly interface for:

1. **Database Environment Display**: Shows current database environment and status
2. **Environment Selection**: Dropdown to choose target database for operations
3. **URL Parameter Support**: Automatically detects `?db=` parameter in URL
4. **Audit Modal**: Shows which database was affected by reset operations

## Management Scripts

Use the provided utility scripts for database management:

```bash
# Switch environments
node scripts/database-utils.js switch-to-test
node scripts/database-utils.js switch-to-dev
node scripts/database-utils.js switch-to-prod

# Check current status
node scripts/database-utils.js status

# Get help
node scripts/database-utils.js help
```

## Implementation Details

### Database Connection Pooling

- Each environment maintains its own connection pool
- Connections are cached and reused for performance
- Automatic cleanup on application shutdown

### Middleware Flow

1. `adminDbMiddleware` checks user permissions
2. `extractDbEnv` extracts environment from request
3. `getDynamicDB` returns appropriate database connection
4. Request includes `dbEnv` and `dynamicDB` properties

### Error Handling

- Falls back to default database if environment URL is missing
- Logs warnings for invalid environment requests
- Maintains application stability with graceful degradation

## Best Practices

1. **Environment Separation**: Always use separate databases for test/dev/prod
2. **Data Isolation**: Never run tests against production data
3. **Permission Control**: Restrict database switching to super admins only
4. **Audit Logging**: Track all database operations for accountability
5. **URL Parameters**: Use descriptive parameter names (`?db=test` not `?env=t`)

## Examples in Core CRM

### Testing Scenarios

```bash
# Clear test data in test environment
https://yourapp.com/testing-utilities?db=test
→ Select "Clear All Prospects" → Reset Selected Data

# Develop new features safely
https://yourapp.com/campaigns?db=dev
→ Create/edit campaigns without affecting production

# Agent testing with isolated data
https://yourapp.com/prospects?db=test
→ Agents can test workflows with test prospects
```

### API Integration

```javascript
// Frontend: Include database environment in requests
const response = await fetch(`/api/admin/reset-testing-data?db=test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ prospects: true })
});

// Backend: Middleware automatically handles database switching
app.post('/api/admin/reset-testing-data', 
  requireRole(['super_admin']), 
  adminDbMiddleware, 
  async (req, res) => {
    const db = getRequestDB(req); // Returns test DB if ?db=test
    // ... perform operations on correct database
  }
);
```