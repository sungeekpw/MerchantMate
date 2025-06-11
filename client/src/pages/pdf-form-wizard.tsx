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
import { ArrowLeft, ArrowRight, Save, FileText, CheckCircle } from "lucide-react";
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
  const { data: pdfForm, isLoading, error } = useQuery({
    queryKey: ['/api/pdf-forms', id, 'with-fields'],
    queryFn: async () => {
      const response = await fetch(`/api/pdf-forms/${id}/with-fields`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch form');
      }
      return response.json();
    }
  });

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: any) => {
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
        throw new Error('Failed to save form data');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  // Submit final form mutation
  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
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
        throw new Error('Failed to submit form');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Form Submitted Successfully",
        description: "Your merchant application has been submitted for review.",
      });
      setLocation('/pdf-forms');
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Group fields by section
  const sections: FormSection[] = pdfForm?.fields ? 
    Object.entries(
      pdfForm.fields.reduce((acc: Record<string, FormField[]>, field: FormField) => {
        const sectionName = field.section || 'General';
        if (!acc[sectionName]) {
          acc[sectionName] = [];
        }
        acc[sectionName].push(field);
        return acc;
      }, {})
    ).map(([name, fields]) => ({
      name,
      fields: fields.sort((a, b) => a.position - b.position)
    })) : [];

  // Auto-save on field change
  const handleFieldChange = (fieldName: string, value: any) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);
    
    // Auto-save after 1 second delay
    setTimeout(() => {
      autoSaveMutation.mutate(newFormData);
    }, 1000);
  };

  // Render form field based on type
  const renderField = (field: FormField) => {
    const value = formData[field.fieldName] || field.defaultValue || '';

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Input
            type={field.fieldType === 'text' ? 'text' : field.fieldType}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.fieldLabel}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.fieldLabel}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.fieldLabel}
            rows={3}
          />
        );
      
      case 'select':
        const options = (field.options || []).filter(option => option && option.trim() !== '');
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.fieldName, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.fieldLabel}`} />
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
            <Label>{field.fieldLabel}</Label>
          </div>
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
          />
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.fieldLabel}
          />
        );
    }
  };

  const currentSectionData = sections[currentSection];
  const progress = sections.length > 0 ? ((currentSection + 1) / sections.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading form wizard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pdfForm) {
    return (
      <div className="container mx-auto py-6">
        <Card>
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
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/pdf-forms')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Forms
              </Button>
            </div>
            <h1 className="text-3xl font-bold mt-2">{pdfForm.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {pdfForm.description}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <Save className="w-4 h-4" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Auto-save enabled'}
              </span>
            </div>
            <Badge variant="outline">
              Section {currentSection + 1} of {sections.length}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500">
                {sections.map((section, index) => (
                  <span key={index} className={index === currentSection ? 'text-primary font-medium' : ''}>
                    {section.name}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Section Form */}
        {currentSectionData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {currentSectionData.name}
              </CardTitle>
              <CardDescription>
                Complete the fields below. Your progress is automatically saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentSectionData.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.fieldName} className="flex items-center gap-2">
                    {field.fieldLabel}
                    {field.isRequired && <span className="text-red-500">*</span>}
                  </Label>
                  {renderField(field)}
                  {field.validation && (
                    <p className="text-xs text-gray-500">{field.validation}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous Section
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => autoSaveMutation.mutate(formData)}
              disabled={autoSaveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>

            {currentSection < sections.length - 1 ? (
              <Button
                onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
              >
                Next Section
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => submitMutation.mutate(formData)}
                disabled={submitMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Application
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}