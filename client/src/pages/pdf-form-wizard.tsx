import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, ChevronRight, Save, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FormField {
  id: number;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'phone' | 'email' | 'url';
  fieldLabel: string;
  isRequired: boolean;
  options: string[] | null;
  defaultValue: string | null;
  validation: string | null;
  position: number;
}

interface FormSection {
  title: string;
  order: number;
  fields: FormField[];
}

interface PdfFormWithFields {
  id: number;
  name: string;
  description: string;
  fields: FormField[];
}

export default function PdfFormWizard() {
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<FormSection[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch PDF form with fields
  const { data: pdfForm, isLoading } = useQuery({
    queryKey: ['/api/pdf-forms', id],
    queryFn: () => apiRequest(`/api/pdf-forms/${id}`),
    enabled: !!id
  });

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest(`/api/pdf-forms/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ formData: data })
      });
    },
    onSuccess: () => {
      // Silent success for auto-save
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  // Group fields into sections based on predefined structure
  useEffect(() => {
    if (pdfForm?.fields) {
      const groupedSections: FormSection[] = [
        {
          title: "Merchant Information",
          order: 1,
          fields: pdfForm.fields.filter((f: FormField) => f.position >= 1 && f.position <= 20)
        },
        {
          title: "Business Type & History",
          order: 2,
          fields: pdfForm.fields.filter((f: FormField) => f.position >= 21 && f.position <= 28)
        },
        {
          title: "Products & Services",
          order: 3,
          fields: pdfForm.fields.filter((f: FormField) => f.position >= 29 && f.position <= 33)
        },
        {
          title: "Transaction Information",
          order: 4,
          fields: pdfForm.fields.filter((f: FormField) => f.position >= 34 && f.position <= 42)
        }
      ].filter(section => section.fields.length > 0);
      
      setSections(groupedSections);
    }
  }, [pdfForm]);

  // Create dynamic form schema based on current section
  const createSectionSchema = (sectionFields: FormField[]) => {
    const schemaObject: Record<string, any> = {};
    
    sectionFields.forEach(field => {
      let fieldSchema;
      
      switch (field.fieldType) {
        case 'email':
          fieldSchema = z.string().email("Invalid email address");
          break;
        case 'phone':
          fieldSchema = z.string().regex(/^\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}$/, "Invalid phone number");
          break;
        case 'url':
          fieldSchema = z.string().url("Invalid URL");
          break;
        case 'number':
          fieldSchema = z.coerce.number().min(0);
          break;
        case 'date':
          fieldSchema = z.string();
          break;
        case 'checkbox':
          fieldSchema = z.boolean().optional();
          break;
        default:
          fieldSchema = z.string();
      }
      
      if (field.isRequired && field.fieldType !== 'checkbox') {
        fieldSchema = fieldSchema.min(1, `${field.fieldLabel} is required`);
      }
      
      if (!field.isRequired) {
        fieldSchema = fieldSchema.optional();
      }
      
      schemaObject[field.fieldName] = fieldSchema;
    });
    
    return z.object(schemaObject);
  };

  const currentSection = sections[currentStep];
  const currentSchema = currentSection ? createSectionSchema(currentSection.fields) : z.object({});

  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: formData,
    mode: "onBlur"
  });

  // Auto-save on field blur
  const handleFieldBlur = (fieldName: string, value: any) => {
    const updatedData = { ...formData, [fieldName]: value };
    setFormData(updatedData);
    autoSaveMutation.mutate(updatedData);
  };

  // Handle step navigation
  const nextStep = () => {
    form.handleSubmit((data) => {
      const updatedData = { ...formData, ...data };
      setFormData(updatedData);
      autoSaveMutation.mutate(updatedData);
      
      if (currentStep < sections.length - 1) {
        setCurrentStep(currentStep + 1);
        form.reset();
      }
    })();
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      form.reset();
    }
  };

  // Render field based on type
  const renderField = (field: FormField) => {
    const commonProps = {
      onBlur: (e: any) => {
        const value = field.fieldType === 'checkbox' ? e.target.checked : e.target.value;
        handleFieldBlur(field.fieldName, value);
      }
    };

    switch (field.fieldType) {
      case 'select':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.fieldLabel}
                  {field.isRequired && <span className="text-red-500">*</span>}
                </FormLabel>
                <Select 
                  onValueChange={(value) => {
                    formField.onChange(value);
                    handleFieldBlur(field.fieldName, value);
                  }}
                  defaultValue={formField.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.fieldLabel}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'textarea':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.fieldLabel}
                  {field.isRequired && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={field.fieldLabel}
                    {...formField}
                    {...commonProps}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'checkbox':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.fieldName}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={formField.value}
                    onCheckedChange={(checked) => {
                      formField.onChange(checked);
                      handleFieldBlur(field.fieldName, checked);
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {field.fieldLabel}
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        );

      default:
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.fieldLabel}
                  {field.isRequired && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type={field.fieldType === 'number' ? 'number' : field.fieldType}
                    placeholder={field.fieldLabel}
                    {...formField}
                    {...commonProps}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pdfForm || sections.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Form Not Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              The requested PDF form could not be loaded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentStep + 1) / sections.length) * 100;

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{pdfForm.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">{pdfForm.description}</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {sections.length}: {currentSection?.title}
            </span>
            <Badge variant="outline">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Auto-save indicator */}
        {autoSaveMutation.isPending && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
            <Save className="w-4 h-4 animate-pulse" />
            <span>Auto-saving...</span>
          </div>
        )}

        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>{currentSection?.title}</CardTitle>
            <CardDescription>
              Complete the fields below. Your progress is automatically saved when you move between fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid gap-6">
                  {currentSection?.fields.map(renderField)}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Changes are automatically saved
            </p>
          </div>

          <Button
            type="button"
            onClick={nextStep}
            disabled={currentStep === sections.length - 1}
          >
            {currentStep === sections.length - 1 ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Section Navigation */}
        <div className="flex justify-center">
          <div className="flex space-x-2">
            {sections.map((section, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={section.title}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}