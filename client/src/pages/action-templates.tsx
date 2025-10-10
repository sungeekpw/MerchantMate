import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Mail, 
  MessageSquare, 
  Webhook, 
  Bell, 
  MessageCircle,
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  ExternalLink
} from "lucide-react";

type ActionType = 'email' | 'sms' | 'webhook' | 'notification' | 'slack' | 'teams';
type Category = 'authentication' | 'application' | 'notification' | 'alert' | 'all';

interface ActionTemplate {
  id: number;
  name: string;
  description: string | null;
  actionType: ActionType;
  category: string;
  config: any;
  variables: any;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateUsage {
  triggerId: number;
  triggerName: string;
  triggerKey: string;
  isActive: boolean;
}

const actionTypeIcons: Record<ActionType, any> = {
  email: Mail,
  sms: MessageSquare,
  webhook: Webhook,
  notification: Bell,
  slack: MessageCircle,
  teams: Users,
};

const actionTypeColors: Record<ActionType, string> = {
  email: "bg-blue-500",
  sms: "bg-green-500",
  webhook: "bg-purple-500",
  notification: "bg-orange-500",
  slack: "bg-pink-500",
  teams: "bg-indigo-500",
};

const categoryColors: Record<string, string> = {
  authentication: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  application: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  notification: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  alert: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function ActionTemplates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ActionType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  // Fetch all action templates
  const { data: templates = [], isLoading } = useQuery<ActionTemplate[]>({
    queryKey: ['/api/action-templates'],
  });

  // Fetch template usage data
  const { data: usageData = {} } = useQuery<Record<number, TemplateUsage[]>>({
    queryKey: ['/api/action-templates/usage'],
  });

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || template.actionType === selectedType;
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  // Group templates by action type
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.actionType]) {
      acc[template.actionType] = [];
    }
    acc[template.actionType].push(template);
    return acc;
  }, {} as Record<ActionType, ActionTemplate[]>);

  const getTemplateStats = () => {
    const stats = {
      total: templates.length,
      active: templates.filter(t => t.isActive).length,
      byType: {} as Record<ActionType, number>,
    };

    templates.forEach(t => {
      stats.byType[t.actionType] = (stats.byType[t.actionType] || 0) + 1;
    });

    return stats;
  };

  const stats = getTemplateStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Action Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage reusable action templates for triggers
          </p>
        </div>
        <Button data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Templates</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-total-templates">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Templates</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-active-templates">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Action Types</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-action-types">{Object.keys(stats.byType).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Use</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-templates-in-use">
              {Object.values(usageData).filter(u => u.length > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-templates"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ActionType | 'all')}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="select-action-type">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as Category)}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedType !== 'all' || selectedCategory !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create your first action template to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([type, typeTemplates]) => {
            const Icon = actionTypeIcons[type as ActionType];
            const color = actionTypeColors[type as ActionType];

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`${color} p-2 rounded-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold capitalize">{type} Templates</h2>
                  <Badge variant="secondary">{typeTemplates.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeTemplates.map((template) => {
                    const usage = usageData[template.id] || [];
                    const isInUse = usage.length > 0;

                    return (
                      <Card 
                        key={template.id} 
                        className="hover:shadow-lg transition-shadow"
                        data-testid={`card-template-${template.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {template.name}
                                {!template.isActive && (
                                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1 line-clamp-2">
                                {template.description || 'No description'}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={categoryColors[template.category] || ''}>
                              {template.category}
                            </Badge>
                            <Badge variant="outline">v{template.version}</Badge>
                            {isInUse && (
                              <Badge variant="secondary" className="gap-1">
                                <ExternalLink className="h-3 w-3" />
                                {usage.length} trigger{usage.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>

                          {template.variables && Object.keys(template.variables).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Variables: {Object.keys(template.variables).join(', ')}
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-duplicate-${template.id}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
