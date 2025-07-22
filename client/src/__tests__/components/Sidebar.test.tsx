import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, mockUsers } from '../utils/testUtils';
import { Sidebar } from '@/components/layout/sidebar';

describe('Sidebar Component', () => {
  describe('Role-Based Navigation', () => {
    it('shows admin navigation items for admin users', () => {
      render(<Sidebar />, { user: mockUsers.admin });

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Merchants')).toBeInTheDocument();
      expect(screen.getByText('Prospects')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Security & Compliance')).toBeInTheDocument();
    });

    it('shows limited navigation for agent users', () => {
      render(<Sidebar />, { user: mockUsers.agent });

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Prospects')).toBeInTheDocument();
      expect(screen.queryByText('Campaigns')).not.toBeInTheDocument();
      expect(screen.queryByText('Security & Compliance')).not.toBeInTheDocument();
    });

    it('shows merchant-specific navigation for merchant users', () => {
      render(<Sidebar />, { user: mockUsers.merchant });

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      expect(screen.queryByText('Agents')).not.toBeInTheDocument();
      expect(screen.queryByText('Prospects')).not.toBeInTheDocument();
    });
  });

  describe('Collapsible Functionality', () => {
    it('toggles sidebar collapse state', async () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
      expect(toggleButton).toBeInTheDocument();

      // Initially expanded
      expect(screen.getByText('CoreCRM')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByText('CoreCRM')).not.toBeInTheDocument();
      });
    });

    it('shows tooltips when collapsed', async () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
      fireEvent.click(toggleButton);

      // Hover over dashboard icon to show tooltip
      const dashboardIcon = screen.getByRole('link', { name: /dashboard/i });
      fireEvent.mouseEnter(dashboardIcon);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('User Profile Section', () => {
    it('displays user information', () => {
      render(<Sidebar />, { user: mockUsers.admin });

      expect(screen.getByText('Test Admin')).toBeInTheDocument();
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    it('shows logout option', () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it('adapts to collapsed state', async () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByText('Test Admin')).not.toBeInTheDocument();
        expect(screen.queryByText('admin@test.com')).not.toBeInTheDocument();
      });

      // But logout icon should still be visible
      const logoutIcon = screen.getByRole('button', { name: /logout/i });
      expect(logoutIcon).toBeInTheDocument();
    });
  });

  describe('Active State Highlighting', () => {
    it('highlights active navigation item', () => {
      // Mock window.location.pathname
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard' },
        writable: true,
      });

      render(<Sidebar />, { user: mockUsers.admin });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('bg-blue-50'); // or whatever active class is used
    });
  });

  describe('Equipment Sub-navigation', () => {
    it('shows equipment as sub-item under campaigns', () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const campaignsSection = screen.getByText('Campaigns');
      expect(campaignsSection).toBeInTheDocument();

      // Check for expandable campaigns menu
      const equipmentLink = screen.getByText('Equipment');
      expect(equipmentLink).toBeInTheDocument();
    });

    it('expands campaigns menu to show equipment', async () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const campaignsToggle = screen.getByRole('button', { name: /expand campaigns/i });
      fireEvent.click(campaignsToggle);

      await waitFor(() => {
        expect(screen.getByText('Equipment')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('handles mobile viewport correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<Sidebar />, { user: mockUsers.admin });

      // Sidebar should adapt to mobile layout
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label');

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('supports keyboard navigation', () => {
      render(<Sidebar />, { user: mockUsers.admin });

      const firstLink = screen.getByRole('link', { name: /dashboard/i });
      firstLink.focus();

      expect(firstLink).toHaveFocus();

      // Tab to next link
      fireEvent.keyDown(firstLink, { key: 'Tab' });
      // Next link should be focused (depending on implementation)
    });
  });
});