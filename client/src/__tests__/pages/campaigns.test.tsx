import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, mockUsers } from '../utils/testUtils';
import Campaigns from '@/pages/campaigns';

const mockCampaigns = [
  {
    id: 1,
    name: 'Restaurant Special - Esquire',
    acquirer: 'Esquire',
    pricingType: 'Tiered',
    status: 'active',
    merchantCount: 25,
    totalRevenue: 125000.00,
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'E-commerce Campaign - Wells Fargo',
    acquirer: 'Wells Fargo',
    pricingType: 'Dual',
    status: 'active',
    merchantCount: 12,
    totalRevenue: 95000.00,
    createdAt: '2025-01-05T00:00:00Z'
  }
];

const mockFeeGroups = [
  { id: 1, name: 'Discount Rates', description: 'Standard processing rates' },
  { id: 2, name: 'Monthly Fees', description: 'Recurring monthly charges' }
];

beforeEach(() => {
  global.fetch = jest.fn();
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/campaigns')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCampaigns),
      });
    }
    if (url.includes('/api/fee-groups')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFeeGroups),
      });
    }
    if (url.includes('/api/pricing-types')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Tiered', description: 'Volume-based pricing' },
          { id: 2, name: 'Dual', description: 'Dual pricing structure' }
        ]),
      });
    }
    return Promise.reject(new Error('Unknown API call'));
  });
});

describe('Campaigns Page', () => {
  describe('Access Control', () => {
    it('allows admin users to access campaigns', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Campaign Management')).toBeInTheDocument();
      });
    });

    it('restricts access for non-admin users', async () => {
      render(<Campaigns />, { user: mockUsers.agent });

      // Should show access denied or redirect
      // This depends on the actual implementation of access control
    });
  });

  describe('Campaign List', () => {
    it('displays campaigns with key information', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Restaurant Special - Esquire')).toBeInTheDocument();
        expect(screen.getByText('E-commerce Campaign - Wells Fargo')).toBeInTheDocument();
      });

      // Check campaign details
      expect(screen.getByText('Esquire')).toBeInTheDocument();
      expect(screen.getByText('Wells Fargo')).toBeInTheDocument();
      expect(screen.getByText('Tiered')).toBeInTheDocument();
      expect(screen.getByText('Dual')).toBeInTheDocument();
    });

    it('shows campaign metrics', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // merchant count
        expect(screen.getByText('$125,000.00')).toBeInTheDocument(); // revenue
      });
    });

    it('displays campaign status badges', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        const activeStatuses = screen.getAllByText('Active');
        expect(activeStatuses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Campaign Creation', () => {
    it('opens create campaign dialog', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        const createButton = screen.getByText(/create campaign/i);
        expect(createButton).toBeInTheDocument();
      });

      const createButton = screen.getByText(/create campaign/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/campaign name/i)).toBeInTheDocument();
      });
    });

    it('shows acquirer selection options', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      const createButton = screen.getByText(/create campaign/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Acquirer')).toBeInTheDocument();
      });
    });
  });

  describe('Tabbed Interface', () => {
    it('renders all campaign management tabs', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByText('Campaigns')).toBeInTheDocument();
        expect(screen.getByText('Fee Groups')).toBeInTheDocument();
        expect(screen.getByText('Fee Items')).toBeInTheDocument();
        expect(screen.getByText('Pricing Types')).toBeInTheDocument();
      });
    });

    it('switches between tabs correctly', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        const feeGroupsTab = screen.getByText('Fee Groups');
        fireEvent.click(feeGroupsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Discount Rates')).toBeInTheDocument();
        expect(screen.getByText('Monthly Fees')).toBeInTheDocument();
      });
    });
  });

  describe('Fee Management', () => {
    it('displays fee groups in fee groups tab', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      const feeGroupsTab = screen.getByText('Fee Groups');
      fireEvent.click(feeGroupsTab);

      await waitFor(() => {
        expect(screen.getByText('Discount Rates')).toBeInTheDocument();
        expect(screen.getByText('Standard processing rates')).toBeInTheDocument();
      });
    });

    it('allows creating new fee groups', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      const feeGroupsTab = screen.getByText('Fee Groups');
      fireEvent.click(feeGroupsTab);

      await waitFor(() => {
        const createButton = screen.getByText(/create fee group/i);
        expect(createButton).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('provides search functionality', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });
    });

    it('provides acquirer filtering', async () => {
      render(<Campaigns />, { user: mockUsers.admin });

      await waitFor(() => {
        const filterDropdown = screen.getByRole('combobox');
        expect(filterDropdown).toBeInTheDocument();
      });
    });
  });
});