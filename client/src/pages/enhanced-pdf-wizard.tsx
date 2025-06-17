import React, { useState, useEffect } from 'react';
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
import { Building, FileText, CheckCircle, ArrowLeft, ArrowRight, Users, Upload, Signature } from 'lucide-react';

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

  // Debug form data changes
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  // Check for any cached data on component mount
  useEffect(() => {
    console.log('Component mounted, checking for cached data...');
    console.log('localStorage keys:', Object.keys(localStorage));
    console.log('sessionStorage keys:', Object.keys(sessionStorage));
    
    // Clear any potential cached address data
    const addressKeys = ['address', 'city', 'state', 'zipCode'];
    addressKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`Found cached ${key}:`, localStorage.getItem(key));
        localStorage.removeItem(key);
      }
      if (sessionStorage.getItem(key)) {
        console.log(`Found cached ${key}:`, sessionStorage.getItem(key));
        sessionStorage.removeItem(key);
      }
    });
  }, []);
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
        { id: 6, fieldName: 'addressLine2', fieldType: 'text', fieldLabel: 'Address Line 2', isRequired: false, options: null, defaultValue: null, validation: null, position: 6, section: 'Merchant Information' },
        { id: 7, fieldName: 'city', fieldType: 'text', fieldLabel: 'City', isRequired: true, options: null, defaultValue: null, validation: null, position: 7, section: 'Merchant Information' },
        { id: 8, fieldName: 'state', fieldType: 'select', fieldLabel: 'State', isRequired: true, options: [
          'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
          'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 
          'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
          'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
          'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 
          'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
          'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
        ], defaultValue: null, validation: null, position: 8, section: 'Merchant Information' },
        { id: 9, fieldName: 'zipCode', fieldType: 'text', fieldLabel: 'ZIP Code', isRequired: true, options: null, defaultValue: null, validation: null, position: 9, section: 'Merchant Information' },
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
      name: 'Business Ownership',
      description: 'Ownership structure and signature requirements for owners with 25% or more ownership',
      icon: Users,
      fields: [
        { id: 15, fieldName: 'owners', fieldType: 'ownership', fieldLabel: 'Business Owners', isRequired: true, options: null, defaultValue: null, validation: null, position: 15, section: 'Business Ownership' },
      ]
    },
    {
      name: 'Products, Services & Processing',
      description: 'Business operations, products sold, and payment processing preferences',
      icon: CheckCircle,
      fields: [
        { id: 16, fieldName: 'businessDescription', fieldType: 'textarea', fieldLabel: 'Business Description', isRequired: true, options: null, defaultValue: null, validation: null, position: 16, section: 'Products, Services & Processing' },
        { id: 17, fieldName: 'productsServices', fieldType: 'textarea', fieldLabel: 'Products/Services Sold', isRequired: true, options: null, defaultValue: null, validation: null, position: 17, section: 'Products, Services & Processing' },
        { id: 18, fieldName: 'processingMethod', fieldType: 'select', fieldLabel: 'Primary Processing Method', isRequired: true, options: ['In-Person (Card Present)', 'Online (Card Not Present)', 'Both'], defaultValue: null, validation: null, position: 18, section: 'Products, Services & Processing' },
      ]
    },
    {
      name: 'Transaction Information',
      description: 'Financial data, volume estimates, and transaction processing details',
      icon: ArrowRight,
      fields: [
        { id: 19, fieldName: 'monthlyVolume', fieldType: 'number', fieldLabel: 'Expected Monthly Processing Volume ($)', isRequired: true, options: null, defaultValue: null, validation: null, position: 19, section: 'Transaction Information' },
        { id: 20, fieldName: 'averageTicket', fieldType: 'number', fieldLabel: 'Average Transaction Amount ($)', isRequired: true, options: null, defaultValue: null, validation: null, position: 20, section: 'Transaction Information' },
        { id: 21, fieldName: 'highestTicket', fieldType: 'number', fieldLabel: 'Highest Single Transaction ($)', isRequired: true, options: null, defaultValue: null, validation: null, position: 21, section: 'Transaction Information' },
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

  // Save form data mutation for prospects
  const saveFormDataMutation = useMutation({
    mutationFn: async (data: { formData: Record<string, any>; currentStep: number }) => {
      if (isProspectMode && prospectData?.prospect) {
        const response = await fetch(`/api/prospects/${prospectData.prospect.id}/save-form-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            formData: data.formData,
            currentStep: data.currentStep
          }),
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Save failed');
        }
        return response.json();
      }
      return null;
    },
    onSuccess: () => {
      console.log('Form data saved successfully');
    },
    onError: (error) => {
      console.error('Save failed:', error);
    }
  });

  // Auto-save mutation for regular PDF forms
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
      const newData = {
        assignedAgent: `${prospectData.agent.firstName} ${prospectData.agent.lastName} (${prospectData.agent.email})`,
        companyEmail: prospectData.prospect.email
      };
      console.log('Setting initial prospect data:', newData);
      
      // Load existing form data if available
      if (prospectData.prospect.formData) {
        try {
          const existingFormData = typeof prospectData.prospect.formData === 'string' 
            ? JSON.parse(prospectData.prospect.formData) 
            : prospectData.prospect.formData;
          
          console.log('Loading existing form data:', existingFormData);
          setFormData(prev => ({
            ...prev,
            ...newData,
            ...existingFormData
          }));
          
          // Set current step from saved data
          if (prospectData.prospect.currentStep !== null && prospectData.prospect.currentStep !== undefined) {
            setCurrentStep(prospectData.prospect.currentStep);
          }
        } catch (error) {
          console.error('Error parsing existing form data:', error);
          setFormData(prev => ({
            ...prev,
            ...newData
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          ...newData
        }));
      }
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
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [addressFieldsLocked, setAddressFieldsLocked] = useState(false);

  // Fetch address suggestions using Google Places Autocomplete API
  const fetchAddressSuggestions = async (input: string) => {
    if (input.length < 4) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
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
        setSelectedSuggestionIndex(-1);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Select an address suggestion and populate all fields
  const selectAddressSuggestion = async (suggestion: any) => {
    console.log('Selecting address suggestion:', suggestion);
    
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setAddressValidationStatus('validating');
    
    // Clear any existing validation errors
    setValidationErrors({});
    
    // Immediately clear and populate address fields from the suggestion
    const newFormData = { ...formData };
    
    // Clear all address-related fields first to prevent old data
    newFormData.address = '';
    newFormData.city = '';
    newFormData.state = '';
    newFormData.zipCode = '';
    
    // Extract address components from suggestion
    const mainText = suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0].trim();
    const secondaryText = suggestion.structured_formatting?.secondary_text || '';
    
    // Parse city and state from secondary text if available
    let suggestedCity = '';
    let suggestedState = '';
    
    if (secondaryText) {
      const parts = secondaryText.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        suggestedCity = parts[0];
        suggestedState = parts[1].split(' ')[0]; // Get state code, ignore ZIP
      } else if (parts.length === 1) {
        // Could be just city or just state
        if (parts[0].length === 2) {
          suggestedState = parts[0];
        } else {
          suggestedCity = parts[0];
        }
      }
    }
    
    // Set initial values from suggestion
    newFormData.address = mainText;
    if (suggestedCity) newFormData.city = suggestedCity;
    if (suggestedState) newFormData.state = suggestedState;
    
    setFormData(newFormData);
    console.log('Initial form data from suggestion:', newFormData);
    
    // Use Google Places Details API for precise data with place_id
    try {
      const response = await fetch('/api/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address: suggestion.description,
          placeId: suggestion.place_id
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Address validation result:', result);
        
        if (result.isValid) {
          setAddressValidationStatus('valid');
          
          // Create completely fresh form data to avoid any merging issues
          const finalFormData = { ...formData };
          
          // Override ALL address fields with API results - force clear first
          delete finalFormData.address;
          delete finalFormData.city;
          delete finalFormData.state;
          delete finalFormData.zipCode;
          
          // Set new address data
          finalFormData.address = result.streetAddress || mainText;
          finalFormData.city = result.city || suggestedCity;
          finalFormData.state = result.state || suggestedState;
          finalFormData.zipCode = result.zipCode || '';
          
          console.log('About to set final form data:', finalFormData);
          setFormData(finalFormData);
          console.log('Final validated form data set:', finalFormData);
          
          // Lock the address fields after successful autocomplete selection
          setAddressFieldsLocked(true);
          
          // Force clear and update DOM input fields directly to override any browser persistence
          setTimeout(() => {
            const addressField = document.querySelector('input[id*="address"]:not([id*="addressLine2"])') as HTMLInputElement;
            const cityField = document.querySelector('input[id*="city"]') as HTMLInputElement;
            const stateField = document.querySelector('select[id*="state"], input[id*="state"]') as HTMLInputElement;
            const zipField = document.querySelector('input[id*="zip"]') as HTMLInputElement;
            
            if (addressField) {
              addressField.value = finalFormData.address || '';
              console.log('Set address field value:', addressField.value);
            }
            if (cityField) {
              cityField.value = finalFormData.city || '';
              console.log('Set city field value:', cityField.value);
            }
            if (stateField) {
              stateField.value = finalFormData.state || '';
              console.log('Set state field value:', stateField.value);
            }
            if (zipField) {
              zipField.value = finalFormData.zipCode || '';
              console.log('Set zip field value:', zipField.value);
            }
            
            // Auto-focus to address line 2 field after successful selection
            const addressLine2Field = document.querySelector('input[id*="addressLine2"]') as HTMLInputElement;
            if (addressLine2Field) {
              addressLine2Field.focus();
            }
          }, 100);
        } else {
          setAddressValidationStatus('invalid');
        }
      } else {
        console.error('Address validation API error:', response.status);
        setAddressValidationStatus('invalid');
      }
    } catch (error) {
      console.error('Address validation network error:', error);
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
          
          // Auto-populate city, state, and zip if found, use street address only for address field
          const newFormData = { ...formData };
          if (result.streetAddress) newFormData.address = result.streetAddress;
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
      // Clear city, state, zip when manually typing new address
      if (value && value.length >= 4) {
        fetchAddressSuggestions(value);
      } else {
        setShowSuggestions(false);
        setAddressSuggestions([]);
        setSelectedSuggestionIndex(-1);
        // Clear address-related fields when address is short
        if (value.length < 4) {
          const clearedFormData = { ...newFormData };
          clearedFormData.city = '';
          clearedFormData.state = '';
          clearedFormData.zipCode = '';
          setFormData(clearedFormData);
        }
      }
    }
    
    // Auto-save after 2 seconds of no changes (only for authenticated users, not prospects)
    if (!isProspectMode) {
      setTimeout(() => {
        autoSaveMutation.mutate(newFormData);
      }, 2000);
    }
  };

  // Handle input blur with delay to allow suggestion selection
  const handleAddressInputBlur = (fieldName: string, value: string) => {
    // Delay hiding suggestions to allow for selection clicks
    setTimeout(() => {
      if (fieldName === 'address') {
        setShowSuggestions(false);
        if (value.trim()) {
          validateAddress(value);
        }
      }
    }, 200);
  };

  // Validation function
  const validateField = (field: FormField, value: any): string | null => {
    // Special validation for ownership field
    if (field.fieldType === 'ownership') {
      const owners = value || [];
      
      if (field.isRequired && owners.length === 0) {
        return 'At least one owner is required';
      }

      // Validate each owner
      for (let i = 0; i < owners.length; i++) {
        const owner = owners[i];
        if (!owner.name || !owner.name.trim()) {
          return `Owner ${i + 1}: Name is required`;
        }
        if (!owner.email || !owner.email.trim()) {
          return `Owner ${i + 1}: Email is required`;
        }
        if (!owner.percentage || isNaN(parseFloat(owner.percentage))) {
          return `Owner ${i + 1}: Valid ownership percentage is required`;
        }
        
        const percentage = parseFloat(owner.percentage);
        if (percentage <= 0 || percentage > 100) {
          return `Owner ${i + 1}: Ownership percentage must be between 0.01 and 100`;
        }

        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(owner.email)) {
          return `Owner ${i + 1}: Please enter a valid email address`;
        }

        // Check signature requirement for owners with >25%
        if (percentage > 25 && !owner.signature) {
          return `Owner ${i + 1}: Signature required for ownership > 25%`;
        }
      }

      // Validate total percentage equals 100%
      const total = owners.reduce((sum: number, owner: any) => {
        return sum + (parseFloat(owner.percentage) || 0);
      }, 0);

      if (Math.abs(total - 100) > 0.01) {
        return `Total ownership must equal 100% (currently ${total.toFixed(2)}%)`;
      }

      return null;
    }

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
      // Save form data for prospects before navigating to next section
      if (isProspectMode) {
        const nextStep = Math.min(sections.length - 1, currentStep + 1);
        saveFormDataMutation.mutate({
          formData: formData,
          currentStep: nextStep
        });
      }
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

  // Render ownership field with multiple owners and signature requirements
  const renderOwnershipField = (field: FormField) => {
    const owners = formData.owners || [{ name: '', email: '', percentage: '', signature: null, signatureType: null }];
    const hasError = validationErrors[field.fieldName];

    const addOwner = () => {
      const newOwners = [...owners, { name: '', email: '', percentage: '', signature: null, signatureType: null }];
      handleFieldChange('owners', newOwners);
    };

    const removeOwner = (index: number) => {
      const newOwners = owners.filter((_: any, i: number) => i !== index);
      handleFieldChange('owners', newOwners);
    };

    const updateOwner = (index: number, field: string, value: any) => {
      const newOwners = [...owners];
      newOwners[index] = { ...newOwners[index], [field]: value };
      handleFieldChange('owners', newOwners);
    };

    const handleSignatureUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          updateOwner(index, 'signature', e.target?.result);
          updateOwner(index, 'signatureType', 'upload');
        };
        reader.readAsDataURL(file);
      }
    };

    const getTotalPercentage = () => {
      return owners.reduce((total: number, owner: any) => {
        const percentage = parseFloat(owner.percentage) || 0;
        return total + percentage;
      }, 0);
    };

    const isValidPercentage = () => {
      const total = getTotalPercentage();
      return Math.abs(total - 100) < 0.01; // Allow for small floating point differences
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">
            {field.fieldLabel}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Button
            type="button"
            onClick={addOwner}
            size="sm"
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Add Owner
          </Button>
        </div>

        <div className="space-y-4">
          {owners.map((owner: any, index: number) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Owner {index + 1}</h4>
                  {owners.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeOwner(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Owner Name *</Label>
                    <Input
                      value={owner.name || ''}
                      onChange={(e) => updateOwner(index, 'name', e.target.value)}
                      placeholder="Full name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Email Address *</Label>
                    <Input
                      type="email"
                      value={owner.email || ''}
                      onChange={(e) => updateOwner(index, 'email', e.target.value)}
                      placeholder="owner@company.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Ownership % *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={owner.percentage || ''}
                      onChange={(e) => updateOwner(index, 'percentage', e.target.value)}
                      placeholder="25.00"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Signature requirement for owners with >25% */}
                {parseFloat(owner.percentage) > 25 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2 mb-3">
                      <Signature className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Signature Required</p>
                        <p className="text-xs text-amber-700">
                          Owners with more than 25% ownership must provide a signature
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-gray-600">Upload Signature Image</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload(index, e)}
                            className="flex-1"
                          />
                          <Upload className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      {owner.signature && owner.signatureType === 'upload' && (
                        <div className="mt-2">
                          <p className="text-xs text-green-600 mb-2">✓ Signature uploaded</p>
                          <img 
                            src={owner.signature} 
                            alt="Signature" 
                            className="max-h-20 border rounded"
                          />
                        </div>
                      )}

                      <div className="text-center text-xs text-gray-500">
                        or
                      </div>

                      <div>
                        <Label className="text-sm text-gray-600">Send Email for Digital Signature</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full mt-1"
                          onClick={() => {
                            // TODO: Implement email signature request
                            toast({
                              title: "Email Sent",
                              description: `Signature request sent to ${owner.email}`,
                            });
                          }}
                          disabled={!owner.email}
                        >
                          Send Signature Request
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Ownership validation summary */}
        <div className={`p-3 rounded-lg border ${
          isValidPercentage() 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Total Ownership: {getTotalPercentage().toFixed(2)}%
            </span>
            {isValidPercentage() ? (
              <span className="text-green-600 text-sm">✓ Valid</span>
            ) : (
              <span className="text-red-600 text-sm">Must equal 100%</span>
            )}
          </div>
        </div>

        {hasError && <p className="text-xs text-red-500">{hasError}</p>}
      </div>
    );
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
                  if (field.fieldName === 'address') {
                    handleAddressInputBlur(field.fieldName, e.target.value);
                  }
                }}
                onFocus={(e) => {
                  if (field.fieldName === 'address' && e.target.value.length >= 4) {
                    setShowSuggestions(addressSuggestions.length > 0);
                  }
                }}
                onKeyDown={(e) => {
                  if (field.fieldName === 'address' && showSuggestions && addressSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedSuggestionIndex(prev => 
                        prev < addressSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedSuggestionIndex(prev => 
                        prev > 0 ? prev - 1 : addressSuggestions.length - 1
                      );
                    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                      e.preventDefault();
                      selectAddressSuggestion(addressSuggestions[selectedSuggestionIndex]);
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }
                  }
                }}
                className={`${hasError ? 'border-red-500' : ''} ${
                  isProspectMode && field.fieldName === 'companyEmail' ? 'bg-gray-50 cursor-not-allowed' : ''
                } ${
                  field.fieldName === 'address' && addressValidationStatus === 'valid' ? 'border-green-500' : ''
                } ${
                  field.fieldName === 'address' && addressValidationStatus === 'invalid' ? 'border-red-500' : ''
                } ${
                  addressFieldsLocked && (field.fieldName === 'city' || field.fieldName === 'zipCode') ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder={field.fieldType === 'email' ? 'Enter email address' : 
                            field.fieldType === 'phone' ? 'Enter phone number' : 
                            field.fieldName === 'address' ? 'Enter street address (e.g., 123 Main St)' :
                            field.fieldName === 'addressLine2' ? 'Suite, apt, floor, etc. (optional)' :
                            `Enter ${field.fieldLabel.toLowerCase()}`}
                readOnly={
                  (isProspectMode && field.fieldName === 'companyEmail') ||
                  (addressFieldsLocked && (field.fieldName === 'city' || field.fieldName === 'zipCode'))
                }
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
                        className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                          index === selectedSuggestionIndex 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-100'
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent blur event
                          selectAddressSuggestion(suggestion);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      >
                        <div className={`font-medium ${
                          index === selectedSuggestionIndex ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {suggestion.structured_formatting?.main_text || suggestion.description}
                        </div>
                        <div className={`text-sm ${
                          index === selectedSuggestionIndex ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {suggestion.structured_formatting?.secondary_text || ''}
                        </div>
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-green-600">✓ Street address validated and auto-populated city, state, and ZIP</p>
                {addressFieldsLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressFieldsLocked(false);
                      setAddressValidationStatus('idle');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Edit Address
                  </button>
                )}
              </div>
            )}
            {field.fieldName === 'address' && addressValidationStatus === 'invalid' && (
              <p className="text-xs text-red-600">⚠ Please enter a valid address</p>
            )}
            {addressFieldsLocked && (field.fieldName === 'city' || field.fieldName === 'state' || field.fieldName === 'zipCode') && (
              <p className="text-xs text-gray-500">✓ Auto-populated from address selection - Click "Edit Address" to modify</p>
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
            <Select 
              value={value} 
              onValueChange={(val) => handleFieldChange(field.fieldName, val)}
              disabled={addressFieldsLocked && field.fieldName === 'state'}
            >
              <SelectTrigger className={`${hasError ? 'border-red-500' : ''} ${
                addressFieldsLocked && field.fieldName === 'state' ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}>
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

      case 'ownership':
        return renderOwnershipField(field);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header - Fixed */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isProspectMode ? 'Merchant Processing Application' : (pdfForm?.name || 'Form')}
                </h1>
                <p className="text-gray-600 text-sm">
                  {isProspectMode 
                    ? `Welcome ${prospectData?.prospect?.firstName || ''}! Complete your application - all changes save automatically`
                    : `${pdfForm?.description || 'Form'} - all changes save automatically`
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {Math.round(((currentStep + 1) / sections.length) * 100)}%
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                Step {currentStep + 1} of {sections.length}
              </span>
              <span className="text-xs text-gray-500">
                {sections[currentStep]?.name}
              </span>
            </div>
            <Progress 
              value={((currentStep + 1) / sections.length) * 100} 
              className="h-3 bg-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Section Navigation - Fixed Height */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 h-fit sticky top-28">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Application Sections</h3>
                <nav className="space-y-3">
                  {sections.map((section, index) => {
                    const IconComponent = section.icon;
                    const isActive = currentStep === index;
                    const isCompleted = index < currentStep;
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-800 shadow-md transform scale-[1.02]'
                            : isCompleted
                            ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-800 hover:shadow-sm'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                        } border`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isActive ? 'bg-blue-200 shadow-sm' : isCompleted ? 'bg-green-200' : 'bg-gray-200'
                          }`}>
                            <IconComponent className={`w-5 h-5 ${
                              isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{section.name}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
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
            <div className="lg:col-span-4">
              {sections[currentStep] && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          {React.createElement(sections[currentStep].icon, {
                            className: "w-6 h-6 text-blue-600"
                          })}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            {sections[currentStep].name}
                          </h2>
                          <p className="text-gray-600 mt-1">
                            {sections[currentStep].description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Step</div>
                        <div className="text-xl font-bold text-blue-600">
                          {currentStep + 1} of {sections.length}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <div className={`grid gap-8 ${
                      sections[currentStep].fields.some(f => f.fieldType === 'ownership') 
                        ? 'grid-cols-1' 
                        : 'grid-cols-1 lg:grid-cols-2'
                    }`}>
                      {sections[currentStep].fields.map((field) => (
                        <div 
                          key={field.fieldName} 
                          className={`${
                            field.fieldType === 'textarea' || field.fieldType === 'ownership' 
                              ? 'lg:col-span-full' 
                              : ''
                          }`}
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}