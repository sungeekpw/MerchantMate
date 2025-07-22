import { hasRole, hasAnyRole, hasPermission, canAccessRoute } from '../../lib/rbac';
import type { UserRole } from '../../../shared/schema';

describe('RBAC Module', () => {
  describe('hasRole', () => {
    it('should return true when user has exact role', () => {
      const user = { role: 'admin' as UserRole };
      expect(hasRole(user, 'admin')).toBe(true);
    });

    it('should return false when user has different role', () => {
      const user = { role: 'agent' as UserRole };
      expect(hasRole(user, 'admin')).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });

    it('should return false when user is undefined', () => {
      expect(hasRole(undefined, 'admin')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', () => {
      const user = { role: 'agent' as UserRole };
      expect(hasAnyRole(user, ['admin', 'agent'])).toBe(true);
    });

    it('should return false when user has none of the specified roles', () => {
      const user = { role: 'merchant' as UserRole };
      expect(hasAnyRole(user, ['admin', 'agent'])).toBe(false);
    });

    it('should return true when super_admin has any role check', () => {
      const user = { role: 'super_admin' as UserRole };
      expect(hasAnyRole(user, ['admin', 'agent'])).toBe(true);
    });

    it('should return false when user is null', () => {
      expect(hasAnyRole(null, ['admin', 'agent'])).toBe(false);
    });

    it('should handle empty roles array', () => {
      const user = { role: 'admin' as UserRole };
      expect(hasAnyRole(user, [])).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should allow super_admin to read anything', () => {
      const user = { role: 'super_admin' as UserRole };
      expect(hasPermission(user, 'read', 'merchants')).toBe(true);
      expect(hasPermission(user, 'write', 'agents')).toBe(true);
      expect(hasPermission(user, 'delete', 'transactions')).toBe(true);
    });

    it('should allow admin to read and write most resources', () => {
      const user = { role: 'admin' as UserRole };
      expect(hasPermission(user, 'read', 'merchants')).toBe(true);
      expect(hasPermission(user, 'write', 'merchants')).toBe(true);
      expect(hasPermission(user, 'read', 'agents')).toBe(true);
      expect(hasPermission(user, 'write', 'agents')).toBe(true);
    });

    it('should limit agent permissions appropriately', () => {
      const user = { role: 'agent' as UserRole };
      expect(hasPermission(user, 'read', 'merchants')).toBe(true);
      expect(hasPermission(user, 'write', 'merchants')).toBe(true);
      expect(hasPermission(user, 'read', 'agents')).toBe(false);
      expect(hasPermission(user, 'write', 'agents')).toBe(false);
    });

    it('should limit merchant permissions to read-only', () => {
      const user = { role: 'merchant' as UserRole };
      expect(hasPermission(user, 'read', 'transactions')).toBe(true);
      expect(hasPermission(user, 'write', 'merchants')).toBe(false);
      expect(hasPermission(user, 'delete', 'transactions')).toBe(false);
    });

    it('should deny permissions when user is null', () => {
      expect(hasPermission(null, 'read', 'merchants')).toBe(false);
      expect(hasPermission(undefined, 'write', 'agents')).toBe(false);
    });

    it('should handle unknown resources conservatively', () => {
      const user = { role: 'admin' as UserRole };
      expect(hasPermission(user, 'read', 'unknown_resource' as any)).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    it('should allow access to dashboard for authenticated users', () => {
      const user = { role: 'merchant' as UserRole };
      expect(canAccessRoute(user, '/dashboard')).toBe(true);
    });

    it('should restrict admin routes to admin and super_admin', () => {
      const admin = { role: 'admin' as UserRole };
      const agent = { role: 'agent' as UserRole };
      const superAdmin = { role: 'super_admin' as UserRole };
      
      expect(canAccessRoute(admin, '/agents')).toBe(true);
      expect(canAccessRoute(agent, '/agents')).toBe(false);
      expect(canAccessRoute(superAdmin, '/agents')).toBe(true);
    });

    it('should allow agents access to prospects and merchant routes', () => {
      const agent = { role: 'agent' as UserRole };
      expect(canAccessRoute(agent, '/prospects')).toBe(true);
      expect(canAccessRoute(agent, '/merchants')).toBe(true);
    });

    it('should restrict super admin routes', () => {
      const admin = { role: 'admin' as UserRole };
      const superAdmin = { role: 'super_admin' as UserRole };
      
      expect(canAccessRoute(admin, '/testing-utilities')).toBe(false);
      expect(canAccessRoute(superAdmin, '/testing-utilities')).toBe(true);
    });

    it('should deny access when user is null', () => {
      expect(canAccessRoute(null, '/dashboard')).toBe(false);
      expect(canAccessRoute(undefined, '/merchants')).toBe(false);
    });

    it('should handle unknown routes conservatively', () => {
      const user = { role: 'admin' as UserRole };
      expect(canAccessRoute(user, '/unknown-route')).toBe(false);
    });

    it('should handle root route correctly', () => {
      const user = { role: 'merchant' as UserRole };
      expect(canAccessRoute(user, '/')).toBe(true);
    });
  });
});