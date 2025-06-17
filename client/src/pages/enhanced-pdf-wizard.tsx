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
  const [formStarted, setFormStarted] = useState(false);
  const [fieldsInteracted, setFieldsInteracted] = useState(new Set<string>());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for prospect validation token in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const prospectToken = urlParams.get('token');
  const isProspectMode = !!prospectToken;

  // Fetch prospect data if token is present
  const { data: prospectData } = useQuery({
    queryKey: ['/api/prospects/token', prospectToken],
    queryFn: async () => {
      if (!prospectToken) return null;
      const response = await fetch(`/api/prospects/token/${prospectToken}`);
      if (!response.ok) throw new Error('Invalid prospect token');
      return response.json();
    },
    enabled: !!prospectToken,
  });

  // Mutation to update prospect status to "in progress"
  const updateProspectStatusMutation = useMutation({
    mutationFn: async (prospectId: number) => {
      const response = await fetch(`/api/prospects/${prospectId}/start-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to update prospect status');
      }
      
      return response.json();
    },
  });

  // Fetch PDF form with fields (disable for prospect mode)
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
    enabled: !!id && !isProspectMode
  });

  // Create hardcoded form sections for prospect mode
  const prospectFormSections: FormSection[] = [
    {
      name: 'Merchant Information',
      description: 'Basic business details, contact information, and location data',
      icon: Building,
      fields: [
        { id: 1, fieldName: 'assignedAgent', fieldType: 'readonly', fieldLabel: 'Assigned Agent', isRequired: false, options: null, defaultValue: null, validation: null, position: 1, section: 'Merchant Information' },
        { id: 2, fieldName: 'companyName', fieldType: 'text', fieldLabel: 'Company Name', isRequired: true, options: null, defaultValue: null, validation: null, position: 2, section: 'Merchant Information' },
        { id: 3, fieldName: 'companyEmail', fieldType: 'email', fieldLabel: 'Company Email', isRequired: true, options: null, defaultValue: null, validation: null, position: 3, section: 'Merchant Information' },
        { id: 4, fieldName: 'companyPhone', fieldType: 'phone', fieldLabel: 'Company Phone', isRequired: true, options: null, defaultValue: null, validation: null, position: 4, section: 'Merchant Information' },
        { id: 5, fieldName: 'address', fieldType: 'text', fieldLabel: 'Business Address', isRequired: true, options: null, defaultValue: null, validation: null, position: 5, section: 'Merchant Information' },
        { id: 6, fieldName: 'city', fieldType: 'text', fieldLabel: 'City', isRequired: true, options: null, defaultValue: null, validation: null, position: 6, section: 'Merchant Information' },
        { id: 7, fieldName: 'state', fieldType: 'select', fieldLabel: 'State', isRequired: true, options: [
          'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
          'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 
          'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
          'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
          'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 
          'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
          'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
        ], defaultValue: null, validation: null, position: 7, section: 'Merchant Information' },
        { id: 8, fieldName: 'zipCode', fieldType: 'text', fieldLabel: 'ZIP Code', isRequired: true, options: null, defaultValue: null, validation: null, position: 8, section: 'Merchant Information' },
      ]
    },
    {
      name: 'Business Type & Tax Information',
      description: 'Business structure, tax identification, and regulatory compliance',
      icon: FileText,
      fields: [
        { id: 9, fieldName: 'federalTaxId', fieldType: 'text', fieldLabel: 'Federal Tax ID (EIN)', isRequired: true, options: null, defaultValue: null, validation: null, position: 9, section: 'Business Type & Tax Information' },
        { id: 10, fieldName: 'businessType', fieldType: 'select', fieldLabel: 'Business Type', isRequired: true, options: ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship'], defaultValue: null, validation: null, position: 10, section: 'Business Type & Tax Information' },
        { id: 11, fieldName: 'yearsInBusiness', fieldType: 'number', fieldLabel: 'Years in Business', isRequired: true, options: null, defaultValue: null, validation: null, position: 11, section: 'Business Type & Tax Information' },
      ]
    },
    {
      name: 'Products, Services & Processing',
      description: 'Business operations, products sold, and payment processing preferences',
      icon: CheckCircle,
      fields: [
        { id: 12, fieldName: 'businessDescription', fieldType: 'textarea', fieldLabel: 'Business Description', isRequired: true, options: null, defaultValue: null, validation: null, position: 12, section: 'Products, Services & Processing' },
        { id: 13, fieldName: 'productsServices', fieldType: 'textarea', fieldLabel: 'Products/Services Sold', isRequired: true, options: null, defaultValue: null, validation: null, position: 13, section: 'Products, Services & Processing' },
        { id: 14, fieldName: 'processingMethod', fieldType: 'select', fieldLabel: 'Primary Processing Method', isRequired: true, options: ['In-Person (Card Present)', 'Online (Card Not Present)', 'Both'], defaultValue: null, validation: null, position: 14, section: 'Products, Services & Processing' },
      ]
    },
    {
      name: 'Transaction Information',
      description: 'Financial data, volume estimates, and transaction processing details',
      icon: ArrowRight,
      fields: [
        { id: 15, fieldName: 'monthlyVolume', fieldType: 'number', fieldLabel: 'Expected Monthly Processing Volume ($)', isRequired: true, options: null, defaultValue: null, validation: null, position: 15, section: 'Transaction Information' },
        { id: 16, fieldName: 'averageTicket', fieldType: 'number', fieldLabel: 'Average Transaction Amount ($)', isRequired: true, options: null, defaultValue: null, validation: null, position: 16, section: 'Transaction Information' },
        { id: 17, fieldName: 'highestTicket', fieldType: 'number', fieldLabel: 'Highest Single Transaction ($)', isRequired: true, options: null, defaultValue: null, validation: null, position: 17, section: 'Transaction Information' },
      ]
    }
  ];

  // Create enhanced sections with descriptions and icons
  let sections: FormSection[] = [];
  
  if (isProspectMode) {
    sections = prospectFormSections;
  } else if (pdfForm?.fields) {
    sections = [
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
    ].filter(section => section.fields.length > 0);
  }

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

  // Initialize form data with agent and prospect information for prospects
  useEffect(() => {
    if (isProspectMode && prospectData?.prospect && prospectData?.agent) {
      setFormData(prev => ({
        ...prev,
        assignedAgent: `${prospectData.agent.firstName} ${prospectData.agent.lastName} (${prospectData.agent.email})`,
        companyEmail: prospectData.prospect.email
      }));
    }
  }, [isProspectMode, prospectData]);

  // Track when user starts filling out the form and update prospect status
  const handleFieldInteraction = (fieldName: string, value: any) => {
    if (prospectData?.prospect && !formStarted) {
      const newFieldsInteracted = new Set(fieldsInteracted);
      newFieldsInteracted.add(fieldName);
      setFieldsInteracted(newFieldsInteracted);

      // Check if user has interacted with the first 3 required fields
      const requiredFirstFields = ['legalBusinessName', 'federalTaxId', 'companyEmail'];
      const hasInteractedWithFirstThree = requiredFirstFields.every(field => 
        newFieldsInteracted.has(field)
      );

      if (hasInteractedWithFirstThree && !formStarted) {
        setFormStarted(true);
        updateProspectStatusMutation.mutate(prospectData.prospect.id);
      }
    }
  };

  // Format phone number to (XXX) XXX-XXXX format
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // Return original if not a valid format
    return value;
  };

  // Address validation and autocomplete state
  const [addressValidationStatus, setAddressValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Fetch address suggestions using Google Places Autocomplete API
  const fetchAddressSuggestions = async (input: string) => {
    if (input.length < 4) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    
    try {
      const response = await fetch('/api/address-autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setAddressSuggestions(result.suggestions || []);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Select an address suggestion and populate all fields
  const selectAddressSuggestion = async (suggestion: any) => {
    setShowSuggestions(false);
    setAddressValidationStatus('validating');
    
    try {
      const response = await fetch('/api/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: suggestion.description }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.isValid) {
          setAddressValidationStatus('valid');
          
          // Auto-populate all address fields
          const newFormData = { ...formData };
          newFormData.address = result.formattedAddress;
          if (result.city) newFormData.city = result.city;
          if (result.state) newFormData.state = result.state;
          if (result.zipCode) newFormData.zipCode = result.zipCode;
          
          setFormData(newFormData);
        } else {
          setAddressValidationStatus('invalid');
        }
      } else {
        setAddressValidationStatus('invalid');
      }
    } catch (error) {
      console.error('Address validation error:', error);
      setAddressValidationStatus('invalid');
    }
  };

  // Validate address using Google Maps Geocoding API
  const validateAddress = async (address: string) => {
    if (!address.trim()) return;
    
    setAddressValidationStatus('validating');
    
    try {
      const response = await fetch('/api/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.isValid) {
          setAddressValidationStatus('valid');
          
          // Auto-populate city, state, and zip if found
          const newFormData = { ...formData };
          if (result.city) newFormData.city = result.city;
          if (result.state) newFormData.state = result.state;
          if (result.zipCode) newFormData.zipCode = result.zipCode;
          if (result.formattedAddress) newFormData.address = result.formattedAddress;
          
          setFormData(newFormData);
        } else {
          setAddressValidationStatus('invalid');
        }
      } else {
        setAddressValidationStatus('invalid');
      }
    } catch (error) {
      console.error('Address validation error:', error);
      setAddressValidationStatus('invalid');
    }
  };

  // Handle phone number formatting on blur
  const handlePhoneBlur = (fieldName: string, value: string) => {
    if (fieldName === 'companyPhone') {
      const formatted = formatPhoneNumber(value);
      if (formatted !== value) {
        const newFormData = { ...formData, [fieldName]: formatted };
        setFormData(newFormData);
      }
    }
  };

  // Handle address validation on blur
  const handleAddressBlur = (fieldName: string, value: string) => {
    if (fieldName === 'address' && value.trim()) {
      validateAddress(value);
    }
  };

  // Handle field changes with auto-save
  const handleFieldChange = (fieldName: string, value: any) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);
    
    // Track field interaction for prospect status update
    handleFieldInteraction(fieldName, value);
    
    // Trigger address autocomplete for address field
    if (fieldName === 'address') {
      setAddressValidationStatus('idle');
      fetchAddressSuggestions(value);
    }
    
    // Auto-save after 2 seconds of no changes (only for authenticated users, not prospects)
    if (!isProspectMode) {
      setTimeout(() => {
        autoSaveMutation.mutate(newFormData);
      }, 2000);
    }
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
            <div className="relative">
              <Input
                id={field.fieldName}
                type={field.fieldType === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
                onBlur={(e) => {
                  handlePhoneBlur(field.fieldName, e.target.value);
                  // Delay hiding suggestions to allow for click
                  if (field.fieldName === 'address') {
                    setTimeout(() => {
                      setShowSuggestions(false);
                      handleAddressBlur(field.fieldName, e.target.value);
                    }, 150);
                  } else {
                    handleAddressBlur(field.fieldName, e.target.value);
                  }
                }}
                onFocus={(e) => {
                  if (field.fieldName === 'address' && e.target.value.length >= 4) {
                    setShowSuggestions(addressSuggestions.length > 0);
                  }
                }}
                className={`${hasError ? 'border-red-500' : ''} ${
                  isProspectMode && field.fieldName === 'companyEmail' ? 'bg-gray-50 cursor-not-allowed' : ''
                } ${
                  field.fieldName === 'address' && addressValidationStatus === 'valid' ? 'border-green-500' : ''
                } ${
                  field.fieldName === 'address' && addressValidationStatus === 'invalid' ? 'border-red-500' : ''
                }`}
                placeholder={field.fieldType === 'email' ? 'Enter email address' : 
                            field.fieldType === 'phone' ? 'Enter phone number' : 
                            field.fieldName === 'address' ? 'Enter full business address' :
                            `Enter ${field.fieldLabel.toLowerCase()}`}
                readOnly={isProspectMode && field.fieldName === 'companyEmail'}
              />
              
              {/* Address autocomplete suggestions */}
              {field.fieldName === 'address' && showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {isLoadingSuggestions ? (
                    <div className="p-3 text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading suggestions...
                    </div>
                  ) : addressSuggestions.length > 0 ? (
                    addressSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => selectAddressSuggestion(suggestion)}
                      >
                        <div className="font-medium text-gray-900">{suggestion.structured_formatting?.main_text || suggestion.description}</div>
                        <div className="text-sm text-gray-500">{suggestion.structured_formatting?.secondary_text || ''}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">No suggestions found</div>
                  )}
                </div>
              )}
              
              {field.fieldName === 'address' && (addressValidationStatus === 'validating' || isLoadingSuggestions) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
              {field.fieldName === 'address' && addressValidationStatus === 'valid' && !isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600">
                  ✓
                </div>
              )}
              {field.fieldName === 'address' && addressValidationStatus === 'invalid' && !isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-600">
                  ⚠
                </div>
              )}
            </div>
            {field.fieldName === 'address' && addressValidationStatus === 'valid' && (
              <p className="text-xs text-green-600">✓ Address validated and auto-populated city, state, and ZIP</p>
            )}
            {field.fieldName === 'address' && addressValidationStatus === 'invalid' && (
              <p className="text-xs text-red-600">⚠ Please enter a valid address</p>
            )}
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

      case 'readonly':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
            </Label>
            <Input
              id={field.fieldName}
              type="text"
              value={value}
              readOnly
              className="bg-gray-50 cursor-not-allowed"
              placeholder="Loading agent information..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  // For prospect mode, show loading if prospect data isn't loaded yet
  if (isProspectMode && !prospectData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // For authenticated mode, show loading and error states for PDF form
  if (!isProspectMode) {
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
                  {isProspectMode ? 'Merchant Processing Application' : (pdfForm?.name || 'Form')}
                </h1>
                <p className="text-gray-600">
                  {isProspectMode 
                    ? `Welcome ${prospectData?.prospect?.firstName || ''}! Complete your merchant application below - All changes are saved automatically`
                    : `${pdfForm?.description || 'Form'} - All changes are saved automatically`
                  }
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