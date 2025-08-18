import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

export function CommissionTrackingWidget(props: WidgetProps) {
  const { data: commissionData, isLoading } = useQuery({
    queryKey: ['/api/agents/commission-tracking'],
    enabled: props.preference.isVisible
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-3">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">Commission Summary</span>
        </div>

        {/* Current Month */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-green-50">
            <div className="text-lg font-bold text-green-700">
              {formatCurrency((commissionData as any)?.currentMonth || 0)}
            </div>
            <div className="text-xs text-green-600">This Month</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50">
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency((commissionData as any)?.lastMonth || 0)}
            </div>
            <div className="text-xs text-blue-600">Last Month</div>
          </div>
        </div>

        {/* Growth Indicator */}
        <div className="flex items-center justify-center space-x-2 p-2 bg-gray-50 rounded-lg">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-900">
            {(((commissionData as any)?.currentMonth || 0) - ((commissionData as any)?.lastMonth || 0) >= 0) ? '+' : ''}
            {(((commissionData as any)?.currentMonth || 0) - ((commissionData as any)?.lastMonth || 0) / ((commissionData as any)?.lastMonth || 1) * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-600">vs last month</span>
        </div>

        {/* Recent Commissions */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Recent Earnings</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {(commissionData as any)?.recentCommissions?.map((commission: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">{commission.merchantName}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(commission.amount)}
                </span>
              </div>
            )) || (
              <p className="text-xs text-gray-500 text-center py-2">
                No recent commissions
              </p>
            )}
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}