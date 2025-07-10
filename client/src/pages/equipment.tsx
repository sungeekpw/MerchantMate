import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Upload, Monitor, CreditCard, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface EquipmentItem {
  id: number;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  modelNumber: string;
  specifications: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EquipmentFormData {
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  modelNumber: string;
  specifications: string;
}

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: "",
    description: "",
    category: "",
    manufacturer: "",
    modelNumber: "",
    specifications: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch equipment items
  const { data: equipmentItems = [], isLoading } = useQuery({
    queryKey: ['/api/equipment-items'],
    queryFn: async () => {
      const response = await fetch('/api/equipment-items', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch equipment items');
      return response.json();
    }
  });

  // Create equipment mutation
  const createEquipmentMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      const response = await fetch('/api/equipment-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          specifications: data.specifications ? JSON.parse(data.specifications) : {}
        })
      });
      if (!response.ok) throw new Error('Failed to create equipment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-items'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Equipment item created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create equipment item", variant: "destructive" });
    }
  });

  // Update equipment mutation
  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EquipmentFormData }) => {
      const response = await fetch(`/api/equipment-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          specifications: data.specifications ? JSON.parse(data.specifications) : {}
        })
      });
      if (!response.ok) throw new Error('Failed to update equipment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-items'] });
      setEditingEquipment(null);
      resetForm();
      toast({ title: "Success", description: "Equipment item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update equipment item", variant: "destructive" });
    }
  });

  // Delete equipment mutation
  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/equipment-items/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete equipment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-items'] });
      toast({ title: "Success", description: "Equipment item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete equipment item", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      manufacturer: "",
      modelNumber: "",
      specifications: "",
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleEdit = (equipment: EquipmentItem) => {
    setEditingEquipment(equipment);
    setFormData({
      name: equipment.name,
      description: equipment.description,
      category: equipment.category,
      manufacturer: equipment.manufacturer,
      modelNumber: equipment.modelNumber,
      specifications: JSON.stringify(equipment.specifications, null, 2),
    });
  };

  const handleSubmit = () => {
    if (editingEquipment) {
      updateEquipmentMutation.mutate({ id: editingEquipment.id, data: formData });
    } else {
      createEquipmentMutation.mutate(formData);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'terminal':
        return <Monitor className="w-4 h-4" />;
      case 'card reader':
        return <CreditCard className="w-4 h-4" />;
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const filteredEquipment = equipmentItems.filter((item: EquipmentItem) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(equipmentItems.map((item: EquipmentItem) => item.category))];

  return (
    <div className="p-6 space-y-6">
        {/* Search and Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Dialog open={isCreateDialogOpen || !!editingEquipment} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingEquipment(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
                </DialogTitle>
                <DialogDescription>
                  {editingEquipment ? 'Update equipment information' : 'Add a new equipment item to the system'}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="image">Image</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Equipment Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Clover Flex"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Terminal, Card Reader, Mobile"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer *</Label>
                      <Input
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        placeholder="e.g., Clover, Square, Ingenico"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="modelNumber">Model Number</Label>
                      <Input
                        id="modelNumber"
                        value={formData.modelNumber}
                        onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                        placeholder="e.g., C302U"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of the equipment..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="specifications">Specifications (JSON)</Label>
                    <Textarea
                      id="specifications"
                      value={formData.specifications}
                      onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                      placeholder='{"connectivity": "WiFi, Bluetooth", "display": "5.5 inch"}'
                      rows={4}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="image" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="image">Equipment Image</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                    
                    {imagePreview && (
                      <div className="space-y-2">
                        <Label>Image Preview</Label>
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <img
                            src={imagePreview}
                            alt="Equipment preview"
                            className="max-w-full h-48 object-contain mx-auto"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingEquipment(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending}
                >
                  {editingEquipment ? 'Update Equipment' : 'Create Equipment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              Loading equipment...
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No equipment found
            </div>
          ) : (
            filteredEquipment.map((equipment: EquipmentItem) => (
              <Card key={equipment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(equipment.category)}
                      <CardTitle className="text-lg">{equipment.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(equipment)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEquipmentMutation.mutate(equipment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{equipment.category}</Badge>
                    {equipment.isActive && <Badge variant="default">Active</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <CardDescription>{equipment.description}</CardDescription>
                    <div className="text-sm text-gray-600">
                      <p><strong>Manufacturer:</strong> {equipment.manufacturer}</p>
                      {equipment.modelNumber && (
                        <p><strong>Model:</strong> {equipment.modelNumber}</p>
                      )}
                    </div>
                    {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium">Specifications:</p>
                        <div className="bg-gray-50 p-2 rounded text-xs">
                          {JSON.stringify(equipment.specifications, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{equipmentItems.length}</div>
                <div className="text-sm text-gray-500">Total Equipment</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{equipmentItems.filter((item: EquipmentItem) => item.isActive).length}</div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-sm text-gray-500">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{[...new Set(equipmentItems.map((item: EquipmentItem) => item.manufacturer))].length}</div>
                <div className="text-sm text-gray-500">Manufacturers</div>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}