import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Activity } from "lucide-react";

export function SystemOverviewWidget(props: WidgetProps) {
  const refreshInterval = (props.preference.configuration?.refreshInterval || 60) * 1000;
  
  const { data: systemStatus, isLoading } = useQuery({
    queryKey: ['/api/admin/system-status'],
    enabled: props.preference.isVisible,
    refetchInterval: refreshInterval
  });

  const showAlerts = props.preference.configuration?.showAlerts !== false;
  const alertThreshold = props.preference.configuration?.alertThreshold || 10;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-3">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">System Health</span>
        </div>

        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium">Overall Status</div>
          </div>
          <div className="flex items-center space-x-2">
            {(() => {
              const StatusIcon = getStatusIcon(systemStatus?.overallStatus || 'healthy');
              return (
                <>
                  <StatusIcon className={`h-4 w-4 ${getStatusColor(systemStatus?.overallStatus || 'healthy')}`} />
                  <Badge variant={systemStatus?.overallStatus === 'healthy' ? 'secondary' : 'destructive'}>
                    {systemStatus?.overallStatus || 'Healthy'}
                  </Badge>
                </>
              );
            })()}
          </div>
        </div>

        {/* Service Status */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Services</div>
          {systemStatus?.services?.map((service: any, index: number) => {
            const StatusIcon = getStatusIcon(service.status);
            return (
              <div key={index} className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-2">
                  <StatusIcon className={`h-3 w-3 ${getStatusColor(service.status)}`} />
                  <span className="text-xs text-gray-600">{service.name}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {service.uptime}% uptime
                </div>
              </div>
            );
          }) || (
            <div className="text-xs text-gray-500">No service data available</div>
          )}
        </div>

        {/* Alerts */}
        {showAlerts && systemStatus?.alerts?.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Recent Alerts</div>
            <div className="space-y-1">
              {systemStatus.alerts.slice(0, alertThreshold).map((alert: any, index: number) => (
                <div key={index} className="flex items-center space-x-2 text-xs">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  <span className="text-gray-600 truncate">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-900">{systemStatus?.responseTime || '0'}ms</div>
            <div className="text-gray-600">Response Time</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-900">{systemStatus?.activeUsers || '0'}</div>
            <div className="text-gray-600">Active Users</div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}