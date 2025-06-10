import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign } from "lucide-react";

export function RevenueMetricsWidget(props: WidgetProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard-metrics'],
    enabled: props.preference.isVisible
  });

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">Total Revenue</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${metrics?.totalRevenue || '0'}
            </div>
            {props.preference.configuration?.showGrowth !== false && (
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.3% vs last month
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}