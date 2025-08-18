import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Building2, CreditCard, Users } from "lucide-react";

export function QuickStatsWidget(props: WidgetProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard-metrics'],
    enabled: props.preference.isVisible
  });

  const stats = [
    {
      label: "Total Revenue",
      value: `$${metrics?.totalRevenue || '0'}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Active Merchants",
      value: metrics?.activeMerchants || '0',
      icon: Building2,
      color: "text-blue-600",
    },
    {
      label: "Transactions Today",
      value: metrics?.transactionsToday || '0',
      icon: CreditCard,
      color: "text-purple-600",
    },
    {
      label: "Active Agents",
      value: metrics?.activeAgents || '0',
      icon: Users,
      color: "text-orange-600",
    },
  ];

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gray-50`}>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </BaseWidget>
  );
}