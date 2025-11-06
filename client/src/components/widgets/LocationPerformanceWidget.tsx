import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { MapPin, TrendingUp, TrendingDown } from "lucide-react";

export function LocationPerformanceWidget(props: WidgetProps) {
  const { data: locations, isLoading } = useQuery({
    queryKey: ['/api/analytics/location-performance'],
    enabled: props.preference.isVisible
  });

  const maxLocations = props.preference.configuration?.maxLocations || 5;
  const sortBy = props.preference.configuration?.sortBy || 'revenue';
  const showTrends = props.preference.configuration?.showTrends !== false;

  const topLocations = locations?.slice(0, maxLocations) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return TrendingUp;
    if (trend < 0) return TrendingDown;
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Top Locations</span>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {topLocations.length > 0 ? (
            topLocations.map((location: any, index: number) => {
              const TrendIcon = getTrendIcon(location.trend);
              return (
                <div key={location.id} className="flex items-center justify-between p-2 rounded-lg border bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {location.name}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {location.merchantName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="text-sm font-medium text-gray-900">
                      {sortBy === 'revenue' ? formatCurrency(location.revenue) : location.transactions}
                    </div>
                    {showTrends && TrendIcon && (
                      <div className={`flex items-center text-xs ${getTrendColor(location.trend)}`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        {Math.abs(location.trend)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No location data available
            </p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {formatCurrency(locations?.reduce((sum: number, loc: any) => sum + loc.revenue, 0) || 0)}
            </div>
            <div className="text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {locations?.reduce((sum: number, loc: any) => sum + loc.transactions, 0) || 0}
            </div>
            <div className="text-gray-600">Total Transactions</div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}