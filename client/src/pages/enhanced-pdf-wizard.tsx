import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Building, FileText, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

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
  description: string;
  fields: FormField[];
  icon: any;
}

export default function EnhancedPdfWizard() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch PDF form with fields
  const { data: pdfForm, isLoading, error } = useQuery<PdfForm>({
    queryKey: ['/api/pdf-forms', id, 'with-fields'],
    queryFn: async () => {
      const response = await fetch(`/api/pdf-forms/${id}/with-fields`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch form');
      }
      return response.json();
    },
    enabled: !!id
  });

  // Create enhanced sections with descriptions and icons
  const sections: FormSection[] = pdfForm?.fields ? [
    {
      name: 'Merchant Information',
      description: 'Basic business details, contact information, and location data',
      icon: Building,
      fields: pdfForm.fields.filter(f => f.section === 'Merchant Information').sort((a, b) => a.position - b.position)
    },
    {
      name: 'Business Type & Tax Information', 
      description: 'Business structure, tax identification, and regulatory compliance',
      icon: FileText,
      fields: pdfForm.fields.filter(f => f.section === 'Business Type & Tax Information').sort((a, b) => a.position - b.position)
    },
    {
      name: 'Products, Services & Processing',
      description: 'Business operations, products sold, and payment processing preferences',
      icon: CheckCircle,
      fields: pdfForm.fields.filter(f => f.section === 'Products, Services & Processing').sort((a, b) => a.position - b.position)
    },
    {
      name: 'Transaction Information',
      description: 'Financial data, volume estimates, and transaction processing details',
      icon: ArrowRight,
      fields: pdfForm.fields.filter(f => f.section === 'Transaction Information').sort((a, b) => a.position - b.position)
    }
  ].filter(section => section.fields.length > 0) : [];

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await fetch(`/api/pdf-forms/${id}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: JSON.stringify(data),
          status: 'draft'
        }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Auto-save failed');
      }
      return response.json();
    },
    onSuccess: () => {
      console.log('Auto-save successful');
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  // Final submission mutation
  const finalSubmitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await fetch(`/api/pdf-forms/${id}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: JSON.stringify(data),
          status: 'submitted'
        }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Submission failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your Wells Fargo merchant application has been submitted successfully.",
      });
      setLocation('/pdf-forms');
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle field changes with auto-save
  const handleFieldChange = (fieldName: string, value: any) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);
    
    // Auto-save after 2 seconds of no changes
    const timeoutId = setTimeout(() => {
      autoSaveMutation.mutate(newFormData);
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  };

  // Validation function
  const validateField = (field: FormField, value: any): string | null => {
    if (field.isRequired && (!value || value.toString().trim() === '')) {
      return `${field.fieldLabel} is required`;
    }

    if (value && field.validation) {
      const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
        zip: /^\d{5}(-\d{4})?$/,
        ein: /^\d{2}-\d{7}$/,
        ssn: /^\d{3}-\d{2}-\d{4}$/
      };

      if (field.validation.includes('email') && !patterns.email.test(value)) {
        return 'Please enter a valid email address';
      }
      if (field.validation.includes('phone') && !patterns.phone.test(value)) {
        return 'Please enter a valid phone number';
      }
      if (field.validation.includes('zip') && !patterns.zip.test(value)) {
        return 'Please enter a valid ZIP code';
      }
      if (field.validation.includes('ein') && !patterns.ein.test(value)) {
        return 'Please enter a valid EIN (XX-XXXXXXX)';
      }
      if (field.validation.includes('ssn') && !patterns.ssn.test(value)) {
        return 'Please enter a valid SSN (XXX-XX-XXXX)';
      }
    }

    return null;
  };

  // Validate current section
  const validateCurrentSection = (): boolean => {
    if (!sections[currentStep]) return true;
    
    let isValid = true;
    const errors: Record<string, string> = {};

    sections[currentStep].fields.forEach(field => {
      const value = formData[field.fieldName];
      const error = validateField(field, value);
      if (error) {
        errors[field.fieldName] = error;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  // Handle navigation
  const handleNext = () => {
    if (validateCurrentSection()) {
      setCurrentStep(Math.min(sections.length - 1, currentStep + 1));
    } else {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the current section before proceeding.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handleSubmit = () => {
    if (validateCurrentSection()) {
      finalSubmitMutation.mutate(formData);
    }
  };

  // Render form field
  const renderField = (field: FormField) => {
    const value = formData[field.fieldName] || field.defaultValue || '';
    const hasError = validationErrors[field.fieldName];

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type={field.fieldType === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
              placeholder={field.fieldType === 'email' ? 'Enter email address' : 
                          field.fieldType === 'phone' ? 'Enter phone number' : 
                          `Enter ${field.fieldLabel.toLowerCase()}`}
            />
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.fieldName}
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              rows={3}
            />
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => handleFieldChange(field.fieldName, val)}>
              <SelectTrigger className={hasError ? 'border-red-500' : ''}>
                <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.filter(option => option && option.trim() !== '').map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load form</p>
          <Button onClick={() => setLocation('/pdf-forms')}>Back to Forms</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header - Fixed */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Wells Fargo Merchant Processing Application
                </h1>
                <p className="text-gray-600">
                  Complete your merchant account application - All changes are saved automatically
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(((currentStep + 1) / sections.length) * 100)}%
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <Progress 
              value={((currentStep + 1) / sections.length) * 100} 
              className="h-2"
            />
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-8 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
            {/* Section Navigation - Fixed Height */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit sticky top-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Sections</h3>
                <nav className="space-y-2">
                  {sections.map((section, index) => {
                    const IconComponent = section.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentStep === index
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        } border`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            currentStep === index ? 'bg-blue-100' : 'bg-gray-200'
                          }`}>
                            <IconComponent className={`w-4 h-4 ${
                              currentStep === index ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{section.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {section.fields.length} fields
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
                
                {/* Auto-save Status */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center text-sm">
                    {autoSaveMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-blue-600">Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-gray-600">All changes saved</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <div className="lg:col-span-3 h-full overflow-y-auto">
              {sections[currentStep] && (
                <Card className="mb-8">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                          {sections[currentStep].name}
                        </CardTitle>
                        <p className="text-gray-600">
                          {sections[currentStep].description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1">Step</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {currentStep + 1} of {sections.length}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {sections[currentStep].fields.map((field) => (
                        <div 
                          key={field.fieldName} 
                          className={field.fieldType === 'textarea' ? 'md:col-span-2' : ''}
                        >
                          {renderField(field)}
                        </div>
                      ))}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={currentStep === 0}
                          className="px-6"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>

                        <div className="flex space-x-4">
                          {currentStep < sections.length - 1 ? (
                            <Button
                              onClick={handleNext}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                            >
                              Next Section
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          ) : (
                            <Button
                              onClick={handleSubmit}
                              disabled={finalSubmitMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white px-8"
                            >
                              {finalSubmitMutation.isPending ? 'Submitting...' : 'Submit Application'}
                              <CheckCircle className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}