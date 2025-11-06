import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";

export function AssignedMerchantsWidget(props: WidgetProps) {
  const { data: merchants, isLoading } = useQuery({
    queryKey: ['/api/agents/my-merchants'],
    enabled: props.preference.isVisible
  });

  const maxMerchants = props.preference.configuration?.maxMerchants || 5;
  const sortBy = props.preference.configuration?.sortBy || 'revenue';
  const showInactive = props.preference.configuration?.showInactive || false;

  const filteredMerchants = merchants?.filter((merchant: any) => 
    showInactive || merchant.status === 'active'
  ).slice(0, maxMerchants) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-3">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">My Merchants</span>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredMerchants.length > 0 ? (
            filteredMerchants.map((merchant: any) => (
              <div key={merchant.id} className="flex items-center justify-between p-2 rounded-lg border bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {merchant.businessName}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {merchant.businessType}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge className={getStatusColor(merchant.status)}>
                    {merchant.status}
                  </Badge>
                  <span className="text-xs text-gray-600">
                    ${merchant.monthlyVolume || '0'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No assigned merchants
            </p>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}