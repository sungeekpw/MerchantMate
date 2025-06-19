import { Link, useLocation } from "wouter";
import { CreditCard, BarChart3, Store, Users, Receipt, FileText, LogOut, User, MapPin, Shield, Upload, UserPlus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAnalytics, canAccessMerchants, canAccessAgents, canAccessTransactions } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const baseNavigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, requiresRole: ['merchant', 'agent', 'admin', 'corporate', 'super_admin'] },
  { name: "Agent Dashboard", href: "/agent-dashboard", icon: CreditCard, requiresRole: ['agent'] },
  { name: "Merchants", href: "/merchants", icon: Store, requiresRole: ['agent', 'admin', 'corporate', 'super_admin'] },
  { name: "Locations", href: "/locations", icon: MapPin, requiresRole: ['merchant'] },
  { name: "Agents", href: "/agents", icon: Users, requiresRole: ['admin', 'corporate', 'super_admin'] },
  { name: "Prospects", href: "/prospects", icon: UserPlus, requiresRole: ['admin', 'corporate', 'super_admin'] },
  { name: "Campaigns", href: "/campaigns", icon: DollarSign, requiresRole: ['admin', 'super_admin'] },
  { name: "Transactions", href: "/transactions", icon: Receipt, requiresRole: ['merchant', 'agent', 'admin', 'corporate', 'super_admin'] },
  { name: "PDF Forms", href: "/pdf-forms", icon: Upload, requiresRole: ['admin', 'super_admin'] },
  { name: "Users", href: "/users", icon: User, requiresRole: ['admin', 'corporate', 'super_admin'] },
  { name: "Reports", href: "/reports", icon: FileText, requiresRole: ['admin', 'corporate', 'super_admin'] },
  { name: "Security", href: "/security", icon: Shield, requiresRole: ['admin', 'super_admin'] },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Fetch PDF forms that should appear in navigation
  const { data: pdfForms = [] } = useQuery({
    queryKey: ['/api/pdf-forms'],
    queryFn: async () => {
      const response = await fetch('/api/pdf-forms', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user
  });

  const getFilteredNavigation = () => {
    if (!user) return [];
    
    const userRole = (user as any)?.role;
    
    // Filter base navigation
    const filteredBase = baseNavigation.filter(item => {
      return item.requiresRole.includes(userRole);
    });

    // Add dynamic PDF form navigation items - automatically creates dedicated pages
    const dynamicNavItems = pdfForms
      .filter((form: any) => 
        form.showInNavigation && 
        form.allowedRoles.includes(userRole)
      )
      .map((form: any) => ({
        name: form.navigationTitle || form.name,
        href: `/form-application/${form.id}`,
        icon: FileText,
        requiresRole: form.allowedRoles
      }));

    return [...filteredBase, ...dynamicNavItems];
  };

  return (
    <div className="corecrm-sidebar w-64 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">CoreCRM</h1>
            <p className="text-sm text-gray-500">Payment Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {getFilteredNavigation().map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href} className={cn("corecrm-nav-item", isActive && "active")}>
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      {user && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {(user as any)?.firstName} {(user as any)?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {(user as any)?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
}
