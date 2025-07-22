import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import * as queryClientModule from '../../lib/queryClient';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

// Mock the queryClient
jest.mock('../../lib/queryClient', () => ({
  getQueryFn: jest.fn(),
  queryClient: {
    clear: jest.fn(),
  },
}));

const mockGetQueryFn = queryClientModule.getQueryFn as jest.MockedFunction<typeof queryClientModule.getQueryFn>;
const mockQueryClientClear = queryClientModule.queryClient.clear as jest.MockedFunction<typeof queryClientModule.queryClient.clear>;

describe('useAuth Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    window.location.href = '';
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return user data when authenticated', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin' as const,
      username: 'testuser'
    };

    mockGetQueryFn.mockReturnValue(() => Promise.resolve(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should return null user when not authenticated', async () => {
    mockGetQueryFn.mockReturnValue(() => Promise.resolve(null));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle successful logout', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await result.current.logout();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    expect(mockQueryClientClear).toHaveBeenCalled();
    expect(window.location.href).toBe('/auth');
  });

  it('should handle failed logout by clearing cache and redirecting', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await result.current.logout();

    expect(mockQueryClientClear).toHaveBeenCalled();
    expect(window.location.href).toBe('/auth');
  });

  it('should handle logout network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await result.current.logout();

    expect(mockQueryClientClear).toHaveBeenCalled();
    expect(window.location.href).toBe('/auth');
  });

  it('should provide correct hook interface', async () => {
    mockGetQueryFn.mockReturnValue(() => Promise.resolve(null));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(typeof result.current.user).toBeDefined();
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isAuthenticated).toBe('boolean');
      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    });
  });
});