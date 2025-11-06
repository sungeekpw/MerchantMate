import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  MessageSquare, 
  Zap,
  Activity,
  TrendingUp,
  Send,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

// Import existing action templates page as a component
import ActionTemplatesPage from "./action-templates";

// Triggers Management Component
function TriggersManagement() {
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
        <Button data-testid="button-create-trigger">
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
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Zap className="w-4 h-4 mr-2 text-muted-foreground" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {trigger.triggerKey}
                    </code>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>{trigger.actionCount || 0}</strong> action(s) linked
                  </div>
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
