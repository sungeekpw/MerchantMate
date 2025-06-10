import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { hasRole } from "@/lib/authUtils";

// Widget imports
import { RevenueMetricsWidget } from "./widgets/RevenueMetricsWidget";
import { MerchantCountWidget } from "./widgets/MerchantCountWidget";
import { TransactionCountWidget } from "./widgets/TransactionCountWidget";
import { RecentTransactionsWidget } from "./widgets/RecentTransactionsWidget";
import { MyMerchantProfileWidget } from "./widgets/MyMerchantProfileWidget";
import { WIDGET_DEFINITIONS, WidgetDefinition, UserWidgetPreference } from "./widgets/widget-types";
import { User } from "@shared/schema";

// Widget component registry
const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  revenue_metrics: RevenueMetricsWidget,
  merchant_count: MerchantCountWidget,
  transaction_count: TransactionCountWidget,
  recent_transactions: RecentTransactionsWidget,
  my_merchant_profile: MyMerchantProfileWidget,
};

export function PersonalizedDashboard() {
  const { user } = useAuth();
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Get available widgets for current user role
  const availableWidgets = useMemo(() => {
    if (!user) return [];
    return WIDGET_DEFINITIONS.filter(widget => 
      hasRole(user, widget.allowedRoles)
    );
  }, [user]);

  // Fetch user's widget preferences
  const { data: preferences = [], isLoading } = useQuery<UserWidgetPreference[]>({
    queryKey: ['/api/widgets/preferences'],
    enabled: !!user?.id
  });

  // Create default preferences for widgets not yet configured
  const widgetPreferences = useMemo(() => {
    const prefs: UserWidgetPreference[] = [];
    
    availableWidgets.forEach((widget, index) => {
      const existing = preferences.find((p: UserWidgetPreference) => p.widgetId === widget.id);
      if (existing) {
        prefs.push(existing);
      } else {
        // Create default preference
        prefs.push({
          userId: user?.id || '',
          widgetId: widget.id,
          position: index,
          size: widget.defaultSize,
          isVisible: true,
          configuration: {}
        });
      }
    });

    return prefs.sort((a, b) => a.position - b.position);
  }, [availableWidgets, preferences, user?.id]);

  // Mutations for updating preferences
  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id?: number; updates: Partial<UserWidgetPreference> }) => {
      if (id) {
        return await apiRequest('PATCH', `/api/widgets/preferences/${id}`, updates);
      } else {
        return await apiRequest('POST', '/api/widgets/preferences', { ...updates, userId: user?.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets/preferences'] });
    }
  });

  const handleConfigChange = (widgetId: string, config: Record<string, any>) => {
    const preference = widgetPreferences.find(p => p.widgetId === widgetId);
    updatePreferenceMutation.mutate({
      id: preference?.id,
      updates: { configuration: { ...preference?.configuration, ...config } }
    });
  };

  const handleSizeChange = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    const preference = widgetPreferences.find(p => p.widgetId === widgetId);
    updatePreferenceMutation.mutate({
      id: preference?.id,
      updates: { size }
    });
  };

  const handleVisibilityChange = (widgetId: string, isVisible: boolean) => {
    const preference = widgetPreferences.find(p => p.widgetId === widgetId);
    updatePreferenceMutation.mutate({
      id: preference?.id,
      updates: { isVisible }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Loading your personalized dashboard...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.username}</p>
        </div>
        <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Customize Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customize Your Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availableWidgets.map(widget => {
                const preference = widgetPreferences.find(p => p.widgetId === widget.id);
                return (
                  <div key={widget.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={preference?.isVisible ?? true}
                        onCheckedChange={(checked) => 
                          handleVisibilityChange(widget.id, !!checked)
                        }
                      />
                      <div>
                        <h3 className="font-medium">{widget.name}</h3>
                        <p className="text-sm text-gray-600">{widget.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={preference?.size || widget.defaultSize}
                        onValueChange={(size: 'small' | 'medium' | 'large') =>
                          handleSizeChange(widget.id, size)
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
        {widgetPreferences
          .filter(pref => pref.isVisible)
          .map(preference => {
            const definition = WIDGET_DEFINITIONS.find(w => w.id === preference.widgetId);
            const WidgetComponent = WIDGET_COMPONENTS[preference.widgetId];
            
            if (!definition || !WidgetComponent) return null;

            return (
              <WidgetComponent
                key={preference.widgetId}
                definition={definition}
                preference={preference}
                onConfigChange={(config: Record<string, any>) => 
                  handleConfigChange(preference.widgetId, config)
                }
                onSizeChange={(size: 'small' | 'medium' | 'large') => 
                  handleSizeChange(preference.widgetId, size)
                }
                onVisibilityChange={(visible: boolean) => 
                  handleVisibilityChange(preference.widgetId, visible)
                }
              />
            );
          })}
      </div>

      {/* Empty State */}
      {widgetPreferences.filter(p => p.isVisible).length === 0 && (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets configured</h3>
          <p className="text-gray-600 mb-4">Add widgets to personalize your dashboard</p>
          <Button onClick={() => setIsCustomizing(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Customize Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}