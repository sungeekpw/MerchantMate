import { apiRequest } from "./queryClient";

export async function ensureDevAuth(): Promise<boolean> {
  // Only run in development mode
  if (import.meta.env.MODE !== 'development') {
    return false;
  }

  try {
    // First check if we're already authenticated
    const authCheck = await fetch('/api/auth/user', { 
      credentials: 'include' 
    });
    
    if (authCheck.ok) {
      return true; // Already authenticated
    }

    // If not authenticated, use the development login bypass
    const loginResponse = await fetch('/api/auth/dev-login-bypass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      credentials: 'include'
    });

    return loginResponse.ok;
  } catch (error) {
    console.error('Development authentication failed:', error);
    return false;
  }
}