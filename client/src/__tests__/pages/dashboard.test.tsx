import { screen, waitFor } from '@testing-library/react';
import { render, mockUsers, mockApiResponses } from '../utils/testUtils';
import Dashboard from '@/pages/dashboard';

// Mock API calls
beforeEach(() => {
  global.fetch = jest.fn();
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/dashboard/stats')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          totalMerchants: 125,
          totalProspects: 45,
          totalTransactions: 1234,
          totalRevenue: 145000.50,
          recentProspects: mockApiResponses.prospects.slice(0, 5),
          recentTransactions: [
            {
              id: 1,
              amount: 250.00,
              merchant: { businessName: 'Test Business' },
              createdAt: '2025-01-10T10:00:00Z',
              type: 'sale',
              status: 'completed'
            }
          ]
        }),
      });
    }
    return Promise.reject(new Error('Unknown API call'));
  });
});

describe('Dashboard Page', () => {
  describe('Admin Dashboard', () => {
    it('renders dashboard with key metrics for admin users', async () => {
      render(<Dashboard />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check for metric cards
      await waitFor(() => {
        expect(screen.getByText('Total Merchants')).toBeInTheDocument();
        expect(screen.getByText('125')).toBeInTheDocument();
        expect(screen.getByText('Total Prospects')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('displays recent prospects section', async () => {
      render(<Dashboard />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Recent Prospects')).toBeInTheDocument();
      });

      // Should show prospect names
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('displays recent transactions section', async () => {
      render(<Dashboard />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      });

      // Should show transaction details
      await waitFor(() => {
        expect(screen.getByText('Test Business')).toBeInTheDocument();
        expect(screen.getByText('$250.00')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Dashboard', () => {
    it('renders agent-specific dashboard', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/agents/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              totalProspects: 12,
              pendingProspects: 5,
              approvedProspects: 7,
              totalCommission: 1250.00
            }),
          });
        }
        return Promise.reject(new Error('Unknown API call'));
      });

      render(<Dashboard />, { user: mockUsers.agent });

      await waitFor(() => {
        expect(screen.getByText('Agent Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles dashboard API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('API Error'))
      );

      render(<Dashboard />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Should show error state or loading skeleton
    });
  });
});