import { Search, Bell, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatDateInUserTimezone, getTimezoneAbbreviation } from "@/lib/timezone";

interface HeaderProps {
  title: string;
  subtitle: string;
  onSearch?: (query: string) => void;
}

export function Header({ title, subtitle, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

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
    user?.lastLoginIp
  );

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 p-6 max-w-lg">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4 px-6 py-4">
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>
        </div>
      </div>
    </header>
  );
}
