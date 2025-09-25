import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Eye, Copy, Download, Upload, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types for template data
interface AcquirerApplicationTemplate {
  id: number;
  acquirerId: number;
  templateName: string;
  version: string;
  isActive: boolean;
  fieldConfiguration: any;
  pdfMappingConfiguration?: any;
  requiredFields: string[];
  conditionalFields?: any;
  createdAt: string;
  updatedAt: string;
  acquirer: {
    id: number;
    name: string;
    displayName: string;
    code: string;
  };
}

interface Acquirer {
  id: number;
  name: string;
  displayName: string;
  code: string;
}

// Form schema for creating/editing templates
const templateFormSchema = z.object({
  acquirerId: z.number().min(1, 'Please select an acquirer'),
  templateName: z.string().min(1, 'Template name is required'),
  version: z.string().min(1, 'Version is required'),
  isActive: z.boolean().default(true),
  fieldConfiguration: z.object({
    sections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      fields: z.array(z.object({
        id: z.string(),
        type: z.enum(['text', 'email', 'tel', 'url', 'date', 'number', 'select', 'checkbox', 'textarea']),
        label: z.string(),
        required: z.boolean().optional(),
        pattern: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        options: z.array(z.string()).optional(),
        sensitive: z.boolean().optional(),
        placeholder: z.string().optional(),
        description: z.string().optional()
      }))
    }))
  }),
  requiredFields: z.array(z.string()).default([]),
  conditionalFields: z.record(z.any()).optional()
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function ApplicationTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<AcquirerApplicationTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { toast } = useToast();

  // Fetch application templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<AcquirerApplicationTemplate[]>({
    queryKey: ['/api/acquirer-application-templates'],
    queryFn: async () => {
      const response = await fetch('/api/acquirer-application-templates', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch application templates');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0
  });

  // Fetch acquirers for the dropdown
  const { data: acquirers = [], isLoading: acquirersLoading } = useQuery<Acquirer[]>({
    queryKey: ['/api/acquirers'],
    queryFn: async () => {
      const response = await fetch('/api/acquirers', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch acquirers');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response = await fetch('/api/acquirer-application-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create template' }));
        throw new Error(error.error || 'Failed to create template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/acquirer-application-templates'] });
      setIsCreateOpen(false);
      toast({
        title: 'Success',
        description: 'Application template created successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive'
      });
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormData }) => {
      const response = await fetch(`/api/acquirer-application-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update template' }));
        throw new Error(error.error || 'Failed to update template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/acquirer-application-templates'] });
      setIsEditOpen(false);
      setSelectedTemplate(null);
      toast({
        title: 'Success',
        description: 'Application template updated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive'
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/acquirer-application-templates/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete template' }));
        throw new Error(error.error || 'Failed to delete template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/acquirer-application-templates'] });
      toast({
        title: 'Success',
        description: 'Application template deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive'
      });
    }
  });

  const openCreateDialog = () => {
    setSelectedTemplate(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (template: AcquirerApplicationTemplate) => {
    setSelectedTemplate(template);
    setIsEditOpen(true);
  };

  const openViewDialog = (template: AcquirerApplicationTemplate) => {
    setSelectedTemplate(template);
    setIsViewOpen(true);
  };

  const duplicateTemplate = async (template: AcquirerApplicationTemplate) => {
    const duplicateData: TemplateFormData = {
      acquirerId: template.acquirerId,
      templateName: `${template.templateName} (Copy)`,
      version: '1.0',
      isActive: false,
      fieldConfiguration: template.fieldConfiguration,
      requiredFields: template.requiredFields,
      conditionalFields: template.conditionalFields
    };
    
    try {
      await createTemplateMutation.mutateAsync(duplicateData);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  if (templatesLoading || acquirersLoading) {
    return (
      <div data-testid="page-application-templates" className="container mx-auto py-6">
        <div className="text-center">Loading application templates...</div>
      </div>
    );
  }

  return (
    <div data-testid="page-application-templates" className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 data-testid="text-page-title" className="text-3xl font-bold">Application Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage dynamic form templates for acquirer applications
          </p>
        </div>
        <Button 
          onClick={openCreateDialog}
          data-testid="button-create-template"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} data-testid={`card-template-${template.id}`} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.templateName}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={template.isActive ? 'default' : 'secondary'}>
                    v{template.version}
                  </Badge>
                  {template.isActive && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                {template.acquirer.displayName} ({template.acquirer.code})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Fields: {template.fieldConfiguration?.sections?.reduce((total: number, section: any) => total + section.fields.length, 0) || 0}</div>
                <div>Required: {template.requiredFields.length}</div>
                <div>Created: {new Date(template.createdAt).toLocaleDateString()}</div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openViewDialog(template)}
                    data-testid={`button-view-template-${template.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                    data-testid={`button-edit-template-${template.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateTemplate(template)}
                    data-testid={`button-duplicate-template-${template.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete the template "${template.templateName}"? This action cannot be undone.`)) {
                        deleteTemplateMutation.mutate(template.id);
                      }
                    }}
                    data-testid={`button-delete-template-${template.id}`}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-settings-template-${template.id}`}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card data-testid="card-no-templates">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium">No application templates</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Create your first application template to get started
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        acquirers={acquirers}
        onSubmit={createTemplateMutation.mutate}
        isLoading={createTemplateMutation.isPending}
      />

      {/* Edit Template Dialog */}
      {selectedTemplate && (
        <EditTemplateDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          template={selectedTemplate}
          acquirers={acquirers}
          onSubmit={(data) => updateTemplateMutation.mutate({ id: selectedTemplate.id, data })}
          isLoading={updateTemplateMutation.isPending}
        />
      )}

      {/* View Template Dialog */}
      {selectedTemplate && (
        <ViewTemplateDialog
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          template={selectedTemplate}
        />
      )}
    </div>
  );
}

// Create Template Dialog Component
function CreateTemplateDialog({ 
  isOpen, 
  onClose, 
  acquirers, 
  onSubmit, 
  isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  acquirers: Acquirer[];
  onSubmit: (data: TemplateFormData) => void;
  isLoading: boolean;
}) {
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      acquirerId: 0,
      templateName: '',
      version: '1.0',
      isActive: true,
      fieldConfiguration: {
        sections: [
          {
            id: 'basic_info',
            title: 'Basic Information',
            description: 'Essential business information',
            fields: [
              {
                id: 'business_name',
                type: 'text',
                label: 'Business Name',
                required: true,
                placeholder: 'Enter business name'
              },
              {
                id: 'contact_email',
                type: 'email',
                label: 'Contact Email',
                required: true,
                placeholder: 'Enter email address'
              }
            ]
          }
        ]
      },
      requiredFields: ['business_name', 'contact_email']
    }
  });

  const handleSubmit = (data: TemplateFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-create-template" className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Application Template</DialogTitle>
          <DialogDescription>
            Create a new dynamic form template for acquirer applications
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="acquirerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acquirer</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      data-testid="select-acquirer"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select acquirer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {acquirers.map((acquirer) => (
                          <SelectItem key={acquirer.id} value={acquirer.id.toString()}>
                            {acquirer.displayName} ({acquirer.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Standard Application"
                        data-testid="input-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., 1.0"
                        data-testid="input-version"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Template</FormLabel>
                      <FormDescription>
                        Enable this template for use in applications
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-submit-create"
              >
                {isLoading ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Template Dialog Component  
function EditTemplateDialog({ 
  isOpen, 
  onClose, 
  template, 
  acquirers, 
  onSubmit, 
  isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  template: AcquirerApplicationTemplate;
  acquirers: Acquirer[];
  onSubmit: (data: TemplateFormData) => void;
  isLoading: boolean;
}) {
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      acquirerId: template.acquirerId,
      templateName: template.templateName,
      version: template.version,
      isActive: template.isActive,
      fieldConfiguration: template.fieldConfiguration,
      requiredFields: template.requiredFields,
      conditionalFields: template.conditionalFields
    }
  });

  const handleSubmit = (data: TemplateFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-edit-template" className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Application Template</DialogTitle>
          <DialogDescription>
            Update the application template configuration
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="acquirerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acquirer</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      data-testid="select-acquirer"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select acquirer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {acquirers.map((acquirer) => (
                          <SelectItem key={acquirer.id} value={acquirer.id.toString()}>
                            {acquirer.displayName} ({acquirer.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Standard Application"
                        data-testid="input-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., 1.0"
                        data-testid="input-version"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Template</FormLabel>
                      <FormDescription>
                        Enable this template for use in applications
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-submit-edit"
              >
                {isLoading ? 'Updating...' : 'Update Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// View Template Dialog Component
function ViewTemplateDialog({ 
  isOpen, 
  onClose, 
  template 
}: {
  isOpen: boolean;
  onClose: () => void;
  template: AcquirerApplicationTemplate;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-view-template" className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.templateName} v{template.version}</DialogTitle>
          <DialogDescription>
            {template.acquirer.displayName} ({template.acquirer.code}) application template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
              <Badge variant={template.isActive ? 'default' : 'secondary'}>
                {template.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Version</h4>
              <p>{template.version}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Created</h4>
              <p>{new Date(template.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Updated</h4>
              <p>{new Date(template.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Field Configuration</h4>
            <div className="space-y-4">
              {template.fieldConfiguration?.sections?.map((section: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {section.fields?.map((field: any, fieldIndex: number) => (
                        <div key={fieldIndex} className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                          <div>
                            <span className="font-medium">{field.label}</span>
                            <Badge variant="outline" className="ml-2">{field.type}</Badge>
                            {field.required && (
                              <Badge variant="destructive" className="ml-1">Required</Badge>
                            )}
                          </div>
                          {field.description && (
                            <span className="text-sm text-muted-foreground">{field.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}