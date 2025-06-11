import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings, Layout } from "lucide-react";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  WIDGET_TYPES, 
  WIDGET_SIZES, 
  getAvailableWidgets, 
  getDefaultLayout,
  type WidgetType, 
  type WidgetSize 
} from "@shared/widget-schema";
import type { UserDashboardPreference, InsertUserDashboardPreference } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<WidgetType | "">("");
  const [selectedSize, setSelectedSize] = useState<WidgetSize>("medium");

  // Fetch user's dashboard widgets
  const { data: widgets = [], isLoading } = useQuery<UserDashboardPreference[]>({
    queryKey: ["/api/dashboard/widgets"],
    enabled: !!user,
  });

  // Initialize default dashboard for new users
  const initializeDashboard = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dashboard/initialize", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/widgets"] });
      toast({
        title: "Dashboard initialized",
        description: "Default widgets have been added to your dashboard.",
      });
    },
  });

  // Add new widget mutation
  const addWidget = useMutation({
    mutationFn: (data: InsertUserDashboardPreference) => 
      apiRequest("POST", "/api/dashboard/widgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/widgets"] });
      setShowAddWidget(false);
      setSelectedWidget("");
      setSelectedSize("medium");
      toast({
        title: "Widget added",
        description: "New widget has been added to your dashboard.",
      });
    },
  });

  // Update widget mutation
  const updateWidget = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<UserDashboardPreference> }) =>
      apiRequest("PATCH", `/api/dashboard/widgets/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/widgets"] });
      toast({
        title: "Widget updated",
        description: "Widget settings have been saved.",
      });
    },
  });

  // Remove widget mutation
  const removeWidget = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/dashboard/widgets/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/widgets"] });
      toast({
        title: "Widget removed",
        description: "Widget has been removed from your dashboard.",
      });
    },
  });

  const handleAddWidget = () => {
    if (!selectedWidget || !user) return;

    const maxPosition = widgets.length > 0 ? Math.max(...widgets.map(w => w.position)) : -1;
    
    addWidget.mutate({
      userId: user.id,
      widgetId: selectedWidget,
      position: maxPosition + 1,
      size: selectedSize,
      isVisible: true,
      configuration: {},
    });
  };

  const handleConfigureWidget = (widgetId: string) => {
    // This would open a configuration dialog for the specific widget
    toast({
      title: "Widget Configuration",
      description: "Widget configuration panel would open here.",
    });
  };

  const handleRemoveWidget = (widgetId: string) => {
    const widget = widgets.find(w => w.widgetId === widgetId);
    if (widget) {
      removeWidget.mutate(widget.id);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your dashboard</h1>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading dashboard...</h1>
        </div>
      </div>
    );
  }

  // Show initialization option for users with no widgets
  if (widgets.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to your Dashboard</h1>
            <p className="text-muted-foreground">
              Get started by adding widgets to customize your experience
            </p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Quick Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We can set up a default dashboard with widgets relevant to your role as a {user.role}.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => initializeDashboard.mutate()}
                  disabled={initializeDashboard.isPending}
                  className="flex-1"
                >
                  {initializeDashboard.isPending ? "Setting up..." : "Initialize Dashboard"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddWidget(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const availableWidgets = getAvailableWidgets(user.role);
  const usedWidgets = widgets.map(w => w.widgetId);
  const availableToAdd = availableWidgets.filter(w => !usedWidgets.includes(w));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.firstName || user.username}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </Button>
          {availableToAdd.length > 0 && (
            <Button size="sm" onClick={() => setShowAddWidget(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-4 gap-4 auto-rows-min">
        {widgets
          .sort((a, b) => a.position - b.position)
          .map((widget) => (
            <DashboardWidget
              key={widget.id}
              widget={widget}
              onConfigure={handleConfigureWidget}
              onRemove={handleRemoveWidget}
            />
          ))}
      </div>

      {/* Add Widget Dialog */}
      <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Widget Type</label>
              <Select value={selectedWidget} onValueChange={(value) => setSelectedWidget(value as WidgetType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a widget type" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((widgetType) => (
                    <SelectItem key={widgetType} value={widgetType}>
                      {widgetType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Size</label>
              <Select value={selectedSize} onValueChange={(value) => setSelectedSize(value as WidgetSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(WIDGET_SIZES).map((size) => (
                    <SelectItem key={size} value={size}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleAddWidget} 
                disabled={!selectedWidget || addWidget.isPending}
                className="flex-1"
              >
                {addWidget.isPending ? "Adding..." : "Add Widget"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddWidget(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}