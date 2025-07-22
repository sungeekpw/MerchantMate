# Testing Framework Guide

This project uses Jest and React Testing Library for comprehensive testing coverage.

## Test Structure

```
client/src/__tests__/          # Frontend tests
  components/                  # Component tests
  pages/                      # Page component tests
  utils/                      # Test utilities and helpers
server/__tests__/             # Backend tests
shared/__tests__/             # Schema and shared logic tests
```

## Running Tests

Since we can't modify package.json directly in this environment, you can run tests using npx:

```bash
# Run all tests
npx jest

# Run tests in watch mode
npx jest --watch

# Run tests with coverage
npx jest --coverage

# Run specific test file
npx jest prospects.test.tsx

# Run tests matching a pattern
npx jest --testNamePattern="Admin User View"
```

## Test Types

### 1. Component Tests
- Test individual React components
- Focus on rendering, props, and user interactions
- Example: `Header.test.tsx`

### 2. Page Tests
- Test complete page components
- Include user flows and integration scenarios
- Example: `prospects.test.tsx`

### 3. API/Storage Tests
- Test backend functionality and database operations
- Mock database connections for isolation
- Example: `storage.test.tsx`

### 4. Schema Validation Tests
- Test Zod schemas and data validation
- Ensure data integrity across the application
- Example: `schema.test.ts`

## Test Utilities

### Custom Render Function
Use the custom render function from `testUtils.tsx` for components that need:
- React Query context
- Authentication context
- Mock user data

```typescript
import { render, mockUsers } from '../utils/testUtils';

// Render with admin user
render(<MyComponent />, { user: mockUsers.admin });

// Render with agent user
render(<MyComponent />, { user: mockUsers.agent });
```

### Mock Data
Predefined mock data is available in `testUtils.tsx`:
- `mockUsers`: Different user types (admin, agent, merchant)
- `mockApiResponses`: Common API response structures

## Best Practices

### 1. Test Organization
```typescript
describe('Component Name', () => {
  describe('Feature Group', () => {
    it('should do specific thing', () => {
      // Test implementation
    });
  });
});
```

### 2. Mock External Dependencies
Always mock:
- API calls (`fetch`)
- External libraries
- Environment variables
- File system operations

### 3. Test User Interactions
```typescript
import { fireEvent, waitFor } from '@testing-library/react';

// Click interactions
fireEvent.click(button);

// Form interactions
fireEvent.change(input, { target: { value: 'new value' } });

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### 4. Accessibility Testing
Test components with screen reader queries:
```typescript
// By role
screen.getByRole('button', { name: 'Submit' });

// By label
screen.getByLabelText('Email Address');

// By text
screen.getByText('Welcome Message');
```

## Test Coverage Goals

- **Components**: 90%+ coverage
- **API Routes**: 85%+ coverage
- **Schema Validation**: 100% coverage
- **Critical User Flows**: 100% coverage

## Continuous Integration

For CI environments, use:
```bash
npx jest --ci --coverage --watchAll=false
```

This ensures:
- No watch mode in CI
- Coverage reports generated
- Proper exit codes for CI pipelines

## Debugging Tests

### Common Issues
1. **Component not rendering**: Check if providers are included in test wrapper
2. **API mocks not working**: Ensure fetch is mocked before test runs
3. **Async operations failing**: Use `waitFor` for async state changes
4. **Context errors**: Verify all required providers are in test wrapper

### Debug Commands
```bash
# Run with verbose output
npx jest --verbose

# Run single test file with debugging
npx jest prospects.test.tsx --verbose --no-cache
```

## Integration with Development Workflow

1. **Write tests first (TDD)**: Create test cases before implementing features
2. **Run tests before commits**: Ensure all tests pass before pushing
3. **Add tests for bug fixes**: Prevent regression by testing bug scenarios
4. **Update tests with feature changes**: Keep tests in sync with code changes

## Pre-deployment Checklist

Before any deployment:
- [ ] All tests pass locally
- [ ] Coverage meets minimum thresholds
- [ ] No console errors in test output
- [ ] Critical user flows tested
- [ ] New features have corresponding tests