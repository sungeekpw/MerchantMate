import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Building, Mail, Phone, MapPin } from "lucide-react";

export function MyMerchantProfileWidget(props: WidgetProps) {
  const { user } = useAuth();
  
  const { data: merchant, isLoading } = useQuery({
    queryKey: ['/api/merchants/profile'],
    enabled: props.preference.isVisible && user?.role === 'merchant'
  });

  if (!merchant) {
    return (
      <BaseWidget {...props} isLoading={isLoading}>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No merchant profile found</p>
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Building className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{merchant.businessName}</h3>
            <p className="text-sm text-gray-600">{merchant.businessType}</p>
          </div>
        </div>

        {props.preference.configuration?.showDetails !== false && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{merchant.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{merchant.phone}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{merchant.address}</span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${
              merchant.status === 'active' ? 'text-green-600' : 'text-red-600'
            }`}>
              {merchant.status}
            </span>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}