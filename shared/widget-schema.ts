import { z } from "zod";
import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// User dashboard preferences
export const userDashboardPreferences = pgTable("user_dashboard_preferences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  widgetId: text("widget_id").notNull(),
  position: integer("position").notNull().default(0),
  size: text("size").notNull().default("medium"), // small, medium, large
  isVisible: boolean("is_visible").notNull().default(true),
  configuration: jsonb("configuration").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Widget definitions
export const widgetDefinitions = [
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
] as const;

export const insertUserDashboardPreferenceSchema = createInsertSchema(userDashboardPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserDashboardPreferenceSchema = insertUserDashboardPreferenceSchema.partial();

export type InsertUserDashboardPreference = z.infer<typeof insertUserDashboardPreferenceSchema>;
export type UserDashboardPreference = typeof userDashboardPreferences.$inferSelect;
export type WidgetDefinition = typeof widgetDefinitions[number];

// Widget configuration schemas
export const widgetConfigurationSchemas = {
  timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  showGrowth: z.boolean().default(true),
  chartType: z.enum(["line", "bar", "area"]).default("line"),
  metricType: z.enum(["revenue", "transactions", "merchants"]).default("revenue"),
  limit: z.number().min(1).max(50).default(10),
  statusFilter: z.enum(["all", "completed", "pending", "failed"]).default("all"),
  sortBy: z.enum(["revenue", "transactions", "name"]).default("revenue"),
  showDetails: z.boolean().default(true),
  actionList: z.array(z.string()).default(["add_merchant", "add_agent", "generate_report"]),
} as const;

export type WidgetConfiguration = {
  [K in keyof typeof widgetConfigurationSchemas]?: z.infer<typeof widgetConfigurationSchemas[K]>;
};