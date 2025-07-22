import { screen, waitFor } from '@testing-library/react';
import { render, mockUsers } from '../utils/testUtils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

// Mock API component to test query integration
const TestApiComponent = () => {
  const { data: prospects, isLoading, error } = useQuery({
    queryKey: ['/api/prospects'],
    queryFn: async () => {
      const response = await fetch('/api/prospects');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  if (isLoading) return <div>Loading prospects...</div>;
  if (error) return <div>Error loading prospects</div>;
  
  return (
    <div>
      <h2>Prospects List</h2>
      {prospects?.map((prospect: any) => (
        <div key={prospect.id} data-testid={`prospect-${prospect.id}`}>
          {prospect.firstName} {prospect.lastName} - {prospect.email}
        </div>
      ))}
    </div>
  );
};

describe('API Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/prospects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 1,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              status: 'pending'
            },
            {
              id: 2,
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@example.com',
              status: 'contacted'
            }
          ]),
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('successfully fetches and displays prospects data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestApiComponent />
      </QueryClientProvider>,
      { user: mockUsers.admin }
    );

    // Should show loading state initially
    expect(screen.getByText('Loading prospects...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Prospects List')).toBeInTheDocument();
    });

    // Check that prospects are displayed
    await waitFor(() => {
      expect(screen.getByTestId('prospect-1')).toBeInTheDocument();
      expect(screen.getByText('John Doe - john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith - jane.smith@example.com')).toBeInTheDocument();
    });

    // Verify API was called
    expect(global.fetch).toHaveBeenCalledWith('/api/prospects');
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TestApiComponent />
      </QueryClientProvider>,
      { user: mockUsers.admin }
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading prospects')).toBeInTheDocument();
    });
  });

  it('handles empty data response', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TestApiComponent />
      </QueryClientProvider>,
      { user: mockUsers.admin }
    );

    await waitFor(() => {
      expect(screen.getByText('Prospects List')).toBeInTheDocument();
    });

    // Should not display any prospect items
    expect(screen.queryByTestId(/prospect-/)).not.toBeInTheDocument();
  });
});