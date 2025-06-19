import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Settings, DollarSign, MoreHorizontal, Eye, Edit, Trash2, ExternalLink, Users, TrendingUp, FileText, AlertCircle, CheckCircle2, Link, Copy, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Core interfaces for Campaign Management
interface Campaign {
  id: number;
  name: string;
  description?: string;
  acquirer: string;
  pricingType: {
    id: number;
    name: string;
  };
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  createdByUser?: {
    name: string;
    email: string;
  };
  assignedMerchants?: number;
  totalRevenue?: number;
  feeValues?: CampaignFeeValue[];
}

interface PricingType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  feeItems?: PricingTypeFeeItem[];
}

interface FeeGroup {
  id: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  feeItems?: FeeItem[];
}

interface FeeGroupWithItems extends FeeGroup {
  feeItems: FeeItem[];
}

interface FeeItemGroup {
  id: number;
  feeGroupId: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

interface FeeItemGroupWithItems extends FeeItemGroup {
  feeItems: FeeItem[];
}

interface CreateFeeItemGroupData {
  feeGroupId: number;
  name: string;
  description?: string;
  displayOrder: number;
}

interface FeeItem {
  id: number;
  name: string;
  description?: string;
  feeGroupId: number;
  defaultValue?: string;
  valueType: 'percentage' | 'fixed' | 'basis_points';
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  feeGroup?: FeeGroup;
}

interface PricingTypeFeeItem {
  id: number;
  pricingTypeId: number;
  feeItemId: number;
  isRequired: boolean;
  displayOrder: number;
  createdAt: string;
  feeItem?: FeeItem;
}

interface CampaignFeeValue {
  id: number;
  campaignId: number;
  feeItemId: number;
  value: string;
  valueType: 'percentage' | 'fixed' | 'basis_points';
  createdAt: string;
  updatedAt: string;
  feeItem?: FeeItem & { feeGroup: FeeGroup };
}

// Form interfaces for creation/editing
interface CreateFeeGroupData {
  name: string;
  description?: string;
  displayOrder: number;
}

interface CreateFeeItemData {
  name: string;
  description?: string;
  feeGroupId: number;
  defaultValue?: string;
  valueType: 'percentage' | 'fixed' | 'basis_points';
  isRequired: boolean;
  displayOrder: number;
}

interface CreatePricingTypeData {
  name: string;
  description?: string;
  feeItemIds: number[];
}

interface CreateCampaignData {
  name: string;
  description?: string;
  acquirer: 'Esquire' | 'Merrick' | 'Wells Fargo';
  pricingTypeId: number;
  isDefault?: boolean;
  feeValues: {
    feeItemId: number;
    value: string;
    valueType: 'percentage' | 'fixed' | 'basis_points';
  }[];
}

export default function CampaignsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAcquirer, setSelectedAcquirer] = useState<string>('all');
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [showAddFeeGroup, setShowAddFeeGroup] = useState(false);
  const [showAddFeeItem, setShowAddFeeItem] = useState(false);
  const [showAddPricingType, setShowAddPricingType] = useState(false);
  const [selectedFeeGroup, setSelectedFeeGroup] = useState<number | null>(null);

  // Fee Group form state
  const [feeGroupForm, setFeeGroupForm] = useState({
    name: '',
    description: '',
    displayOrder: 1
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  // Fetch pricing types for campaign creation
  const { data: pricingTypes = [] } = useQuery<PricingType[]>({
    queryKey: ['/api/pricing-types'],
  });

  // Fetch fee groups
  const { data: feeGroups = [], isLoading: feeGroupsLoading, error: feeGroupsError } = useQuery<FeeGroupWithItems[]>({
    queryKey: ['/api/fee-groups'],
    queryFn: async () => {
      const response = await fetch('/api/fee-groups', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  });



  // Fetch fee item groups
  const { data: feeItemGroups = [], isLoading: feeItemGroupsLoading } = useQuery<FeeItemGroup[]>({
    queryKey: ['/api/fee-item-groups'],
    queryFn: async () => {
      const response = await fetch('/api/fee-item-groups', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  });

  // Fetch fee items
  const { data: feeItems = [], isLoading: feeItemsLoading } = useQuery<FeeItem[]>({
    queryKey: ['/api/fee-items'],
  });

  // Filter campaigns based on search and acquirer
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.id.toString().includes(searchQuery);
    const matchesAcquirer = selectedAcquirer === 'all' || campaign.acquirer === selectedAcquirer;
    return matchesSearch && matchesAcquirer;
  });

  // Create Fee Group mutation
  const createFeeGroupMutation = useMutation({
    mutationFn: async (feeGroupData: CreateFeeGroupData) => {
      const response = await fetch('/api/fee-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feeGroupData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create fee group');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fee-groups'] });
      setShowAddFeeGroup(false);
      setFeeGroupForm({ name: '', description: '', displayOrder: 1 });
      toast({
        title: "Fee Group Created",
        description: "The fee group has been successfully created.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create fee group.";
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        errorMessage = "A fee group with this name already exists. Please choose a different name.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Deactivate campaign mutation
  const deactivateCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const response = await fetch(`/api/campaigns/${campaignId}/deactivate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to deactivate campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Campaign Deactivated",
        description: "The campaign has been successfully deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate campaign.",
        variant: "destructive",
      });
    },
  });

  // Handle fee group form submission
  const handleCreateFeeGroup = () => {
    if (!feeGroupForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Fee group name is required.",
        variant: "destructive",
      });
      return;
    }

    createFeeGroupMutation.mutate({
      name: feeGroupForm.name.trim(),
      description: feeGroupForm.description.trim() || undefined,
      displayOrder: feeGroupForm.displayOrder || 1,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Main Tabs Interface */}
      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="pricing-types" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Pricing Types
          </TabsTrigger>
          <TabsTrigger value="fee-groups" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Fee Groups
          </TabsTrigger>
          <TabsTrigger value="fee-item-groups" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Fee Item Groups
          </TabsTrigger>
          <TabsTrigger value="fee-items" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Fee Items
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedAcquirer} onValueChange={setSelectedAcquirer}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Acquirer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Acquirers</SelectItem>
                  <SelectItem value="Esquire">Esquire</SelectItem>
                  <SelectItem value="Merrick">Merrick</SelectItem>
                  <SelectItem value="Wells Fargo">Wells Fargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowAddCampaign(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Campaign
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    {campaigns.length === 0 ? 'No campaigns found' : 'No campaigns match your search criteria'}
                  </div>
                  {campaigns.length === 0 && (
                    <Button onClick={() => setShowAddCampaign(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Campaign
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Pricing Type</TableHead>
                      <TableHead>Acquirer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <button 
                            className="font-medium text-primary hover:underline"
                            onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                          >
                            {campaign.id}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {campaign.description || '—'}
                        </TableCell>
                        <TableCell>{campaign.pricingType.name}</TableCell>
                        <TableCell>{campaign.acquirer}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Badge variant={campaign.isActive ? "default" : "secondary"}>
                              {campaign.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {campaign.isDefault && (
                              <Badge variant="outline">Default</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.location.href = `/campaigns/${campaign.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.location.href = `/campaigns/${campaign.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/merchant-application?campaign=${campaign.id}`, '_blank')}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Application Form
                              </DropdownMenuItem>
                              {campaign.isActive && (
                                <DropdownMenuItem 
                                  onClick={() => deactivateCampaignMutation.mutate(campaign.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Groups Tab */}
        <TabsContent value="fee-groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search fee groups..."
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddFeeGroup(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Group
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {feeGroupsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading fee groups...</div>
              ) : feeGroups.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">No fee groups found</div>
                  <Button onClick={() => setShowAddFeeGroup(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Fee Group
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Display Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fee Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.description || '—'}</TableCell>
                        <TableCell>{group.displayOrder}</TableCell>
                        <TableCell>
                          <Badge variant={group.isActive ? "default" : "secondary"}>
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{group.feeItems?.length || 0} items</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Items Tab */}
        <TabsContent value="fee-items" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search fee items..."
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddFeeItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Item
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {feeItemsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading fee items...</div>
              ) : feeItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">No fee items found</div>
                  <Button onClick={() => setShowAddFeeItem(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Fee Item
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Fee Group</TableHead>
                      <TableHead>Default Value</TableHead>
                      <TableHead>Value Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.feeGroup?.name || '—'}</TableCell>
                        <TableCell>
                          {item.defaultValue ? `${item.defaultValue}${item.valueType === 'percentage' ? '%' : item.valueType === 'fixed' ? ' USD' : ' bps'}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.valueType === 'percentage' ? 'Percentage' : 
                             item.valueType === 'fixed' ? 'Fixed Amount' : 'Basis Points'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isRequired ? "default" : "secondary"}>
                            {item.isRequired ? "Required" : "Optional"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Types Tab */}
        <TabsContent value="pricing-types" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search pricing types..."
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddPricingType(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pricing Type
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {pricingTypes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">No pricing types found</div>
                  <Button onClick={() => setShowAddPricingType(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Pricing Type
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Associated Fee Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>{type.description || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={type.isActive ? "default" : "secondary"}>
                            {type.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{type.feeItems?.length || 0} items</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Type
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Campaign Dialog */}
      <Dialog open={showAddCampaign} onOpenChange={setShowAddCampaign}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Campaign</DialogTitle>
            <DialogDescription>
              Create a new pricing campaign for merchant applications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name *</Label>
              <Input placeholder="Enter campaign name" maxLength={50} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Enter description (optional)" maxLength={300} />
            </div>
            <div>
              <Label>Pricing Type *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing type" />
                </SelectTrigger>
                <SelectContent>
                  {pricingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Acquirer *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select acquirer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Esquire">Esquire</SelectItem>
                  <SelectItem value="Merrick">Merrick</SelectItem>
                  <SelectItem value="Wells Fargo">Wells Fargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCampaign(false)}>
              Cancel
            </Button>
            <Button>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fee Group Dialog */}
      <Dialog open={showAddFeeGroup} onOpenChange={setShowAddFeeGroup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Fee Group</DialogTitle>
            <DialogDescription>
              Create a new fee group to organize related fee items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name *</Label>
              <Input 
                placeholder="Enter fee group name" 
                value={feeGroupForm.name}
                onChange={(e) => setFeeGroupForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                placeholder="Enter description (optional)" 
                value={feeGroupForm.description}
                onChange={(e) => setFeeGroupForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input 
                type="number" 
                placeholder="1" 
                min="1" 
                value={feeGroupForm.displayOrder}
                onChange={(e) => setFeeGroupForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFeeGroup(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFeeGroup}
              disabled={createFeeGroupMutation.isPending}
            >
              {createFeeGroupMutation.isPending ? 'Creating...' : 'Create Fee Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fee Item Dialog */}
      <Dialog open={showAddFeeItem} onOpenChange={setShowAddFeeItem}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Fee Item</DialogTitle>
            <DialogDescription>
              Create a new fee item within a fee group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fee Item Name *</Label>
              <Input placeholder="Enter fee item name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Enter description (optional)" />
            </div>
            <div>
              <Label>Fee Group *</Label>
              <Select value={selectedFeeGroup?.toString()} onValueChange={(value) => setSelectedFeeGroup(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee group" />
                </SelectTrigger>
                <SelectContent>
                  {feeGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Value</Label>
              <Input placeholder="Enter default value (optional)" />
            </div>
            <div>
              <Label>Value Type *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select value type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  <SelectItem value="basis_points">Basis Points (bps)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="required" />
              <Label htmlFor="required">Required for campaigns</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFeeItem(false)}>
              Cancel
            </Button>
            <Button>Create Fee Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Pricing Type Dialog */}
      <Dialog open={showAddPricingType} onOpenChange={setShowAddPricingType}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Pricing Type</DialogTitle>
            <DialogDescription>
              Create a new pricing type with associated fee items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pricing Type Name *</Label>
              <Input placeholder="Enter pricing type name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Enter description (optional)" />
            </div>
            <div>
              <Label>Associated Fee Items</Label>
              <div className="text-sm text-muted-foreground mb-2">
                Select fee items that will be available for this pricing type
              </div>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {feeItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2 py-1">
                    <input type="checkbox" id={`fee-${item.id}`} className="rounded" />
                    <Label htmlFor={`fee-${item.id}`} className="text-sm">
                      {item.name} ({item.feeGroup?.name})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPricingType(false)}>
              Cancel
            </Button>
            <Button>Create Pricing Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}