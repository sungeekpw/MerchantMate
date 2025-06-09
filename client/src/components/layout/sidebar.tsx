import { Link, useLocation } from "wouter";
import { CreditCard, BarChart3, Store, Users, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Merchants", href: "/merchants", icon: Store },
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Reports", href: "/reports", icon: FileText },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="paycrm-sidebar w-64 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">PayCRM</h1>
            <p className="text-sm text-gray-500">Payment Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <a className={cn("paycrm-nav-item", isActive && "active")}>
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">John Admin</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}
