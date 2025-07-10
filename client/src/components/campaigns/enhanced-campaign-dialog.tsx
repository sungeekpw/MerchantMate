import { useState, useEffect } from 'react';
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
import { Plus, DollarSign, Percent, Info, AlertCircle, CheckCircle2, Package, Check } from 'lucide-react';
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
  specifications?: string;
  isActive: boolean;
}

interface EnhancedCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated?: () => void;
}

export function EnhancedCampaignDialog({ open, onOpenChange, onCampaignCreated }: EnhancedCampaignDialogProps) {
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricingTypeId: '',
    acquirer: '',
    equipment: '',
    currency: 'USD',
  });
  
  const [feeValues, setFeeValues] = useState<Record<number, string>>({});
  const [selectedPricingType, setSelectedPricingType] = useState<PricingType | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Get fee items for selected pricing type
  const { data: availableFeeItems = [], isLoading: feeItemsLoading } = useQuery({
    queryKey: ['/api/pricing-types', selectedPricingType?.id, 'fee-items'],
    queryFn: async () => {
      if (!selectedPricingType?.id) return [];
      const response = await fetch(`/api/pricing-types/${selectedPricingType.id}/fee-items`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch fee items');
      return response.json();
    },
    enabled: !!selectedPricingType?.id,
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

  // Handle pricing type change
  useEffect(() => {
    if (formData.pricingTypeId) {
      const pricingType = pricingTypes.find(pt => pt.id.toString() === formData.pricingTypeId);
      setSelectedPricingType(pricingType || null);
      setFeeValues({}); // Reset fee values when pricing type changes
    } else {
      setSelectedPricingType(null);
      setFeeValues({});
    }
  }, [formData.pricingTypeId, pricingTypes]);

  // Set default values for fee items (only when fee items data changes)
  useEffect(() => {
    if (availableFeeItems.length > 0 && Object.keys(feeValues).length === 0) {
      const newFeeValues: Record<number, string> = {};
      availableFeeItems.forEach((item: FeeItem) => {
        if (item.defaultValue) {
          newFeeValues[item.id] = item.defaultValue;
        }
      });
      if (Object.keys(newFeeValues).length > 0) {
        setFeeValues(newFeeValues);
      }
    }
  }, [availableFeeItems.length, selectedPricingType?.id]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pricingTypeId: '',
      acquirer: '',
      equipment: '',
      currency: 'USD',
    });
    setFeeValues({});
    setSelectedPricingType(null);
    setSelectedEquipment([]);
    setErrors({});
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
    
    if (!formData.pricingTypeId) {
      newErrors.pricingTypeId = 'Pricing type is required';
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
      pricingTypeId: parseInt(formData.pricingTypeId),
      equipmentIds: selectedEquipment,
      feeValues: Object.entries(feeValues).map(([feeItemId, value]) => ({
        feeItemId: parseInt(feeItemId),
        value: value.toString(),
      })),
    };

    createCampaignMutation.mutate(campaignData);
  };

  const handleFeeValueChange = (feeItemId: number, value: string) => {
    setFeeValues(prev => ({
      ...prev,
      [feeItemId]: value,
    }));
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

  // Group fee items by fee group
  const groupedFeeItems = availableFeeItems.reduce((groups: Record<string, FeeItem[]>, item: FeeItem) => {
    const groupName = item.feeGroup?.name || 'Other';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
    return groups;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Define a pricing campaign with custom fee structures for merchant applications
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pricingType">Pricing Type *</Label>
                    <Select value={formData.pricingTypeId} onValueChange={(value) => setFormData(prev => ({ ...prev, pricingTypeId: value }))}>
                      <SelectTrigger className={errors.pricingTypeId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select pricing type" />
                      </SelectTrigger>
                      <SelectContent>
                        {pricingTypes.map((type: PricingType) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.pricingTypeId && (
                      <p className="text-sm text-destructive mt-1">{errors.pricingTypeId}</p>
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
                </div>


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
                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
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
                              
                              {item.specifications && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Specs:</span> {item.specifications}
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

            {/* Fee Configuration */}
            {selectedPricingType && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Fee Configuration</CardTitle>
                  <CardDescription>
                    Configure fee values for the selected pricing type: {selectedPricingType.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feeItemsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading fee items...
                    </div>
                  ) : Object.keys(groupedFeeItems).length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No fee items are configured for the selected pricing type.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedFeeItems).map(([groupName, items]) => (
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
                                      value={feeValues[item.id] || ''}
                                      onChange={(e) => handleFeeValueChange(item.id, e.target.value)}
                                      className="pr-8"
                                    />
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
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
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createCampaignMutation.isPending || !selectedPricingType}
          >
            {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}