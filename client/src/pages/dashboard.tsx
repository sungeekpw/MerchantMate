import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, DollarSign, Store, Receipt, Users, TrendingUp, Eye } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { useState } from "react";
import { MerchantModal } from "@/components/modals/merchant-modal";
import { AgentModal } from "@/components/modals/agent-modal";

export default function Dashboard() {
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
    queryFn: () => analyticsApi.getDashboardMetrics(),
    refetchInterval: 30000,
  });

  const { data: topMerchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/analytics/top-merchants"],
    queryFn: () => analyticsApi.getTopMerchants(),
  });

  const { data: recentTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/analytics/recent-transactions"],
    queryFn: () => analyticsApi.getRecentTransactions(5),
    refetchInterval: 30000,
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: "paycrm-status-completed",
      pending: "paycrm-status-pending",
      failed: "paycrm-status-failed",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="paycrm-metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(metrics?.totalRevenue || "0")}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 text-sm font-medium">+12.5%</span>
              <span className="text-gray-500 text-sm ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="paycrm-metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Merchants</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.activeMerchants || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 text-sm font-medium">+3.2%</span>
              <span className="text-gray-500 text-sm ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="paycrm-metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Transactions Today</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.transactionsToday || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 text-sm font-medium">+8.1%</span>
              <span className="text-gray-500 text-sm ml-1">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="paycrm-metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Agents</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.activeAgents || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 text-sm font-medium">+1.4%</span>
              <span className="text-gray-500 text-sm ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card className="paycrm-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="paycrm-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Merchant</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td><Skeleton className="h-4 w-20" /></td>
                          <td><Skeleton className="h-4 w-24" /></td>
                          <td><Skeleton className="h-4 w-16" /></td>
                          <td><Skeleton className="h-4 w-16" /></td>
                          <td><Skeleton className="h-4 w-16" /></td>
                        </tr>
                      ))
                    ) : recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      recentTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="font-mono text-sm">{transaction.transactionId}</td>
                          <td>{transaction.merchant?.businessName || "Unknown"}</td>
                          <td className="font-semibold">{formatCurrency(transaction.amount)}</td>
                          <td>
                            <Badge className={`paycrm-status-badge ${getStatusBadge(transaction.status)}`}>
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="text-gray-500 text-sm">
                            {formatRelativeTime(new Date(transaction.createdAt!))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="paycrm-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                onClick={() => setIsMerchantModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Merchant
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setIsAgentModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          {/* Top Merchants */}
          <Card className="paycrm-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Top Merchants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {merchantsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : topMerchants.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No merchants found</p>
              ) : (
                topMerchants.map((merchant) => (
                  <div key={merchant.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{merchant.businessName}</p>
                        <p className="text-sm text-gray-500">{merchant.transactionCount} transactions</p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(merchant.totalVolume)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="paycrm-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Gateway</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                  Online
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                  Healthy
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Response</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                  Fast (24ms)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <MerchantModal
        isOpen={isMerchantModalOpen}
        onClose={() => setIsMerchantModalOpen(false)}
      />
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
      />
    </div>
  );
}
