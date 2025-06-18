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
import { Building, FileText, CheckCircle, ArrowLeft, ArrowRight, Users, Upload, Signature, PenTool, Type, RotateCcw, Check, X } from 'lucide-react';

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
  const [addressOverrideActive, setAddressOverrideActive] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [addressFieldsLocked, setAddressFieldsLocked] = useState(false);
  const [addressValidationStatus, setAddressValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for submitted signatures when form data changes
  useEffect(() => {
    // Add a small delay to ensure form data is fully loaded
    const timer = setTimeout(async () => {
      if (!formData.owners || !Array.isArray(formData.owners)) {
        console.log('No owners array found');
        return;
      }
      
      console.log('Checking for submitted signatures...', formData.owners);
      
      const updatedOwners = [...formData.owners];
      let hasUpdates = false;
      
      for (let i = 0; i < updatedOwners.length; i++) {
        const owner = updatedOwners[i];
        
        console.log(`Checking owner ${owner.name}:`, {
          hasSignature: !!owner.signature,
          signatureToken: owner.signatureToken
        });
        
        // Skip if owner already has a signature or no signature token
        if (owner.signature || !owner.signatureToken) {
          console.log(`Skipping ${owner.name}: ${owner.signature ? 'already has signature' : 'no signature token'}`);
          continue;
        }
        
        try {
          console.log(`Fetching signature for token: ${owner.signatureToken}`);
          const response = await fetch(`/api/signature/${owner.signatureToken}`);
          console.log(`Response status: ${response.status}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log('Signature API response:', result);
            
            if (result.success && result.signature) {
              updatedOwners[i] = {
                ...owner,
                signature: result.signature.signature,
                signatureType: result.signature.signatureType
              };
              hasUpdates = true;
              console.log(`Found submitted signature for ${owner.name}`);
            }
          } else {
            console.log(`No signature found for ${owner.name} (${response.status})`);
          }
        } catch (error) {
          console.log(`Error checking signature for ${owner.name}:`, error);
        }
      }
      
      if (hasUpdates) {
        console.log('Updating form data with signatures');
        setFormData(prev => ({
          ...prev,
          owners: updatedOwners
        }));
      } else {
        console.log('No signature updates found');
      }
    }, 100); // Small delay to ensure form data is fully loaded
    
    return () => clearTimeout(timer);
  }, [formData.owners]); // Trigger when owners array changes

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

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      const response = await fetch(`/api/pdf-forms/${id}/auto-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to auto-save form data');
      }
      
      return response.json();
    },
  });

  // Save form data mutation for prospects
  const saveFormDataMutation = useMutation({
    mutationFn: async ({ formData, currentStep }: { formData: Record<string, any>; currentStep: number }) => {
      if (!prospectData?.prospect?.id) {
        throw new Error('No prospect ID available');
      }
      
      const response = await fetch(`/api/prospects/${prospectData.prospect.id}/save-form-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData, currentStep }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save form data');
      }
      
      return response.json();
    },
  });

  // Submit application mutation
  const submitApplicationMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      if (!prospectData?.prospect?.id) {
        throw new Error('No prospect ID available');
      }
      
      const response = await fetch(`/api/prospects/${prospectData.prospect.id}/submit-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle comprehensive validation errors
        if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
          const validationErrors = ['Application incomplete. Please complete the following:'];
          
          // Add general validation errors
          validationErrors.push(...errorData.validationErrors.map((error: string) => `• ${error}`));
          
          // Add specific signature information if present
          if (errorData.missingSignatures && Array.isArray(errorData.missingSignatures)) {
            validationErrors.push('');
            validationErrors.push('Missing signatures from:');
            validationErrors.push(...errorData.missingSignatures.map((owner: any) => 
              `• ${owner.name} (${owner.percentage}% ownership) - ${owner.email}`
            ));
            validationErrors.push('');
            validationErrors.push('To complete signatures:');
            validationErrors.push('1. Use "Draw Signature" or "Type Signature" in Business Ownership section');
            validationErrors.push('2. Or send signature request emails to owners');
          }
          
          throw new Error(validationErrors.join('\n'));
        }
        
        throw new Error(errorData.message || 'Failed to submit application');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Application submitted successfully
        toast({
          title: "Application Submitted Successfully!",
          description: "Your merchant processing application has been submitted for review. You will receive an email confirmation shortly.",
        });
        
        // Redirect to application status page
        setLocation(`/application-status?token=${prospectToken}`);
      }
    },
    onError: (error: any) => {
      console.error('Application submission error:', error);
      
      // Handle multi-line error messages with proper formatting
      const errorMessage = error.message || "There was an error submitting your application. Please try again.";
      
      if (errorMessage.includes('Required signatures missing:')) {
        // Show detailed validation dialog for signature errors
        const dialog = document.createElement('div');
        dialog.innerHTML = `
          <div style="
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            bottom: 0; 
            background: rgba(0,0,0,0.5); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="
              background: white; 
              padding: 24px; 
              border-radius: 8px; 
              max-width: 500px; 
              margin: 20px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            ">
              <h3 style="margin: 0 0 16px 0; color: #dc2626; font-weight: 600; font-size: 18px;">
                Application Incomplete
              </h3>
              <div style="
                white-space: pre-line; 
                line-height: 1.5; 
                color: #374151; 
                margin-bottom: 20px;
                font-size: 14px;
              ">${errorMessage}</div>
              <button onclick="this.parentElement.parentElement.remove()" style="
                background: #dc2626; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 4px; 
                cursor: pointer;
                font-weight: 500;
              ">
                Close
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(dialog);
      } else {
        // Standard toast for other errors
        toast({
          title: "Submission Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  });

  // Navigation handlers that save form data before moving between sections
  const handleNext = () => {
    const nextStep = Math.min(sections.length - 1, currentStep + 1);
    
    console.log(`Navigating from step ${currentStep} to step ${nextStep}`);
    
    // Save current form data before navigating for prospect mode
    if (isProspectMode && prospectData?.prospect?.id) {
      console.log('Saving form data with currentStep:', nextStep);
      saveFormDataMutation.mutate({
        formData: formData,
        currentStep: nextStep
      });
    }
    
    setCurrentStep(nextStep);
  };

  const handlePrevious = () => {
    const prevStep = Math.max(0, currentStep - 1);
    
    console.log(`Navigating from step ${currentStep} to step ${prevStep}`);
    
    // Save current form data before navigating for prospect mode
    if (isProspectMode && prospectData?.prospect?.id) {
      console.log('Saving form data with currentStep:', prevStep);
      saveFormDataMutation.mutate({
        formData: formData,
        currentStep: prevStep
      });
    }
    
    setCurrentStep(prevStep);
  };

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

  // Load owners with signatures from database
  const loadOwnersWithSignatures = async (prospectId: number) => {
    try {
      console.log(`Loading owners with signatures for prospect ${prospectId}`);
      const response = await fetch(`/api/prospects/${prospectId}/owners-with-signatures`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.owners.length > 0) {
          console.log("Found owners with signatures from database:", result.owners);
          setFormData(prev => ({
            ...prev,
            owners: result.owners
          }));
        } else {
          console.log("No owners found in database");
        }
      } else {
        console.log("Failed to fetch owners:", response.status);
      }
    } catch (error) {
      console.error("Error loading owners with signatures:", error);
    }
  };

  // Load owners with signatures when prospect data is available
  useEffect(() => {
    if (prospectData?.prospect?.id && isProspectMode) {
      loadOwnersWithSignatures(prospectData.prospect.id);
    }
  }, [prospectData, isProspectMode]);

  // Debug form data changes
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  // Initialize form data with agent and prospect information for prospects
  useEffect(() => {
    if (isProspectMode && prospectData?.prospect && prospectData?.agent && !initialDataLoaded) {
      const newData = {
        assignedAgent: `${prospectData.agent.firstName} ${prospectData.agent.lastName} (${prospectData.agent.email})`,
        companyEmail: prospectData.prospect.email
      };
      console.log('Setting initial prospect data:', newData);
      setFormData(newData);
      setInitialDataLoaded(true);
      
      // Load existing form data if available
      if (prospectData.prospect.formData) {
        try {
          const existingData = JSON.parse(prospectData.prospect.formData);
          console.log('Loading existing form data:', existingData);
          
          // Prevent address override by setting addressOverrideActive
          if (existingData.address && existingData.city && existingData.state && existingData.zipCode) {
            setAddressOverrideActive(true);
            setAddressFieldsLocked(true);
            setAddressValidationStatus('valid');
          }
          
          setFormData(prev => ({ ...prev, ...existingData }));
        } catch (error) {
          console.error('Error parsing existing form data:', error);
        }
      }

      // Determine the appropriate starting step based on form completion
      const savedStep = prospectData.prospect.currentStep;
      let startingStep = savedStep !== null && savedStep !== undefined ? savedStep : 0;
      
      // Check if we should advance to the next incomplete section
      if (prospectData.prospect.formData) {
        try {
          const existingData = JSON.parse(prospectData.prospect.formData);
          
          // Check if Merchant Information section is complete
          const merchantInfoComplete = existingData.companyName && 
                                     existingData.companyEmail && 
                                     existingData.companyPhone && 
                                     existingData.address && 
                                     existingData.city && 
                                     existingData.state && 
                                     existingData.zipCode;
          
          // Check if Business Type section is complete
          const businessTypeComplete = existingData.federalTaxId && 
                                     existingData.businessType && 
                                     existingData.yearsInBusiness;
          
          // Auto-advance to next incomplete section
          if (merchantInfoComplete && !businessTypeComplete && startingStep === 0) {
            startingStep = 1; // Business Type & Tax Information
          } else if (merchantInfoComplete && businessTypeComplete && startingStep <= 1) {
            startingStep = 2; // Business Ownership
          }
          
          console.log('Auto-advancing to step:', startingStep, {
            merchantInfoComplete,
            businessTypeComplete,
            savedStep
          });
        } catch (error) {
          console.error('Error determining starting step:', error);
        }
      }
      
      console.log('Setting starting step:', startingStep);
      setCurrentStep(startingStep);
    }
  }, [prospectData, isProspectMode, initialDataLoaded]);

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
        name: 'Form Fields',
        description: 'Complete all required fields',
        icon: FileText,
        fields: pdfForm.fields.sort((a, b) => a.position - b.position)
      }
    ];
  }

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
        console.error('Address suggestions API error:', response.status);
      }
    } catch (error) {
      console.error('Address suggestions network error:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Select address suggestion and validate
  const selectAddressSuggestion = async (suggestion: any) => {
    const mainText = suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0];
    
    console.log('Selecting address suggestion:', suggestion);
    console.log('Previous form data before selection:', formData);
    
    // Hide suggestions immediately
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Set addressOverrideActive to prevent browser cache interference
    setAddressOverrideActive(true);
    
    // Validate the address with Google Maps API for complete information
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
        console.log('Address validation result:', result);
        
        if (result.isValid) {
          setAddressValidationStatus('valid');
          
          console.log('API returned validated address data:', {
            streetAddress: result.streetAddress,
            city: result.city,
            state: result.state,
            zipCode: result.zipCode
          });
          
          // Create final validated address data - this OVERWRITES any previous data
          const overwrittenFormData = {
            ...formData,  // Keep all existing form data
            address: result.streetAddress || mainText,  // OVERWRITE address
            city: result.city || '',                    // OVERWRITE city
            state: result.state || '',                  // OVERWRITE state
            zipCode: result.zipCode || ''               // OVERWRITE zipCode
          };
          
          console.log('OVERWRITING previous address data with selection:', {
            previous: {
              address: formData.address,
              city: formData.city,
              state: formData.state,
              zipCode: formData.zipCode
            },
            new: {
              address: overwrittenFormData.address,
              city: overwrittenFormData.city,
              state: overwrittenFormData.state,
              zipCode: overwrittenFormData.zipCode
            }
          });
          
          // IMMEDIATELY update form data with the new address - this overwrites any previous data
          setFormData(overwrittenFormData);
          
          // Clear browser cache and storage that might interfere
          const addressKeys = ['address', 'city', 'state', 'zipCode'];
          addressKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          
          // IMMEDIATELY save to database to ensure persistence and overwrite previous data
          if (isProspectMode && prospectData?.prospect) {
            console.log('Saving overwritten form data to database:', overwrittenFormData);
            
            try {
              const saveResponse = await fetch(`/api/prospects/${prospectData.prospect.id}/save-form-data`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  formData: overwrittenFormData, 
                  currentStep: currentStep,
                  overwriteAddress: true  // Flag to indicate this is an address overwrite
                }),
              });
              
              if (saveResponse.ok) {
                const saveResult = await saveResponse.json();
                console.log('Database save successful:', saveResult);
              } else {
                console.error('Database save failed:', saveResponse.status);
              }
            } catch (saveError) {
              console.error('Database save error:', saveError);
            }
          }
          
          // Lock the address fields after successful autocomplete selection
          setAddressFieldsLocked(true);
          
          // Force update DOM input fields to override any browser persistence - MULTIPLE attempts
          const forceUpdateFields = () => {
            const addressField = document.querySelector('input[id*="address"]:not([id*="addressLine2"])') as HTMLInputElement;
            const cityField = document.querySelector('input[id*="city"]') as HTMLInputElement;
            const stateField = document.querySelector('select[id*="state"], input[id*="state"]') as HTMLInputElement;
            const zipField = document.querySelector('input[id*="zip"]') as HTMLInputElement;
            
            console.log('Force updating DOM fields with validated address data...');
            console.log('Forcing fields to show:', {
              streetAddress: result.streetAddress,
              city: result.city,
              state: result.state,
              zipCode: result.zipCode
            });
            
            if (addressField && result.streetAddress) {
              addressField.value = result.streetAddress;
              addressField.dispatchEvent(new Event('input', { bubbles: true }));
              addressField.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Force set address field to:', result.streetAddress);
            }
            if (cityField && result.city) {
              cityField.value = result.city;
              cityField.dispatchEvent(new Event('input', { bubbles: true }));
              cityField.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Force set city field to:', result.city);
            }
            if (stateField && result.state) {
              stateField.value = result.state;
              stateField.dispatchEvent(new Event('change', { bubbles: true }));
              stateField.dispatchEvent(new Event('input', { bubbles: true }));
              console.log('Force set state field to:', result.state);
            }
            if (zipField && result.zipCode) {
              zipField.value = result.zipCode;
              zipField.dispatchEvent(new Event('input', { bubbles: true }));
              zipField.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Force set zip field to:', result.zipCode);
            }
          };
          
          // Execute force update multiple times to ensure it sticks
          setTimeout(forceUpdateFields, 100);
          setTimeout(forceUpdateFields, 300);
          setTimeout(forceUpdateFields, 500);
          setTimeout(forceUpdateFields, 1000);
          
          // Auto-focus to address line 2 field after successful selection
          setTimeout(() => {
            const addressLine2Field = document.querySelector('input[id*="addressLine2"]') as HTMLInputElement;
            if (addressLine2Field) {
              addressLine2Field.focus();
            }
          }, 600);
          
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

  // Handle field changes with auto-save and address override protection
  const handleFieldChange = (fieldName: string, value: any) => {
    // Prevent address field changes if addressOverrideActive and fields are locked
    if (addressOverrideActive && addressFieldsLocked && 
        (fieldName === 'city' || fieldName === 'state' || fieldName === 'zipCode')) {
      console.log(`Blocking change to ${fieldName} due to address override protection`);
      return;
    }
    
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);

    // Validate the field and update errors
    const currentField = sections[currentStep]?.fields.find(f => f.fieldName === fieldName);
    if (currentField) {
      const error = validateField(currentField, value);
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
    
    // Track field interaction for prospect status update
    handleFieldInteraction(fieldName, value);
    
    // Trigger address autocomplete for address field - allow even when locked to enable new selections
    if (fieldName === 'address') {
      // If user starts typing in a locked address field, unlock it for new selection
      if (addressFieldsLocked && value !== formData.address) {
        console.log('User typing new address - unlocking fields for new selection');
        setAddressFieldsLocked(false);
        setAddressOverrideActive(false);
        setAddressValidationStatus('idle');
      }
      
      setAddressValidationStatus('idle');
      // Clear city, state, zip when manually typing new address (if not locked or being unlocked)
      if (value && value.length >= 4) {
        fetchAddressSuggestions(value);
      } else {
        setShowSuggestions(false);
        setAddressSuggestions([]);
        setSelectedSuggestionIndex(-1);
        // Only clear address-related fields when completely empty (not just short)
        if (value.length === 0 && !addressFieldsLocked) {
          console.log('Address field completely cleared - clearing dependent fields');
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

  // Handle field interaction tracking
  const handleFieldInteraction = (fieldName: string, value: any) => {
    if (!fieldsInteracted.has(fieldName) && value) {
      setFieldsInteracted(prev => new Set([...prev, fieldName]));
      setFormStarted(true);
      
      // For prospect mode, update status to "in progress" on first interaction
      if (isProspectMode && prospectData?.prospect && !formStarted) {
        updateProspectStatusMutation.mutate(prospectData.prospect.id);
      }
    }
  };

  // Phone number formatting function
  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return value;
  };

  // EIN formatting function
  const formatEIN = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    }
    return value;
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

  // Handle EIN formatting on blur
  const handleEINBlur = (fieldName: string, value: string) => {
    if (fieldName === 'federalTaxId' || fieldName === 'taxId') {
      const formatted = formatEIN(value);
      if (formatted !== value) {
        const newFormData = { ...formData, [fieldName]: formatted };
        setFormData(newFormData);
      }
    }
  };

  // Handle money field formatting on blur
  const handleMoneyBlur = (fieldName: string, value: string) => {
    const moneyFields = ['monthlyVolume', 'averageTicket', 'highestTicket', 'avgMonthlyVolume', 'avgTicketAmount', 'highestTicketAmount'];
    
    if (moneyFields.includes(fieldName) && value) {
      const cleanValue = value.replace(/[^0-9.]/g, '');
      const numericValue = parseFloat(cleanValue);
      
      if (!isNaN(numericValue) && numericValue >= 0) {
        const formatted = numericValue.toFixed(2);
        if (formatted !== value) {
          const newFormData = { ...formData, [fieldName]: formatted };
          setFormData(newFormData);
        }
      }
    }
  };

  // Digital Signature Component
  const DigitalSignaturePad = ({ ownerIndex, owner, onSignatureChange }: {
    ownerIndex: number;
    owner: any;
    onSignatureChange: (index: number, signature: string | null, type: string | null) => void;
  }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [signatureMode, setSignatureMode] = React.useState<'draw' | 'type'>('draw');
    const [typedSignature, setTypedSignature] = React.useState('');
    const [showSignaturePad, setShowSignaturePad] = React.useState(false);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearSignature = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTypedSignature('');
      onSignatureChange(ownerIndex, null, null);
    };

    const saveSignature = () => {
      let signatureData: string | null = null;
      let signatureType: string | null = null;

      if (signatureMode === 'draw') {
        const canvas = canvasRef.current;
        if (canvas) {
          signatureData = canvas.toDataURL();
          signatureType = 'canvas';
        }
      } else {
        signatureData = typedSignature;
        signatureType = 'typed';
      }

      onSignatureChange(ownerIndex, signatureData, signatureType);
      setShowSignaturePad(false);
    };

    const generateTypedSignature = () => {
      if (!typedSignature.trim()) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set signature font style
      ctx.font = '32px "Brush Script MT", cursive';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw the typed signature
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
    };

    React.useEffect(() => {
      if (signatureMode === 'type' && typedSignature) {
        generateTypedSignature();
      }
    }, [typedSignature, signatureMode]);

    return (
      <div className="space-y-4">
        {!showSignaturePad && !owner.signature && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSignaturePad(true)}
            className="w-full"
          >
            <Signature className="w-4 h-4 mr-2" />
            Add Digital Signature
          </Button>
        )}

        {!showSignaturePad && owner.signature && (
          <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Signature Added ({owner.signatureType === 'canvas' ? 'Drawn' : 'Typed'})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSignaturePad(true)}
              >
                Edit
              </Button>
            </div>
            {owner.signatureType === 'canvas' && (
              <img 
                src={owner.signature} 
                alt="Signature" 
                className="mt-2 border rounded max-h-20"
              />
            )}
            {owner.signatureType === 'typed' && (
              <div className="mt-2 text-2xl font-signature text-center py-2 border rounded bg-white">
                {owner.signature}
              </div>
            )}
          </div>
        )}

        {showSignaturePad && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Digital Signature</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSignaturePad(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex space-x-2 mb-4">
              <Button
                type="button"
                variant={signatureMode === 'draw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSignatureMode('draw')}
              >
                <PenTool className="w-4 h-4 mr-2" />
                Draw
              </Button>
              <Button
                type="button"
                variant={signatureMode === 'type' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSignatureMode('type')}
              >
                <Type className="w-4 h-4 mr-2" />
                Type
              </Button>
            </div>

            {signatureMode === 'draw' && (
              <div className="space-y-3">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="border border-gray-300 rounded bg-white cursor-crosshair w-full"
                  style={{ maxWidth: '100%', height: '150px' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <p className="text-sm text-gray-600">
                  Draw your signature in the box above using your mouse or touch screen.
                </p>
              </div>
            )}

            {signatureMode === 'type' && (
              <div className="space-y-3">
                <Input
                  placeholder="Type your full name"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="text-center"
                />
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="border border-gray-300 rounded bg-white w-full"
                  style={{ maxWidth: '100%', height: '150px' }}
                />
                <p className="text-sm text-gray-600">
                  Type your name above to preview your signature style.
                </p>
              </div>
            )}

            <div className="flex space-x-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={clearSignature}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                type="button"
                onClick={saveSignature}
                disabled={
                  signatureMode === 'draw' ? false : !typedSignature.trim()
                }
              >
                <Check className="w-4 h-4 mr-2" />
                Save Signature
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Validate field value
  const validateField = (field: FormField, value: any): string | null => {
    // Handle ownership validation separately
    if (field.fieldType === 'ownership') {
      const owners = value || [];
      if (field.isRequired && owners.length === 0) {
        return 'At least one owner is required';
      }

      for (let i = 0; i < owners.length; i++) {
        const owner = owners[i];
        const percentage = parseFloat(owner.percentage);

        if (!owner.name || owner.name.trim() === '') {
          return `Owner ${i + 1}: Name is required`;
        }

        if (!owner.email || owner.email.trim() === '') {
          return `Owner ${i + 1}: Email is required`;
        }

        if (!owner.percentage || isNaN(percentage)) {
          return `Owner ${i + 1}: Ownership percentage is required`;
        }

        if (percentage < 0 || percentage > 100) {
          return `Owner ${i + 1}: Ownership percentage must be between 0 and 100`;
        }

        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(owner.email)) {
          return `Owner ${i + 1}: Please enter a valid email address`;
        }

        // Check signature requirement for owners with >=25%
        if (percentage >= 25 && !owner.signature) {
          return `Owner ${i + 1}: Signature required for ownership ≥ 25%`;
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
      
      // Additional EIN validation for federal tax ID fields
      if ((field.fieldName === 'federalTaxId' || field.fieldName === 'taxId') && value) {
        const cleanedEIN = value.replace(/\D/g, '');
        if (cleanedEIN.length !== 9) {
          return 'EIN must be exactly 9 digits';
        }
        if (!/^\d{2}-\d{7}$/.test(value) && cleanedEIN.length === 9) {
          // Allow unformatted 9 digits, will be formatted on blur
          return null; // Valid, will be auto-formatted
        }
      }
      if (field.validation.includes('ssn') && !patterns.ssn.test(value)) {
        return 'Please enter a valid SSN (XXX-XX-XXXX)';
      }
    }

    return null;
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

  // Render form field based on type
  const renderField = (field: FormField) => {
    const value = formData[field.fieldName] || '';
    const hasError = validationErrors[field.fieldName];

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div className="space-y-2 relative">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={field.fieldName}
                type={field.fieldType === 'email' ? 'email' : field.fieldType === 'phone' ? 'tel' : 'text'}
                value={value}
                onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
                onBlur={(e) => {
                  handlePhoneBlur(field.fieldName, e.target.value);
                  handleEINBlur(field.fieldName, e.target.value);
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
                            (field.fieldName === 'federalTaxId' || field.fieldName === 'taxId') ? 'Enter 9-digit EIN (will format as XX-XXXXXXX)' :
                            ['monthlyVolume', 'averageTicket', 'highestTicket', 'avgMonthlyVolume', 'avgTicketAmount', 'highestTicketAmount'].includes(field.fieldName) ? 
                              `Enter amount (e.g., 10000.00)` :
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
                          e.preventDefault();
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
                      setAddressOverrideActive(false);
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
              <p className="text-xs text-gray-500">
                🔒 Field locked after address autocomplete selection. 
                <button 
                  onClick={() => {
                    setAddressFieldsLocked(false);
                    setAddressValidationStatus('idle');
                    setAddressOverrideActive(false);
                  }}
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  Edit Address
                </button>
              </p>
            )}
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
            <Select value={value} onValueChange={(value) => handleFieldChange(field.fieldName, value)}>
              <SelectTrigger className={hasError ? 'border-red-500' : ''}>
                <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm font-medium text-gray-700">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              onBlur={(e) => handleMoneyBlur(field.fieldName, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
              placeholder={['monthlyVolume', 'averageTicket', 'highestTicket', 'avgMonthlyVolume', 'avgTicketAmount', 'highestTicketAmount'].includes(field.fieldName) ? 
                `Enter amount (e.g., 10000.00)` : 
                `Enter ${field.fieldLabel.toLowerCase()}`}
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
        const owners = formData.owners || [];
        const totalPercentage = owners.reduce((sum: number, owner: any) => sum + (parseFloat(owner.percentage) || 0), 0);

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

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold text-gray-800">
                {field.fieldLabel}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div className="flex gap-2">
                {owners.length > 0 && (
                  <Button
                    type="button"
                    onClick={async () => {
                      // Check for submitted signatures by owner email
                      const updatedOwners = [...owners];
                      let hasUpdates = false;
                      
                      for (let i = 0; i < updatedOwners.length; i++) {
                        const owner = updatedOwners[i];
                        if (owner.signature) continue; // Skip if already has signature
                        
                        try {
                          // First try with signature token if available
                          if (owner.signatureToken) {
                            const response = await fetch(`/api/signature/${owner.signatureToken}`);
                            if (response.ok) {
                              const result = await response.json();
                              if (result.success && result.signature) {
                                updatedOwners[i] = {
                                  ...owner,
                                  signature: result.signature.signature,
                                  signatureType: result.signature.signatureType
                                };
                                hasUpdates = true;
                                continue;
                              }
                            }
                          }
                          
                          // Fallback: search by email
                          if (owner.email) {
                            const emailResponse = await fetch(`/api/signature/by-email/${encodeURIComponent(owner.email)}`);
                            if (emailResponse.ok) {
                              const emailResult = await emailResponse.json();
                              if (emailResult.success && emailResult.signature) {
                                updatedOwners[i] = {
                                  ...owner,
                                  signature: emailResult.signature.signature,
                                  signatureType: emailResult.signature.signatureType
                                };
                                hasUpdates = true;
                              }
                            }
                          }
                        } catch (error) {
                          console.error('Error checking signature for owner:', error);
                        }
                      }
                      
                      if (hasUpdates) {
                        handleFieldChange('owners', updatedOwners);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Check for Signatures
                  </Button>
                )}
                {totalPercentage < 100 && (
                  <Button
                    type="button"
                    onClick={addOwner}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Add Owner
                  </Button>
                )}
              </div>
            </div>

            {owners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No owners added yet. Click "Add Owner" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {owners.map((owner: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-800">Owner {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeOwner(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
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

                    {/* Signature requirement for owners with >=25% */}
                    {parseFloat(owner.percentage) >= 25 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2 mb-3">
                          <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Signature Required</p>
                            <p className="text-xs text-amber-700">
                              Owners with 25% or more ownership must provide a signature
                            </p>
                          </div>
                        </div>

                        <DigitalSignaturePad
                          ownerIndex={index}
                          owner={owner}
                          onSignatureChange={(ownerIndex, signature, type) => {
                            updateOwner(ownerIndex, 'signature', signature);
                            updateOwner(ownerIndex, 'signatureType', type);
                          }}
                        />
                        
                        {!owner.signature && owner.email && (
                          <div className="mt-3 pt-3 border-t border-amber-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-amber-800">Or Send Email Request</p>
                                <p className="text-xs text-amber-700">
                                  Send a secure email request for digital signature
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!owner.email || !owner.name || !formData.companyName) {
                                    return;
                                  }

                                  const prospectId = prospectData?.prospect?.id || prospectData?.id;
                                  
                                  if (!prospectId) {
                                    console.error('No prospect ID available');
                                    return;
                                  }

                                  try {
                                    const response = await fetch('/api/signature-request', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        prospectId: prospectId,
                                        ownerName: owner.name,
                                        ownerEmail: owner.email,
                                        companyName: formData.companyName,
                                        ownershipPercentage: owner.percentage,
                                        requesterName: formData.companyName,
                                        agentName: formData.assignedAgent?.split(' (')[0] || 'Agent'
                                      }),
                                    });

                                    const result = await response.json();
                                    
                                    if (response.ok && result.success) {
                                      updateOwner(index, 'signatureToken', result.signatureToken);
                                      updateOwner(index, 'emailSent', new Date().toISOString());
                                      console.log(`Signature request sent to ${owner.email}`);
                                    } else {
                                      console.error('Failed to send signature request:', result.message);
                                    }
                                  } catch (error) {
                                    console.error('Error sending signature request:', error);
                                  }
                                }}
                                disabled={!owner.email || !formData.companyName}
                                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                              >
                                Send Email Request
                              </Button>
                            </div>
                            
                            {owner.emailSent && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                Email sent successfully on {new Date(owner.emailSent).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {owners.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Total Ownership: {totalPercentage.toFixed(2)}%
                  </span>
                  {totalPercentage !== 100 && (
                    <span className="text-xs text-blue-700">
                      {totalPercentage > 100 ? 'Exceeds 100%' : `${(100 - totalPercentage).toFixed(2)}% remaining`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

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

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Section Navigation */}
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

            {/* Form Content */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-8 py-6 border-b border-blue-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      {React.createElement(sections[currentStep]?.icon || FileText, {
                        className: "w-6 h-6 text-blue-600"
                      })}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-blue-900">{sections[currentStep]?.name}</h2>
                      <p className="text-blue-700 text-sm mt-1">{sections[currentStep]?.description}</p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-8">
                  <div className="space-y-6">
                    {sections[currentStep]?.fields.map((field) => (
                      <div key={field.id}>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200">
                    <div>
                      {currentStep > 0 && (
                        <Button
                          variant="outline"
                          onClick={handlePrevious}
                          className="flex items-center space-x-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {currentStep < sections.length - 1 ? (
                        <Button
                          onClick={handleNext}
                          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => submitApplicationMutation.mutate(formData)}
                          disabled={submitApplicationMutation.isPending}
                          className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                        >
                          {submitApplicationMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>Submit Application</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}