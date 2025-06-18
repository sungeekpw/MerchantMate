import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Settings, DollarSign, MoreHorizontal, Eye, Edit, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

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
}

interface PricingType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function CampaignsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAcquirer, setSelectedAcquirer] = useState<string>('all');
  const [showAddCampaign, setShowAddCampaign] = useState(false);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  // Fetch pricing types for campaign creation
  const { data: pricingTypes = [] } = useQuery<PricingType[]>({
    queryKey: ['/api/pricing-types'],
  });

  // Filter campaigns based on search and acquirer
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.id.toString().includes(searchQuery);
    const matchesAcquirer = selectedAcquirer === 'all' || campaign.acquirer === selectedAcquirer;
    return matchesSearch && matchesAcquirer;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-muted-foreground">
            Create and manage pricing campaigns for merchant applications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.location.href = '/pricing-types'}>
            <Settings className="h-4 w-4 mr-2" />
            Pricing Types
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/fee-items'}>
            <DollarSign className="h-4 w-4 mr-2" />
            Fee Items
          </Button>
          <Button onClick={() => setShowAddCampaign(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Campaign
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by Campaign ID or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedAcquirer} onValueChange={setSelectedAcquirer}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Acquirer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Acquirers</SelectItem>
                <SelectItem value="Esquire">Esquire</SelectItem>
                <SelectItem value="Merrick">Merrick</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            Manage your pricing campaigns and their configurations
          </CardDescription>
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
              <label className="text-sm font-medium">Campaign Name *</label>
              <Input placeholder="Enter campaign name" maxLength={50} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Enter description (optional)" maxLength={300} />
            </div>
            <div>
              <label className="text-sm font-medium">Pricing Type *</label>
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
              <label className="text-sm font-medium">Acquirer *</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select acquirer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Esquire">Esquire</SelectItem>
                  <SelectItem value="Merrick">Merrick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Equipment</label>
              <Input placeholder="Equipment information (optional)" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddCampaign(false)}>
                Cancel
              </Button>
              <Button>
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}