import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Building } from "lucide-react";
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
    queryKey: [`/api/pdf-forms/${id}/with-fields`],
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
      const response = await apiRequest('POST', `/api/pdf-forms/${id}/submissions`, {
        formData: data,
        isComplete: false
      });
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
      const response = await apiRequest('POST', `/api/pdf-forms/${id}/submissions`, {
        formData: data,
        isComplete: true
      });
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
    
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
    
    // Auto-save after 1 second delay
    setTimeout(() => {
      autoSaveMutation.mutate(newFormData);
    }, 1000);
  };

  // Validate current section
  const validateCurrentSection = (): boolean => {
    const currentSectionFields = sections[currentStep]?.fields || [];
    const errors: Record<string, string> = {};
    let isValid = true;

    currentSectionFields.forEach(field => {
      const value = formData[field.fieldName];
      
      if (field.isRequired && (!value || value === '')) {
        errors[field.fieldName] = 'This field is required';
        isValid = false;
      }
      
      // Additional validation based on field type
      if (value && field.validation) {
        try {
          const validation = JSON.parse(field.validation);
          
          if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
            errors[field.fieldName] = 'Invalid format';
            isValid = false;
          }
          
          if (validation.minLength && value.length < validation.minLength) {
            errors[field.fieldName] = `Minimum ${validation.minLength} characters required`;
            isValid = false;
          }
          
          if (validation.maxLength && value.length > validation.maxLength) {
            errors[field.fieldName] = `Maximum ${validation.maxLength} characters allowed`;
            isValid = false;
          }
        } catch (e) {
          // Ignore invalid validation JSON
        }
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  // Enhanced field rendering
  const renderField = (field: FormField) => {
    const value = formData[field.fieldName] || field.defaultValue || '';
    const hasError = validationErrors[field.fieldName];
    
    // Get enhanced field properties
    const getFieldProperties = (fieldName: string) => {
      const properties: { placeholder?: string; helpText?: string } = {};
      
      switch (fieldName) {
        case 'legalBusinessName':
          properties.placeholder = 'Enter legal business name as filed with IRS';
          properties.helpText = 'Must match IRS records exactly';
          break;
        case 'taxId':
          properties.placeholder = '12-3456789';
          properties.helpText = 'Federal Employer Identification Number';
          break;
        case 'companyPhone':
        case 'descriptorPhone':
        case 'mobilePhone':
        case 'faxNumber':
          properties.placeholder = '(555) 123-4567';
          break;
        case 'companyEmail':
          properties.placeholder = 'business@company.com';
          break;
        case 'companyWebsite':
          properties.placeholder = 'https://www.example.com';
          break;
        case 'locationZipCode':
        case 'mailingZipCode':
          properties.placeholder = '12345 or 12345-6789';
          break;
        case 'merchantSells':
          properties.placeholder = 'Describe the products and/or services your business sells';
          break;
        case 'avgMonthlyVolume':
          properties.placeholder = '10000';
          properties.helpText = 'Average monthly credit card processing volume in dollars';
          break;
        case 'foreignEntity':
          properties.helpText = 'Check if applicable and attach IRS Form W-8';
          break;
        default:
          properties.placeholder = `Enter ${field.fieldLabel.toLowerCase()}`;
      }
      
      return properties;
    };

    const { placeholder, helpText } = getFieldProperties(field.fieldName);
    const commonClasses = `w-full transition-colors ${hasError ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`;

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type={field.fieldType === 'email' ? 'email' : field.fieldType === 'url' ? 'url' : field.fieldType === 'phone' ? 'tel' : 'text'}
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              placeholder={placeholder}
              className={commonClasses}
            />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, parseFloat(e.target.value) || 0)}
              placeholder={placeholder}
              className={commonClasses}
              step="0.01"
            />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      case 'select':
        const selectOptions = (field.options || []).filter(option => option && option.trim() !== '');
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
                {selectOptions.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
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
              placeholder={placeholder}
              className={`${commonClasses} min-h-[120px]`}
              rows={5}
            />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id={field.fieldName}
                checked={value === 'true' || value === true}
                onCheckedChange={(checked) => handleFieldChange(field.fieldName, checked)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700 cursor-pointer leading-relaxed">
                  {field.fieldLabel}
                  {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
              </div>
            </div>
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
              className={commonClasses}
            />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            {hasError && <p className="text-xs text-red-500">{hasError}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  // Navigate to next step
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

  // Navigate to previous step
  const handlePrevious = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  // Submit final application
  const handleSubmit = () => {
    if (validateCurrentSection()) {
      finalSubmitMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading Wells Fargo Merchant Application...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-800">
            Error loading form: {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Section Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Sections</h3>
              <nav className="space-y-2">
                {sections.map((section, index) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-full text-left p-4 rounded-lg text-sm transition-colors ${
                        index === currentStep
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className="w-5 h-5" />
                        <div className="flex-1">
                          <div className="font-medium">{section.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{section.description}</div>
                        </div>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          index === currentStep
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
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

          {/* Form Content */}
          <div className="lg:col-span-3">
            {sections[currentStep] && (
              <Card className="p-8">
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
                
                <CardContent>
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
                </CardContent>

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
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}