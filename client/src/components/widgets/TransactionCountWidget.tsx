import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, TrendingUp } from "lucide-react";

export function TransactionCountWidget(props: WidgetProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard-metrics'],
    enabled: props.preference.isVisible
  });

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-gray-600">Transactions Today</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {metrics?.transactionsToday || 0}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.1% vs yesterday
            </div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}