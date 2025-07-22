import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock user data for testing
export const mockUsers = {
  admin: {
    id: 'admin-test-123',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'super_admin' as const,
  },
  agent: {
    id: 'agent-test-123',
    email: 'agent@test.com',
    firstName: 'Test',
    lastName: 'Agent',
    role: 'agent' as const,
  },
  merchant: {
    id: 'merchant-test-123',
    email: 'merchant@test.com',
    firstName: 'Test',
    lastName: 'Merchant',
    role: 'merchant' as const,
  },
};

// Mock API responses
export const mockApiResponses = {
  prospects: [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      status: 'pending',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      validationToken: 'test-token-123',
      agent: {
        id: 1,
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.wilson@corecrm.com',
      },
    },
  ],
  agents: [
    {
      id: 1,
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah.wilson@corecrm.com',
    },
    {
      id: 2,
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike.chen@corecrm.com',
    },
  ],
};

// Test wrapper with providers
interface AllTheProvidersProps {
  children: React.ReactNode;
  user?: typeof mockUsers.admin;
}

const AllTheProviders = ({ children, user = mockUsers.admin }: AllTheProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // Mock the AuthContext
  const mockAuthContextValue = {
    user,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
    isAuthenticated: !!user,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={mockAuthContextValue}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { user?: typeof mockUsers.admin }
) => render(ui, { wrapper: (props) => <AllTheProviders {...props} user={options?.user} />, ...options });

export * from '@testing-library/react';
export { customRender as render };