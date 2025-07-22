import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, mockUsers } from '../utils/testUtils';
import Merchants from '@/pages/merchants';

const mockMerchants = [
  {
    id: 1,
    businessName: 'Test Restaurant LLC',
    contactEmail: 'contact@testrestaurant.com',
    contactPhone: '555-123-4567',
    status: 'active',
    processingFee: 2.9,
    monthlyVolume: 50000.00,
    agent: {
      id: 1,
      firstName: 'Sarah',
      lastName: 'Wilson'
    },
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    businessName: 'Tech Startup Inc',
    contactEmail: 'billing@techstartup.com',
    contactPhone: '555-987-6543',
    status: 'pending',
    processingFee: 3.2,
    monthlyVolume: 25000.00,
    agent: {
      id: 2,
      firstName: 'Mike',
      lastName: 'Chen'
    },
    createdAt: '2025-01-02T00:00:00Z'
  }
];

beforeEach(() => {
  global.fetch = jest.fn();
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/merchants')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMerchants),
      });
    }
    return Promise.reject(new Error('Unknown API call'));
  });
});

describe('Merchants Page', () => {
  describe('Merchant List Display', () => {
    it('renders merchants table with data', async () => {
      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Merchants')).toBeInTheDocument();
      });

      // Check table headers
      expect(screen.getByText('Business Name')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Agent')).toBeInTheDocument();

      // Check merchant data
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant LLC')).toBeInTheDocument();
        expect(screen.getByText('contact@testrestaurant.com')).toBeInTheDocument();
        expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
      });
    });

    it('displays merchant status badges correctly', async () => {
      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('shows processing fees and monthly volumes', async () => {
      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('2.9%')).toBeInTheDocument();
        expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('renders search functionality', async () => {
      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });
    });

    it('renders status filter dropdown', async () => {
      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        const filterDropdown = screen.getByRole('combobox');
        expect(filterDropdown).toBeInTheDocument();
      });
    });
  });

  describe('Merchant Actions', () => {
    it('shows edit and delete buttons for merchants', async () => {
      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        const editButtons = screen.getAllByTitle(/edit/i);
        const deleteButtons = screen.getAllByTitle(/delete/i);
        expect(editButtons.length).toBeGreaterThan(0);
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('allows adding new merchants', async () => {
      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        const addButton = screen.getByText(/add merchant/i);
        expect(addButton).toBeInTheDocument();
      });

      const addButton = screen.getByText(/add merchant/i);
      fireEvent.click(addButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Agent View Restrictions', () => {
    it('shows only assigned merchants for agent users', async () => {
      // Mock API to return filtered results for agents
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/merchants') && url.includes('agentId=2')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockMerchants[1]]), // Only Tech Startup Inc
          });
        }
        return Promise.reject(new Error('Unknown API call'));
      });

      render(<Merchants />, { user: mockUsers.agent });

      await waitFor(() => {
        expect(screen.getByText('Tech Startup Inc')).toBeInTheDocument();
        expect(screen.queryByText('Test Restaurant LLC')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('API Error'))
      );

      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Merchants')).toBeInTheDocument();
      });

      // Should show loading or error state
    });

    it('shows empty state when no merchants exist', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      );

      render(<Merchants />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText(/no merchants found/i)).toBeInTheDocument();
      });
    });
  });
});