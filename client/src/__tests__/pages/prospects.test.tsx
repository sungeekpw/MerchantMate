import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, mockApiResponses, mockUsers } from '../utils/testUtils';
import Prospects from '@/pages/prospects';

// Mock the API calls
beforeEach(() => {
  global.fetch = jest.fn();
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/prospects')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.prospects),
      });
    }
    if (url.includes('/api/agents')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.agents),
      });
    }
    return Promise.reject(new Error('Unknown API call'));
  });
});

describe('Prospects Page', () => {
  describe('Admin User View', () => {
    it('renders agent-based hierarchical view for admin users', async () => {
      render(<Prospects />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Merchant Prospects')).toBeInTheDocument();
      });

      // Should show agent cards for admin users
      await waitFor(() => {
        expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
      });
    });

    it('allows expanding and collapsing agent sections', async () => {
      render(<Prospects />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
      });

      // Find and click the agent card to expand
      const agentCard = screen.getByText('Sarah Wilson').closest('[role="button"]');
      if (agentCard) {
        fireEvent.click(agentCard);
      }

      // Should show prospect details when expanded
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });
    });

    it('displays prospect status badges correctly', async () => {
      render(<Prospects />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('pending: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Agent User View', () => {
    it('renders regular table view for agent users', async () => {
      render(<Prospects />, { user: mockUsers.agent });

      await waitFor(() => {
        expect(screen.getByText('Merchant Prospects')).toBeInTheDocument();
      });

      // Should show regular table headers for non-admin users
      await waitFor(() => {
        expect(screen.getByText('Prospect')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Agent')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('renders search input and status filter', async () => {
      render(<Prospects />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search prospects...')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Status filter dropdown
      });
    });

    it('allows adding new prospects', async () => {
      render(<Prospects />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Add Prospect')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Prospect');
      fireEvent.click(addButton);

      // Modal should open (assuming ProspectModal is rendered)
      // This would need more detailed implementation based on modal structure
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('API Error'))
      );

      render(<Prospects />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Merchant Prospects')).toBeInTheDocument();
      });

      // Should show loading or error state
      // Implementation depends on actual error handling in component
    });
  });
});