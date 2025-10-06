import { Search, Bell, Clock, MapPin, Database, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateInUserTimezone, getTimezoneAbbreviation } from "@/lib/timezone";

function AlertsButton() {
  const { data: alertCount } = useQuery<{ count: number }>({
    queryKey: ['/api/alerts/count'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = alertCount?.count || 0;
  const hasUnread = unreadCount > 0;

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative"
      data-testid="button-alerts"
    >
      <Bell 
        className="w-5 h-5" 
        style={{ 
          stroke: hasUnread ? '#dc2626' : '#10b981', // Red if unread, green if all read
          strokeWidth: hasUnread ? 2.5 : 2
        }} 
      />
      {hasUnread && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 bg-red-500 text-white text-xs"
          data-testid="badge-alert-count"
        >
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
}

interface HeaderProps {
  title: string;
  onSearch?: (query: string) => void;
}

export function Header({ title, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Global environment system - listen for environment changes
  useEffect(() => {
    const handleEnvChange = (event: CustomEvent) => {
      // Invalidate all queries when environment changes globally
      queryClient.invalidateQueries();
    };
    
    // Listen for global environment change events
    window.addEventListener('globalEnvironmentChanged', handleEnvChange as EventListener);
    
    return () => {
      window.removeEventListener('globalEnvironmentChanged', handleEnvChange as EventListener);
    };
  }, [queryClient]);
  
  // Fetch global environment status
  const { data: dbEnvironment } = useQuery({
    queryKey: ['/api/environment'],
    queryFn: async () => {
      const response = await fetch('/api/environment', {
        credentials: 'include'
      });
      if (!response.ok) return { environment: 'production', globalEnvironment: 'production', isProduction: true };
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const formatLastLogin = (lastLoginAt: string | Date | null, lastLoginIp: string | null, userTimezone?: string | null) => {
    if (!lastLoginAt) return null;
    
    try {
      const timezone = userTimezone || user?.timezone || undefined;
      const formattedDateTime = formatDateInUserTimezone(lastLoginAt, "MMM dd, yyyy 'at' hh:mm a", timezone);
      const timezoneAbbr = getTimezoneAbbreviation(timezone);
      
      if (!formattedDateTime) return null;
      
      return {
        dateTime: formattedDateTime,
        timezone: timezoneAbbr,
        ip: lastLoginIp || "Unknown"
      };
    } catch (error) {
      return null;
    }
  };

  const lastLoginInfo = formatLastLogin(
    user?.lastLoginAt ? (typeof user.lastLoginAt === 'string' ? user.lastLoginAt : user.lastLoginAt.toISOString()) : null, 
    user?.lastLoginIp || null
  );

  const getDatabaseBadge = () => {
    // Never show database environment indicator in production builds
    if (import.meta.env.PROD) return null;
    
    if (!dbEnvironment || dbEnvironment.environment === 'production') return null;
    
    const isDevEnvironment = dbEnvironment.environment === 'development' || dbEnvironment.environment === 'dev';
    const isTestEnvironment = dbEnvironment.environment === 'test';
    
    return (
      <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
        <Badge 
          variant={isTestEnvironment ? "destructive" : "secondary"}
          className={`flex items-center space-x-1 ${
            isTestEnvironment ? 'bg-orange-100 text-orange-800 border-orange-200' : 
            isDevEnvironment ? 'bg-blue-100 text-blue-800 border-blue-200' : ''
          }`}
        >
          <Database className="w-3 h-3" />
          <span className="font-medium">
            {dbEnvironment.environment.toUpperCase()} DB
          </span>
        </Badge>
        {(isDevEnvironment || isTestEnvironment) && (
          <div className="flex items-center space-x-1 text-xs text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Non-Production</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 p-6 max-w-lg">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center space-x-4 px-6 py-4">
          {/* Database Environment Indicator */}
          {getDatabaseBadge()}
          
          {/* Last Login Info */}
          {lastLoginInfo && (
            <div className="flex items-center space-x-3 text-xs text-gray-500 border-r border-gray-200 pr-4">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Last login: {lastLoginInfo.dateTime} ({lastLoginInfo.timezone})</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{lastLoginInfo.ip}</span>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search merchants, agents, or transactions..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-80 pl-10"
            />
          </div>

          {/* Notifications */}
          <AlertsButton />
        </div>
      </div>
    </header>
  );
}
