// Auth helper functions for production authentication only
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const authCheck = await fetch('/api/auth/user', { 
      credentials: 'include' 
    });
    return authCheck.ok;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
}