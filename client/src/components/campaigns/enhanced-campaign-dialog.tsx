import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, DollarSign, Percent, Info, AlertCircle, CheckCircle2, Package, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface FeeGroup {
  id: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

interface FeeItem {
  id: number;
  name: string;
  description?: string;
  feeGroupId: number;
  valueType: 'amount' | 'percentage' | 'placeholder';
  defaultValue?: string;
  additionalInfo?: string;
  displayOrder: number;
  isActive: boolean;
  feeGroup?: FeeGroup;
}

interface PricingType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  feeItems?: FeeItem[];
}

interface CampaignFeeValue {
  feeItemId: number;
  value: string;
}

interface EquipmentItem {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  imageData?: string;
  specifications?: string;
  isActive: boolean;
}

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
  feeValues?: CampaignFeeValue[];
}

interface EnhancedCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated?: () => void;
  editCampaignId?: number | null;
  editCampaignData?: Campaign | null;
}

export function EnhancedCampaignDialog({ 
  open, 
  onOpenChange, 
  onCampaignCreated, 
  editCampaignId, 
  editCampaignData 
}: EnhancedCampaignDialogProps) {
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    acquirer: '',
    equipment: '',
    currency: 'USD',
  });
  
  const [feeValues, setFeeValues] = useState<Record<number, string>>({});
  const [selectedEquipment, setSelectedEquipment] = useState<number[]>([]);
  const [activePricingTypes, setActivePricingTypes] = useState<number[]>([]);
  const [expandedPricingTypes, setExpandedPricingTypes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const defaultsSetRef = useRef(false);

  // Data queries
  const { data: pricingTypes = [], isLoading: pricingTypesLoading } = useQuery({
    queryKey: ['/api/pricing-types'],
    queryFn: async () => {
      const response = await fetch('/api/pricing-types', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch pricing types');
      return response.json();
    },
  });

  const { data: feeGroups = [], isLoading: feeGroupsLoading } = useQuery({
    queryKey: ['/api/fee-groups'],
    queryFn: async () => {
      const response = await fetch('/api/fee-groups', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch fee groups');
      return response.json();
    },
  });

  // Create queries for fee items for each pricing type
  const pricingTypeFeeItemsQueries = useQuery({
    queryKey: ['/api/pricing-types-with-fee-items'],
    queryFn: async () => {
      const pricingTypesWithFeeItems = await Promise.all(
        pricingTypes.map(async (pt) => {
          try {
            const response = await fetch(`/api/pricing-types/${pt.id}/fee-items`, {
              credentials: 'include'
            });
            if (!response.ok) return { ...pt, feeItems: [] };
            const feeItems = await response.json();
            return { ...pt, feeItems };
          } catch (error) {
            return { ...pt, feeItems: [] };
          }
        })
      );
      return pricingTypesWithFeeItems;
    },
    enabled: pricingTypes.length > 0,
  });

  // Get equipment items
  const { data: equipmentItems = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['/api/equipment-items'],
    queryFn: async () => {
      const response = await fetch('/api/equipment-items', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch equipment items');
      return response.json();
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create campaign');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign Created",
        description: "Campaign has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      resetForm();
      onOpenChange(false);
      onCampaignCreated?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/campaigns/${editCampaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update campaign');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign Updated",
        description: "Campaign has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      resetForm();
      onOpenChange(false);
      onCampaignCreated?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      acquirer: '',
      equipment: '',
      currency: 'USD',
    });
    setFeeValues({});
    setSelectedEquipment([]);
    setActivePricingTypes([]);
    setExpandedPricingTypes([]);
    setErrors({});
    defaultsSetRef.current = false;
  };

  const handleEquipmentChange = (equipmentId: number, checked: boolean) => {
    setSelectedEquipment(prev => {
      if (checked) {
        return [...prev, equipmentId];
      } else {
        return prev.filter(id => id !== equipmentId);
      }
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Campaign name must be 50 characters or less';
    }
    
    if (formData.description && formData.description.length > 300) {
      newErrors.description = 'Description must be 300 characters or less';
    }
    
    if (activePricingTypes.length === 0) {
      newErrors.pricingTypes = 'At least one pricing type must be configured';
    }
    
    if (!formData.acquirer) {
      newErrors.acquirer = 'Acquirer is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const campaignData = {
      ...formData,
      pricingTypeIds: activePricingTypes,
      equipmentIds: selectedEquipment,
      feeValues: Object.entries(feeValues).map(([feeItemId, value]) => ({
        feeItemId: parseInt(feeItemId),
        value: value.toString(),
      })),
    };

    if (editCampaignId) {
      updateCampaignMutation.mutate(campaignData);
    } else {
      createCampaignMutation.mutate(campaignData);
    }
  };

  const handleFeeValueChange = (feeItemId: number, value: string, pricingTypeId: number) => {
    setFeeValues(prev => ({
      ...prev,
      [feeItemId]: value,
    }));
    
    // Mark pricing type as configured if any fee value is set
    if (value && value.trim() !== '') {
      setActivePricingTypes(prev => {
        if (!prev.includes(pricingTypeId)) {
          return [...prev, pricingTypeId];
        }
        return prev;
      });
    }
  };

  const formatValueType = (valueType: string) => {
    switch (valueType) {
      case 'percentage': return '%';
      case 'amount': return '$';
      case 'placeholder': return 'ID';
      default: return '';
    }
  };

  const getValueIcon = (valueType: string) => {
    switch (valueType) {
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'amount': return <DollarSign className="h-4 w-4" />;
      default: return null;
    }
  };

  // Get pricing types with fee items data
  const pricingTypesWithFeeItems = pricingTypeFeeItemsQueries.data || [];
  
  // Helper function to group fee items by fee group for each pricing type
  const groupFeeItemsByGroup = (feeItems: FeeItem[]) => {
    return feeItems.reduce((groups: Record<string, FeeItem[]>, item: FeeItem) => {
      const groupName = item.feeGroup?.name || 'Other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(item);
      return groups;
    }, {});
  };

  // Handle pricing type toggle
  const togglePricingType = (pricingTypeId: number) => {
    setActivePricingTypes(prev => {
      if (prev.includes(pricingTypeId)) {
        return prev.filter(id => id !== pricingTypeId);
      } else {
        return [...prev, pricingTypeId];
      }
    });
  };

  // Handle expand all functionality
  const handleExpandAll = () => {
    const allPricingTypeIds = pricingTypesWithFeeItems.map(pt => pt.id.toString());
    setExpandedPricingTypes(allPricingTypeIds);
    setActivePricingTypes(pricingTypesWithFeeItems.map(pt => pt.id));
  };

  const handleCollapseAll = () => {
    setExpandedPricingTypes([]);
  };

  // Effect to populate form data when editing
  useEffect(() => {
    if (editCampaignData && open) {
      setFormData({
        name: editCampaignData.name,
        description: editCampaignData.description || '',
        acquirer: editCampaignData.acquirer,
        equipment: '',
        currency: 'USD',
      });
      
      // Set active pricing types
      if (editCampaignData.pricingType?.id) {
        setActivePricingTypes([editCampaignData.pricingType.id]);
      }
      
      // Set fee values if available
      if (editCampaignData.feeValues) {
        const feeValueMap: Record<number, string> = {};
        editCampaignData.feeValues.forEach(fv => {
          feeValueMap[fv.feeItemId] = fv.value;
        });
        setFeeValues(feeValueMap);
      }
    } else if (!editCampaignData && open) {
      // Reset form when opening for creation
      resetForm();
    }
  }, [editCampaignData, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {editCampaignId ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
          <DialogDescription>
            {editCampaignId 
              ? 'Update this pricing campaign with custom fee structures for merchant applications'
              : 'Define a pricing campaign with custom fee structures for merchant applications'
            }
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Campaign Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campaign Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter campaign name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">{errors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="acquirer">Acquirer *</Label>
                    <Select value={formData.acquirer} onValueChange={(value) => setFormData(prev => ({ ...prev, acquirer: value }))}>
                      <SelectTrigger className={errors.acquirer ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select acquirer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Esquire">Esquire</SelectItem>
                        <SelectItem value="Merrick">Merrick</SelectItem>
                        <SelectItem value="Wells Fargo">Wells Fargo</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.acquirer && (
                      <p className="text-sm text-destructive mt-1">{errors.acquirer}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter campaign description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={errors.description ? 'border-destructive' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive mt-1">{errors.description}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Currently set to USD. Future enhancements will allow currency selection.
                  </p>
                </div>
                
                {errors.pricingTypes && (
                  <Alert className="border-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-destructive">
                      {errors.pricingTypes}
                    </AlertDescription>
                  </Alert>
                )}


              </CardContent>
            </Card>

            {/* Pricing Types Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Pricing Types Configuration *
                    </CardTitle>
                    <CardDescription>
                      Configure fees for different pricing types. Expand each pricing type to set fee values.
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExpandAll}
                      disabled={pricingTypesWithFeeItems.length === 0}
                    >
                      Expand All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCollapseAll}
                    >
                      Collapse All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pricingTypeFeeItemsQueries.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading pricing types...
                  </div>
                ) : pricingTypesWithFeeItems.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No pricing types are available. Contact an administrator to add pricing types.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      {activePricingTypes.length} of {pricingTypesWithFeeItems.length} pricing types configured
                    </div>
                    <Accordion 
                      type="multiple" 
                      value={expandedPricingTypes} 
                      onValueChange={setExpandedPricingTypes}
                      className="w-full"
                    >
                      {pricingTypesWithFeeItems.map((pricingType) => (
                        <AccordionItem key={pricingType.id} value={pricingType.id.toString()}>
                          <AccordionTrigger className="text-left hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium">{pricingType.name}</h3>
                                  {activePricingTypes.includes(pricingType.id) && (
                                    <Badge variant="default" className="text-xs">
                                      Configured
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {pricingType.feeItems?.length || 0} fee items
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {pricingType.description && (
                              <p className="text-sm text-muted-foreground mb-4">
                                {pricingType.description}
                              </p>
                            )}
                            
                            {!pricingType.feeItems || pricingType.feeItems.length === 0 ? (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  No fee items are configured for this pricing type.
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <div className="space-y-6">
                                {Object.entries(groupFeeItemsByGroup(pricingType.feeItems)).map(([groupName, items]) => (
                                  <div key={groupName}>
                                    <h4 className="font-medium text-sm mb-3 flex items-center">
                                      <Badge variant="outline" className="mr-2">{groupName}</Badge>
                                      <span className="text-muted-foreground">
                                        {items.length} item{items.length !== 1 ? 's' : ''}
                                      </span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {items.map((item: FeeItem) => (
                                        <div key={item.id} className="border rounded-lg p-3 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <Label htmlFor={`fee-${item.id}`} className="text-sm font-medium">
                                              {item.name}
                                            </Label>
                                            {item.additionalInfo && (
                                              <button
                                                type="button"
                                                className="text-muted-foreground hover:text-foreground"
                                                title={item.additionalInfo}
                                              >
                                                <Info className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                          
                                          {item.description && (
                                            <p className="text-xs text-muted-foreground">
                                              {item.description}
                                            </p>
                                          )}
                                          
                                          <div className="flex items-center space-x-2">
                                            <div className="relative flex-1">
                                              <Input
                                                id={`fee-${item.id}`}
                                                type={item.valueType === 'placeholder' ? 'text' : 'number'}
                                                step={item.valueType === 'percentage' ? '0.01' : '0.01'}
                                                min="0"
                                                placeholder={item.valueType === 'placeholder' ? 'Enter value' : '0.00'}
                                                value={feeValues[item.id] ?? ''}
                                                onChange={(e) => handleFeeValueChange(item.id, e.target.value, pricingType.id)}
                                                className="pr-8"
                                              />
                                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground flex items-center">
                                                {getValueIcon(item.valueType)}
                                                <span className="text-xs ml-1">
                                                  {formatValueType(item.valueType)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equipment Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Equipment Selection
                </CardTitle>
                <CardDescription>
                  Choose equipment items to associate with this campaign (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {equipmentLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading equipment...
                  </div>
                ) : equipmentItems.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No equipment items are available. Contact an administrator to add equipment.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-3">
                      {selectedEquipment.length} of {equipmentItems.length} equipment items selected
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {equipmentItems.map((item: EquipmentItem) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 transition-all ${
                            selectedEquipment.includes(item.id)
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={`equipment-${item.id}`}
                              checked={selectedEquipment.includes(item.id)}
                              onCheckedChange={(checked) => 
                                handleEquipmentChange(item.id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                {(item.imageUrl || item.imageData) && (
                                  <img
                                    src={item.imageUrl || item.imageData}
                                    alt={item.name}
                                    className="w-12 h-12 object-contain rounded bg-muted p-1"
                                  />
                                )}
                                <div className="flex-1">
                                  <Label htmlFor={`equipment-${item.id}`} className="text-sm font-medium cursor-pointer">
                                    {item.name}
                                  </Label>
                                  {selectedEquipment.includes(item.id) && (
                                    <Check className="h-4 w-4 text-primary ml-1 inline" />
                                  )}
                                </div>
                              </div>
                              
                              {item.description && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {item.description}
                                </p>
                              )}
                              
                              {item.specifications && typeof item.specifications === 'string' && item.specifications.trim() && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Specs:</span> {item.specifications}
                                </div>
                              )}
                              {item.specifications && typeof item.specifications === 'object' && item.specifications !== null && Object.keys(item.specifications).length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Specs:</span> {JSON.stringify(item.specifications)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending || activePricingTypes.length === 0}
          >
            {editCampaignId 
              ? (updateCampaignMutation.isPending ? "Updating..." : "Update Campaign")
              : (createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}