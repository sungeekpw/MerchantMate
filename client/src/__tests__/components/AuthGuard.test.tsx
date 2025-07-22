import { screen, waitFor } from '@testing-library/react';
import { render, mockUsers } from '../utils/testUtils';
import AuthGuard from '@/components/AuthGuard';

const TestComponent = () => <div>Protected Content</div>;

describe('AuthGuard Component', () => {
  describe('Authentication Protection', () => {
    it('renders protected content for authenticated users', async () => {
      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>,
        { user: mockUsers.admin }
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('redirects unauthenticated users', async () => {
      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>,
        { user: null }
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        // Should show loading or redirect
      });
    });

    it('shows loading state during authentication check', async () => {
      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>,
        { user: null, isLoading: true }
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Role-Based Access', () => {
    it('allows access for users with required role', async () => {
      render(
        <AuthGuard requiredRole="admin">
          <TestComponent />
        </AuthGuard>,
        { user: mockUsers.admin }
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('denies access for users without required role', async () => {
      render(
        <AuthGuard requiredRole="admin">
          <TestComponent />
        </AuthGuard>,
        { user: mockUsers.agent }
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });

    it('allows access for multiple roles', async () => {
      render(
        <AuthGuard requiredRole={['admin', 'super_admin']}>
          <TestComponent />
        </AuthGuard>,
        { user: mockUsers.admin }
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });
});