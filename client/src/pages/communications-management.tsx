import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Mail, 
  MessageSquare, 
  Zap,
  Activity,
  TrendingUp,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Pencil
} from "lucide-react";

// Import existing action templates page as a component
import ActionTemplatesPage from "./action-templates";

// Triggers Management Component
function TriggersManagement() {
  const [editingTrigger, setEditingTrigger] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', isActive: true });
  const [createForm, setCreateForm] = useState({ 
    triggerKey: '', 
    name: '', 
    description: '', 
    category: 'system',
    isActive: true 
  });
  const { toast } = useToast();

  const { data: triggers, isLoading, error } = useQuery({
    queryKey: ['/api/admin/trigger-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/admin/trigger-catalog', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch triggers');
      return response.json();
    }
  });

  const { data: actionTemplates } = useQuery({
    queryKey: ['/api/action-templates'],
    queryFn: async () => {
      const response = await fetch('/api/action-templates', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch action templates');
      return response.json();
    }
  });

  const createTriggerMutation = useMutation({
    mutationFn: async (data: { triggerKey: string; name: string; description: string; category: string; isActive: boolean }) => {
      return apiRequest('POST', '/api/admin/trigger-catalog', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trigger-catalog'] });
      toast({
        title: "Trigger Created",
        description: "The new trigger has been successfully created."
      });
      setCreateDialogOpen(false);
      setCreateForm({ triggerKey: '', name: '', description: '', category: 'system', isActive: true });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateTriggerMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; description: string; isActive: boolean }) => {
      const { id, ...updateData } = data;
      return apiRequest('PUT', `/api/admin/trigger-catalog/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trigger-catalog'] });
      toast({
        title: "Trigger Updated",
        description: "The trigger has been successfully updated."
      });
      setEditingTrigger(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleEditClick = (trigger: any) => {
    setEditingTrigger(trigger);
    setEditForm({
      name: trigger.name,
      description: trigger.description,
      isActive: trigger.isActive
    });
  };

  const handleCreateTrigger = () => {
    createTriggerMutation.mutate(createForm);
  };

  const handleSaveEdit = () => {
    if (!editingTrigger) return;
    updateTriggerMutation.mutate({
      id: editingTrigger.id,
      ...editForm
    });
  };

  console.log('Triggers query state:', { triggers, isLoading, error });

  if (isLoading) {
    return <div className="p-8 text-center">Loading triggers...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error loading triggers: {(error as Error).message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trigger Catalog</h2>
          <p className="text-muted-foreground">
            Manage automated events that trigger communication actions
          </p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          data-testid="button-create-trigger"
        >
          <Zap className="w-4 h-4 mr-2" />
          Create Trigger
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {triggers && triggers.length > 0 ? (
          triggers.map((trigger: any) => (
            <Card key={trigger.id} data-testid={`card-trigger-${trigger.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{trigger.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {trigger.description}
                    </CardDescription>
                  </div>
                  <Badge variant={trigger.isActive ? "default" : "secondary"}>
                    {trigger.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Zap className="w-4 h-4 mr-2 text-muted-foreground" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {trigger.triggerKey}
                    </code>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>{trigger.actionCount || 0}</strong> action(s) linked
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleEditClick(trigger)}
                    data-testid={`button-edit-trigger-${trigger.id}`}
                  >
                    <Pencil className="w-3 h-3 mr-2" />
                    Edit Trigger
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No triggers found. Create one to get started.
          </div>
        )}
      </div>

      {/* Create Trigger Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Trigger</DialogTitle>
            <DialogDescription>
              Define a new trigger event for the system. This will be available for linking to action templates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-trigger-key">Trigger Key <span className="text-red-500">*</span></Label>
              <Input 
                id="new-trigger-key"
                value={createForm.triggerKey}
                onChange={(e) => setCreateForm({ ...createForm, triggerKey: e.target.value })}
                placeholder="e.g., user_login, order_completed"
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier used in code. Use snake_case format.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-trigger-name">Display Name <span className="text-red-500">*</span></Label>
              <Input 
                id="new-trigger-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., User Login Event"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-trigger-description">Description</Label>
              <Textarea 
                id="new-trigger-description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Describe when this trigger fires and what it's used for"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-trigger-category">Category</Label>
              <Select 
                value={createForm.category} 
                onValueChange={(value) => setCreateForm({ ...createForm, category: value })}
              >
                <SelectTrigger id="new-trigger-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-trigger-active">Active</Label>
                <div className="text-sm text-muted-foreground">
                  Enable this trigger immediately
                </div>
              </div>
              <Switch 
                id="new-trigger-active"
                checked={createForm.isActive}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTrigger}
              disabled={createTriggerMutation.isPending || !createForm.triggerKey || !createForm.name}
            >
              {createTriggerMutation.isPending ? 'Creating...' : 'Create Trigger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trigger Dialog */}
      <Dialog open={!!editingTrigger} onOpenChange={(open) => !open && setEditingTrigger(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trigger</DialogTitle>
            <DialogDescription>
              Update trigger details. The trigger key cannot be changed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trigger-key">Trigger Key (Read-only)</Label>
              <Input 
                id="trigger-key"
                value={editingTrigger?.triggerKey || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-name">Name</Label>
              <Input 
                id="trigger-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter trigger name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-description">Description</Label>
              <Textarea 
                id="trigger-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter trigger description"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trigger-active">Active Status</Label>
                <div className="text-sm text-muted-foreground">
                  Enable or disable this trigger
                </div>
              </div>
              <Switch 
                id="trigger-active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrigger(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateTriggerMutation.isPending}
            >
              {updateTriggerMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Activity & Analytics Component
function ActivityAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/action-activity/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/action-activity/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch activity stats');
      return response.json();
    }
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['/api/admin/action-activity/recent'],
    queryFn: async () => {
      const response = await fetch('/api/admin/action-activity/recent', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      return response.json();
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Communication Analytics</h2>
        <p className="text-muted-foreground">
          Monitor delivery, engagement, and performance metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground">
              All channels combined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.delivered || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.deliveryRate || 0}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.failureRate || 0}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest communication deliveries across all channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity?.length > 0 ? (
              recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    {activity.actionType === 'email' && <Mail className="w-4 h-4 text-blue-600" />}
                    {activity.actionType === 'sms' && <MessageSquare className="w-4 h-4 text-green-600" />}
                    {activity.actionType === 'notification' && <Activity className="w-4 h-4 text-purple-600" />}
                    <div>
                      <div className="font-medium">{activity.templateName}</div>
                      <div className="text-sm text-muted-foreground">
                        To: {activity.recipient}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      activity.status === 'sent' || activity.status === 'delivered' 
                        ? 'default' 
                        : activity.status === 'failed' 
                        ? 'destructive' 
                        : 'secondary'
                    }>
                      {activity.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(activity.executedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No activity yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Communications Management Page
export default function CommunicationsManagement() {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Communications Management</h1>
        <p className="text-muted-foreground">
          Unified hub for managing multi-channel communications: email, SMS, webhooks, notifications, and more
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Action Templates
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <TemplateCount />
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-channel templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Triggers
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <TriggerCount />
            </div>
            <p className="text-xs text-muted-foreground">
              Automated events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <MonthlyActivityCount />
            </div>
            <p className="text-xs text-muted-foreground">
              Communications sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <ActionTemplatesPage />
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <TriggersManagement />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components for Stats
function TemplateCount() {
  const { data } = useQuery({
    queryKey: ['/api/action-templates'],
    queryFn: async () => {
      const response = await fetch('/api/action-templates', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });
  return <span>{data?.length || 0}</span>;
}

function TriggerCount() {
  const { data } = useQuery({
    queryKey: ['/api/admin/trigger-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/admin/trigger-catalog', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch triggers');
      return response.json();
    }
  });
  return <span>{data?.filter((t: any) => t.isActive)?.length || 0}</span>;
}

function MonthlyActivityCount() {
  const { data } = useQuery({
    queryKey: ['/api/admin/action-activity/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/action-activity/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });
  return <span>{data?.totalSent || 0}</span>;
}
