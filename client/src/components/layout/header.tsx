import { Search, Bell, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

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

  const formatLastLogin = (lastLoginAt: string | null, lastLoginIp: string | null) => {
    if (!lastLoginAt) return null;
    
    try {
      const date = new Date(lastLoginAt);
      const formattedDate = format(date, "MMM dd, yyyy");
      const formattedTime = format(date, "hh:mm a");
      
      return {
        date: formattedDate,
        time: formattedTime,
        ip: lastLoginIp || "Unknown"
      };
    } catch (error) {
      return null;
    }
  };

  const lastLoginInfo = formatLastLogin(user?.lastLoginAt, user?.lastLoginIp);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Last Login Info */}
          {lastLoginInfo && (
            <div className="flex items-center space-x-3 text-xs text-gray-500 border-r border-gray-200 pr-4">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Last login: {lastLoginInfo.date} at {lastLoginInfo.time}</span>
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
