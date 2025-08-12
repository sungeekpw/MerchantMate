import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
import { EnhancedCampaignDialog } from '@/components/campaigns/enhanced-campaign-dialog';

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

interface FeeItemWithGroup extends FeeItem {
  feeGroup: FeeGroup;
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
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAcquirer, setSelectedAcquirer] = useState<string>('all');
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [showAddFeeGroup, setShowAddFeeGroup] = useState(false);
  const [showEditFeeGroup, setShowEditFeeGroup] = useState(false);
  const [editFeeGroupId, setEditFeeGroupId] = useState<number | null>(null);
  const [showAddFeeItem, setShowAddFeeItem] = useState(false);
  const [showEditFeeItem, setShowEditFeeItem] = useState(false);
  const [editFeeItemId, setEditFeeItemId] = useState<number | null>(null);
  const [showAddPricingType, setShowAddPricingType] = useState(false);
  const [selectedFeeGroup, setSelectedFeeGroup] = useState<number | null>(null);
  const [editCampaignId, setEditCampaignId] = useState<number | null>(null);
  const [editCampaignData, setEditCampaignData] = useState<Campaign | null>(null);

  // Check if we're in edit mode or view mode
  const isEditMode = location.includes('/edit');
  const isViewMode = location.match(/^\/campaigns\/\d+$/) && !isEditMode; // /campaigns/9 but not /campaigns/9/edit
  const campaignIdFromUrl = isEditMode ? parseInt(location.split('/')[2]) : 
                           isViewMode ? parseInt(location.split('/')[2]) : null;

  // Fee Group form state
  const [feeGroupForm, setFeeGroupForm] = useState({
    name: '',
    description: '',
    displayOrder: 1
  });

  // Fee Item form state
  const [feeItemForm, setFeeItemForm] = useState({
    name: '',
    description: '',
    feeGroupId: 0,
    defaultValue: '',
    valueType: 'percentage' as 'percentage' | 'fixed' | 'basis_points',
    isRequired: false,
    displayOrder: 1
  });

  // Update fee item form when selected fee group changes
  useEffect(() => {
    if (selectedFeeGroup) {
      setFeeItemForm(prev => ({ ...prev, feeGroupId: selectedFeeGroup }));
    }
  }, [selectedFeeGroup]);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
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
    },
    staleTime: 0, // Always refetch
    gcTime: 0 // Don't cache
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
  const { data: feeItems = [], isLoading: feeItemsLoading } = useQuery<FeeItemWithGroup[]>({
    queryKey: ['/api/fee-items'],
    queryFn: async () => {
      const response = await fetch('/api/fee-items', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 0, // Always refetch
    gcTime: 0 // Don't cache
  });

  // Fetch individual campaign for editing
  const { data: campaignToEdit } = useQuery<Campaign>({
    queryKey: ['/api/campaigns', campaignIdFromUrl],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignIdFromUrl}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch campaign');
      return response.json();
    },
    enabled: !!campaignIdFromUrl,
  });

  // Effect to set edit mode when URL changes
  useEffect(() => {
    if (isEditMode && campaignIdFromUrl && campaignToEdit) {
      setEditCampaignId(campaignIdFromUrl);
      setEditCampaignData(campaignToEdit);
      setShowAddCampaign(true); // Open the dialog in edit mode
    } else if (!isEditMode) {
      setEditCampaignId(null);
      setEditCampaignData(null);
    }
  }, [isEditMode, campaignIdFromUrl, campaignToEdit]);

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
        credentials: 'include',
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

  // Create Fee Item mutation
  const createFeeItemMutation = useMutation({
    mutationFn: async (feeItemData: CreateFeeItemData) => {
      const response = await fetch('/api/fee-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feeItemData),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create fee item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fee-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fee-groups'] });
      setShowAddFeeItem(false);
      setFeeItemForm({
        name: '',
        description: '',
        feeGroupId: selectedFeeGroup || 0,
        defaultValue: '',
        valueType: 'percentage',
        isRequired: false,
        displayOrder: 1
      });
      toast({
        title: "Fee Item Created",
        description: "The fee item has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create fee item.",
        variant: "destructive",
      });
    },
  });

  // Update Fee Item mutation
  const updateFeeItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateFeeItemData }) => {
      const response = await fetch(`/api/fee-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update fee item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fee-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fee-groups'] });
      setShowEditFeeItem(false);
      setEditFeeItemId(null);
      setFeeItemForm({
        name: '',
        description: '',
        feeGroupId: 0,
        defaultValue: '',
        valueType: 'percentage',
        isRequired: false,
        displayOrder: 1
      });
      toast({
        title: "Fee Item Updated",
        description: "The fee item has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fee item.",
        variant: "destructive",
      });
    },
  });

  // Update Fee Group mutation
  const updateFeeGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateFeeGroupData }) => {
      const response = await fetch(`/api/fee-groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update fee group');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fee-groups'] });
      setShowEditFeeGroup(false);
      setEditFeeGroupId(null);
      setFeeGroupForm({ name: '', description: '', displayOrder: 1 });
      toast({
        title: "Fee Group Updated",
        description: "The fee group has been successfully updated.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update fee group.";
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

  // Handle fee group edit
  const handleEditFeeGroup = (feeGroup: FeeGroup) => {
    setEditFeeGroupId(feeGroup.id);
    setFeeGroupForm({
      name: feeGroup.name,
      description: feeGroup.description || '',
      displayOrder: feeGroup.displayOrder,
    });
    setShowEditFeeGroup(true);
  };

  // Handle fee group update submission
  const handleUpdateFeeGroup = () => {
    if (!feeGroupForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Fee group name is required.",
        variant: "destructive",
      });
      return;
    }

    if (editFeeGroupId) {
      updateFeeGroupMutation.mutate({
        id: editFeeGroupId,
        data: {
          name: feeGroupForm.name.trim(),
          description: feeGroupForm.description.trim() || undefined,
          displayOrder: feeGroupForm.displayOrder || 1,
        },
      });
    }
  };

  // Handle fee item form submission
  const handleCreateFeeItem = () => {
    if (!feeItemForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Fee item name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!feeItemForm.feeGroupId) {
      toast({
        title: "Validation Error",
        description: "Please select a fee group.",
        variant: "destructive",
      });
      return;
    }

    if (!feeItemForm.valueType) {
      toast({
        title: "Validation Error",
        description: "Please select a value type.",
        variant: "destructive",
      });
      return;
    }

    createFeeItemMutation.mutate({
      name: feeItemForm.name.trim(),
      description: feeItemForm.description.trim() || undefined,
      feeGroupId: feeItemForm.feeGroupId,
      defaultValue: feeItemForm.defaultValue.trim() || undefined,
      valueType: feeItemForm.valueType,
      isRequired: feeItemForm.isRequired,
      displayOrder: feeItemForm.displayOrder || 1,
    });
  };

  // Handle fee item update submission
  const handleUpdateFeeItem = () => {
    if (!feeItemForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Fee item name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!feeItemForm.feeGroupId) {
      toast({
        title: "Validation Error",
        description: "Please select a fee group.",
        variant: "destructive",
      });
      return;
    }

    if (!feeItemForm.valueType) {
      toast({
        title: "Validation Error",
        description: "Please select a value type.",
        variant: "destructive",
      });
      return;
    }

    if (editFeeItemId) {
      updateFeeItemMutation.mutate({
        id: editFeeItemId,
        data: {
          name: feeItemForm.name.trim(),
          description: feeItemForm.description.trim() || undefined,
          feeGroupId: feeItemForm.feeGroupId,
          defaultValue: feeItemForm.defaultValue.trim() || undefined,
          valueType: feeItemForm.valueType,
          isRequired: feeItemForm.isRequired,
          displayOrder: feeItemForm.displayOrder || 1,
        }
      });
    }
  };

  // If we're in view mode, show individual campaign details
  if (isViewMode && campaignToEdit) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/campaigns'}
              className="flex items-center gap-2"
            >
              ← Back to Campaigns
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{campaignToEdit.name}</h1>
              <p className="text-muted-foreground">Campaign #{campaignToEdit.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = `/campaigns/${campaignToEdit.id}/edit`}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Campaign
            </Button>
            <Button 
              onClick={() => window.open(`/merchant-application?campaign=${campaignToEdit.id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Application Form
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Campaign Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Campaign Name</Label>
                  <p className="text-lg font-medium">{campaignToEdit.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Acquirer</Label>
                  <p className="text-lg font-medium">{campaignToEdit.acquirer}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Pricing Type</Label>
                  <p className="text-lg font-medium">{campaignToEdit.pricingType?.name || 'Not configured'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={campaignToEdit.isActive ? "default" : "secondary"}>
                      {campaignToEdit.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {campaignToEdit.isDefault && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                </div>
              </div>
              {campaignToEdit.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-base">{campaignToEdit.description}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created Date</Label>
                  <p className="text-base">{new Date(campaignToEdit.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                  <p className="text-base">{campaignToEdit.createdByUser?.name || 'System'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Structure</CardTitle>
              <CardDescription>
                Pricing configuration for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignToEdit.feeValues && campaignToEdit.feeValues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Item</TableHead>
                      <TableHead>Fee Group</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignToEdit.feeValues.map((feeValue) => (
                      <TableRow key={feeValue.id}>
                        <TableCell className="font-medium">
                          {feeValue.feeItem?.name || 'Unknown Fee Item'}
                        </TableCell>
                        <TableCell>
                          {feeValue.feeItem?.feeGroup?.name || 'Unknown Group'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {String(feeValue.value)}
                          {feeValue.valueType === 'percentage' && '%'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {String(feeValue.valueType || 'percentage')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No fee structure configured for this campaign
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader>
              <CardTitle>Associated Equipment</CardTitle>
              <CardDescription>
                Payment processing equipment included in this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignToEdit.equipment && campaignToEdit.equipment.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaignToEdit.equipment.map((campaignEquipment) => {
                    const equipment = campaignEquipment.equipmentItem || campaignEquipment;
                    return (
                      <div key={campaignEquipment.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center space-x-3">
                          {(equipment.imageUrl || equipment.imageData) && (
                            <img
                              src={equipment.imageData ? `data:image/png;base64,${equipment.imageData}` : equipment.imageUrl}
                              alt={equipment.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <h3 className="font-medium">{equipment.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {equipment.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                        {equipment.description && (
                          <p className="text-sm text-muted-foreground">
                            {equipment.description}
                          </p>
                        )}
                        {equipment.specifications && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Specs:</strong> {String(equipment.specifications)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No equipment associated with this campaign
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                              <DropdownMenuItem onClick={() => handleEditFeeGroup(group)}>
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

        {/* Fee Item Groups Tab */}
        <TabsContent value="fee-item-groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search fee item groups..."
                className="pl-10"
              />
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Item Group
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {feeItemGroupsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading fee item groups...</div>
              ) : feeItemGroups.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">No fee item groups found</div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Fee Item Group
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Fee Group</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Display Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fee Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeItemGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{feeGroups.find(fg => fg.id === group.feeGroupId)?.name || '—'}</TableCell>
                        <TableCell>{group.description || '—'}</TableCell>
                        <TableCell>{group.displayOrder}</TableCell>
                        <TableCell>
                          <Badge variant={group.isActive ? "default" : "secondary"}>
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>0 items</TableCell>
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
                              <DropdownMenuItem onClick={() => {
                                setEditFeeItemId(item.id);
                                setFeeItemForm({
                                  name: item.name,
                                  description: item.description || '',
                                  feeGroupId: item.feeGroupId,
                                  defaultValue: item.defaultValue || '',
                                  valueType: item.valueType,
                                  isRequired: item.isRequired,
                                  displayOrder: item.displayOrder
                                });
                                setShowEditFeeItem(true);
                              }}>
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

      {/* Enhanced Campaign Dialog */}
      <EnhancedCampaignDialog 
        open={showAddCampaign} 
        onOpenChange={(open) => {
          setShowAddCampaign(open);
          if (!open && isEditMode) {
            window.location.href = '/campaigns';
          }
        }}
        onCampaignCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
          if (isEditMode) {
            window.location.href = '/campaigns';
          }
        }}
        editCampaignId={editCampaignId}
        editCampaignData={editCampaignData}
      />

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

      {/* Edit Fee Group Dialog */}
      <Dialog open={showEditFeeGroup} onOpenChange={setShowEditFeeGroup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fee Group</DialogTitle>
            <DialogDescription>
              Update fee group information
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
            <Button variant="outline" onClick={() => {
              setShowEditFeeGroup(false);
              setEditFeeGroupId(null);
              setFeeGroupForm({ name: '', description: '', displayOrder: 1 });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateFeeGroup}
              disabled={updateFeeGroupMutation.isPending}
            >
              {updateFeeGroupMutation.isPending ? 'Updating...' : 'Update Fee Group'}
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
              <Input 
                placeholder="Enter fee item name" 
                value={feeItemForm.name}
                onChange={(e) => setFeeItemForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                placeholder="Enter description (optional)" 
                value={feeItemForm.description}
                onChange={(e) => setFeeItemForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fee Group *</Label>
              <Select 
                value={feeItemForm.feeGroupId?.toString() || ''} 
                onValueChange={(value) => setFeeItemForm(prev => ({ ...prev, feeGroupId: parseInt(value) }))}
              >
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
              <Input 
                placeholder="Enter default value (optional)" 
                value={feeItemForm.defaultValue}
                onChange={(e) => setFeeItemForm(prev => ({ ...prev, defaultValue: e.target.value }))}
              />
            </div>
            <div>
              <Label>Value Type *</Label>
              <Select 
                value={feeItemForm.valueType} 
                onValueChange={(value: 'percentage' | 'fixed' | 'basis_points') => 
                  setFeeItemForm(prev => ({ ...prev, valueType: value }))
                }
              >
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
              <Switch 
                id="required" 
                checked={feeItemForm.isRequired}
                onCheckedChange={(checked) => setFeeItemForm(prev => ({ ...prev, isRequired: checked }))}
              />
              <Label htmlFor="required">Required for campaigns</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddFeeItem(false);
              setFeeItemForm({
                name: '',
                description: '',
                feeGroupId: selectedFeeGroup || 0,
                defaultValue: '',
                valueType: 'percentage',
                isRequired: false,
                displayOrder: 1
              });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFeeItem}
              disabled={createFeeItemMutation.isPending}
            >
              {createFeeItemMutation.isPending ? 'Creating...' : 'Create Fee Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Fee Item Dialog */}
      <Dialog open={showEditFeeItem} onOpenChange={setShowEditFeeItem}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fee Item</DialogTitle>
            <DialogDescription>
              Update the fee item details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fee Item Name *</Label>
              <Input 
                placeholder="Enter fee item name" 
                value={feeItemForm.name}
                onChange={(e) => setFeeItemForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                placeholder="Enter description (optional)" 
                value={feeItemForm.description}
                onChange={(e) => setFeeItemForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fee Group *</Label>
              <Select 
                value={feeItemForm.feeGroupId?.toString() || ''} 
                onValueChange={(value) => setFeeItemForm(prev => ({ ...prev, feeGroupId: parseInt(value) }))}
              >
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
              <Input 
                placeholder="Enter default value (optional)" 
                value={feeItemForm.defaultValue}
                onChange={(e) => setFeeItemForm(prev => ({ ...prev, defaultValue: e.target.value }))}
              />
            </div>
            <div>
              <Label>Value Type *</Label>
              <Select 
                value={feeItemForm.valueType} 
                onValueChange={(value: 'percentage' | 'fixed' | 'basis_points') => 
                  setFeeItemForm(prev => ({ ...prev, valueType: value }))
                }
              >
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
              <Switch 
                id="required-edit" 
                checked={feeItemForm.isRequired}
                onCheckedChange={(checked) => setFeeItemForm(prev => ({ ...prev, isRequired: checked }))}
              />
              <Label htmlFor="required-edit">Required for campaigns</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditFeeItem(false);
              setEditFeeItemId(null);
              setFeeItemForm({
                name: '',
                description: '',
                feeGroupId: 0,
                defaultValue: '',
                valueType: 'percentage',
                isRequired: false,
                displayOrder: 1
              });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateFeeItem}
              disabled={updateFeeItemMutation.isPending}
            >
              {updateFeeItemMutation.isPending ? 'Updating...' : 'Update Fee Item'}
            </Button>
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