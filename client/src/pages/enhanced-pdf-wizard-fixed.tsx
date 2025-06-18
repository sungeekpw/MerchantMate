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
        const errorData = await response.json();
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
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Return simplified component
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Merchant Application Form</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                The application form is being updated to fix address selection issues.
              </p>
              <p className="text-sm text-gray-500">
                Please refresh the page in a moment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}