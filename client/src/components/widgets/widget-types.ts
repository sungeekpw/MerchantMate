export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'business' | 'activity' | 'system' | 'utility' | 'profile';
  allowedRoles: string[];
  defaultSize: 'small' | 'medium' | 'large';
  configurable: string[];
}

export interface UserWidgetPreference {
  id?: number;
  userId: string;
  widgetId: string;
  position: number;
  size: 'small' | 'medium' | 'large';
  isVisible: boolean;
  configuration: Record<string, any>;
}

export interface WidgetProps {
  definition: WidgetDefinition;
  preference: UserWidgetPreference;
  onConfigChange: (config: Record<string, any>) => void;
  onSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onVisibilityChange: (visible: boolean) => void;
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    id: "revenue_metrics",
    name: "Revenue Metrics",
    description: "Total revenue and growth statistics",
    category: "financial",
    allowedRoles: ["admin", "corporate", "super_admin"],
    defaultSize: "medium",
    configurable: ["timeRange", "showGrowth"]
  },
  {
    id: "merchant_count",
    name: "Active Merchants",
    description: "Number of active merchants",
    category: "business",
    allowedRoles: ["admin", "corporate", "super_admin", "agent"],
    defaultSize: "small",
    configurable: ["showGrowth"]
  },
  {
    id: "transaction_count",
    name: "Transaction Volume",
    description: "Daily transaction count and trends",
    category: "financial",
    allowedRoles: ["admin", "corporate", "super_admin", "agent", "merchant"],
    defaultSize: "medium",
    configurable: ["timeRange", "chartType"]
  },
  {
    id: "agent_performance",
    name: "Agent Performance",
    description: "Agent productivity and metrics",
    category: "business",
    allowedRoles: ["admin", "corporate", "super_admin"],
    defaultSize: "large",
    configurable: ["metricType", "timeRange"]
  },
  {
    id: "recent_transactions",
    name: "Recent Transactions",
    description: "Latest transaction activity",
    category: "activity",
    allowedRoles: ["admin", "corporate", "super_admin", "agent", "merchant"],
    defaultSize: "large",
    configurable: ["limit", "statusFilter"]
  },
  {
    id: "top_merchants",
    name: "Top Merchants",
    description: "Highest performing merchants",
    category: "business",
    allowedRoles: ["admin", "corporate", "super_admin", "agent"],
    defaultSize: "medium",
    configurable: ["sortBy", "limit"]
  },
  {
    id: "system_status",
    name: "System Status",
    description: "Platform health and uptime",
    category: "system",
    allowedRoles: ["admin", "corporate", "super_admin"],
    defaultSize: "small",
    configurable: ["showDetails"]
  },
  {
    id: "quick_actions",
    name: "Quick Actions",
    description: "Frequently used actions and shortcuts",
    category: "utility",
    allowedRoles: ["admin", "corporate", "super_admin", "agent"],
    defaultSize: "small",
    configurable: ["actionList"]
  },
  {
    id: "my_merchant_profile",
    name: "My Merchant Profile",
    description: "Merchant's own business information",
    category: "profile",
    allowedRoles: ["merchant"],
    defaultSize: "medium",
    configurable: ["showDetails"]
  },
  {
    id: "my_transactions",
    name: "My Transactions",
    description: "Merchant's transaction history",
    category: "activity",
    allowedRoles: ["merchant"],
    defaultSize: "large",
    configurable: ["limit", "statusFilter", "timeRange"]
  }
];