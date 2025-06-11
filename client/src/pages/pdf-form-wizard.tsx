import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Save, FileText, CheckCircle, Building, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FormField {
  id: number;
  fieldName: string;
  fieldType: string;
  fieldLabel: string;
  isRequired: boolean;
  options: string[] | null;
  defaultValue: string | null;
  validation: string | null;
  position: number;
  section: string | null;
}

interface PdfForm {
  id: number;
  name: string;
  description: string;
  fileName: string;
  fields: FormField[];
}

interface FormSection {
  name: string;
  fields: FormField[];
  icon: any;
  description: string;
}

export default function PdfFormWizard() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch PDF form with fields
  const { data: pdfForm, isLoading, error } = useQuery<PdfForm>({
    queryKey: ['/api/pdf-forms', id, 'with-fields'],
    enabled: !!id,
  });

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest('POST', `/api/pdf-forms/${id}/submissions`, {
        data: JSON.stringify(data),
        status: 'draft'
      });
      return response.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest('POST', `/api/pdf-forms/${id}/submissions`, {
        data: JSON.stringify(data),
        status: 'submitted'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Form Submitted",
        description: "Your form has been submitted successfully.",
      });
      setLocation('/pdf-forms');
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your form.",
        variant: "destructive",
      });
    }
  });

  // Group fields by section with icons and descriptions
  const sections: FormSection[] = pdfForm?.fields ? [
    {
      name: 'Merchant Information',
      description: 'Basic business details and contact information',
      icon: Building,
      fields: (pdfForm.fields as any).filter((f: any) => f.section === 'Merchant Information').sort((a: any, b: any) => a.position - b.position)
    },
    {
      name: 'Business Type & Tax Information',
      description: 'Business structure and tax identification details',
      icon: FileText,
      fields: (pdfForm.fields as any).filter((f: any) => f.section === 'Business Type & Tax Information').sort((a: any, b: any) => a.position - b.position)
    },
    {
      name: 'Products, Services & Processing',
      description: 'Business operations and processing requirements',
      icon: Users,
      fields: (pdfForm.fields as any).filter((f: any) => f.section === 'Products, Services & Processing').sort((a: any, b: any) => a.position - b.position)
    },
    {
      name: 'Transaction Information',
      description: 'Financial data and transaction processing details',
      icon: CheckCircle,
      fields: (pdfForm.fields as any).filter((f: any) => f.section === 'Transaction Information').sort((a: any, b: any) => a.position - b.position)
    }
  ].filter(section => section.fields.length > 0) : [];

  // Handle field changes with auto-save
  const handleFieldChange = (fieldName: string, value: any) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);
    
    // Debounced auto-save
    setTimeout(() => {
      autoSaveMutation.mutate(newFormData);
    }, 1000);
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = () => {
    submitMutation.mutate(formData);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.fieldName] || field.defaultValue || '';

    const fieldComponent = (() => {
      switch (field.fieldType) {
        case 'text':
        case 'email':
        case 'phone':
        case 'number':
          return (
            <Input
              type={field.fieldType === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              className="w-full"
            />
          );
        
        case 'textarea':
          return (
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              rows={3}
              className="w-full"
            />
          );
        
        case 'select':
          const options = (field.options || []).filter(option => option && option.trim() !== '');
          return (
            <Select value={value} onValueChange={(val) => handleFieldChange(field.fieldName, val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        
        case 'checkbox':
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={value === true || value === 'true'}
                onCheckedChange={(checked) => handleFieldChange(field.fieldName, checked)}
              />
              <Label className="text-sm font-normal">{field.fieldLabel}</Label>
            </div>
          );
        
        case 'date':
          return (
            <Input
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              className="w-full"
            />
          );
        
        default:
          return (
            <Input
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              placeholder={field.fieldLabel}
              className="w-full"
            />
          );
      }
    })();

    if (field.fieldType === 'checkbox') {
      return fieldComponent;
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.fieldLabel}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {fieldComponent}
      </div>
    );
  };

  const currentSectionData = sections[currentSection];
  const progress = sections.length > 0 ? ((currentSection + 1) / sections.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading form wizard...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Form Not Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              The requested PDF form could not be found.
            </p>
            <Button onClick={() => setLocation('/pdf-forms')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to PDF Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {pdfForm.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {pdfForm.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Progress</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Form Sections</CardTitle>
                <CardDescription>Navigate through different sections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map((section, index) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentSection(index)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        currentSection === index
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } border`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          currentSection === index 
                            ? 'bg-blue-100 dark:bg-blue-800' 
                            : 'bg-gray-200 dark:bg-gray-600'
                        }`}>
                          <IconComponent className={`w-4 h-4 ${
                            currentSection === index 
                              ? 'text-blue-600 dark:text-blue-300' 
                              : 'text-gray-600 dark:text-gray-300'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{section.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {section.fields.length} fields
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Auto-save Status */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-sm">
                    {autoSaveMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-blue-600">Saving...</span>
                      </>
                    ) : lastSaved ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Saved {lastSaved.toLocaleTimeString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-500 dark:text-gray-400">No changes yet</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-3">
            {currentSectionData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{currentSectionData.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {currentSectionData.description}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      Section {currentSection + 1} of {sections.length}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentSectionData.fields.map((field) => (
                      <div 
                        key={field.id} 
                        className={field.fieldType === 'textarea' ? 'md:col-span-2' : ''}
                      >
                        {renderField(field)}
                      </div>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentSection === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>

                    <div className="flex space-x-4">
                      {currentSection < sections.length - 1 ? (
                        <Button onClick={handleNext}>
                          Next Section
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleSubmit}
                          disabled={submitMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {submitMutation.isPending ? 'Submitting...' : 'Submit Form'}
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}