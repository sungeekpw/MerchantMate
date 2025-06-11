import { apiRequest } from "./queryClient";

export async function ensureDevAuth(): Promise<boolean> {
  // Only run in development mode
  if (import.meta.env.MODE !== 'development') {
    return false;
  }

  try {
    console.log('Checking authentication...');
    // First check if we're already authenticated
    const authCheck = await fetch('/api/auth/user', { 
      credentials: 'include' 
    });
    
    console.log('Auth check response:', authCheck.status);
    if (authCheck.ok) {
      console.log('Already authenticated');
      return true; // Already authenticated
    }

    console.log('Not authenticated, attempting dev login bypass...');
    // If not authenticated, use the development login bypass
    const loginResponse = await fetch('/api/auth/dev-login-bypass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      credentials: 'include'
    });

    console.log('Dev login response:', loginResponse.status);
    if (loginResponse.ok) {
      console.log('Dev authentication successful');
      return true;
    } else {
      console.log('Dev authentication failed');
      return false;
    }
  } catch (error) {
    console.error('Development authentication failed:', error);
    return false;
  }
}