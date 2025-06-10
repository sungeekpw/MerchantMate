import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export function RecentTransactionsWidget(props: WidgetProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions/recent'],
    enabled: props.preference.isVisible
  });

  const limit = props.preference.configuration?.limit || 5;
  const statusFilter = props.preference.configuration?.statusFilter || 'all';

  const filteredTransactions = transactions?.slice(0, limit).filter((tx: any) => 
    statusFilter === 'all' || tx.status === statusFilter
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-3">
          <Activity className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Recent Activity</span>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between p-2 rounded-lg border bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {transaction.merchant?.businessName || 'Unknown Merchant'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {transaction.transactionId}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    ${transaction.amount}
                  </span>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent transactions
            </p>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}