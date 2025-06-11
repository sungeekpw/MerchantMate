import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PdfForm {
  id: number;
  name: string;
  description: string;
  fileName: string;
  fileSize: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
}

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
}

interface PdfFormWithFields extends PdfForm {
  fields: FormField[];
}

export default function PdfFormsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add error boundary for debugging
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all PDF forms
  const { data: pdfForms, isLoading: formsLoading, error: formsError } = useQuery<PdfForm[]>({
    queryKey: ['/api/pdf-forms'],
    retry: false
  });

  // Handle query effects and force refresh
  React.useEffect(() => {
    if (pdfForms) {
      console.log('PDF Forms data loaded:', pdfForms);
      console.log('Number of forms:', pdfForms.length);
      setHasError(false);
      setErrorMessage('');
    }
    if (formsError) {
      console.error('PDF Forms query error:', formsError);
      setErrorMessage(`Failed to load PDF forms: ${formsError.message || 'Unknown error'}`);
      setHasError(true);
    }
  }, [pdfForms, formsError]);

  // Upload PDF form mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/pdf-forms/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "PDF Form Uploaded Successfully",
        description: `Converted ${data.totalFields} form fields into interactive wizard`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pdf-forms'] });
      setSelectedFile(null);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      setUploadProgress(10);
      uploadMutation.mutate(selectedFile);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Inactive</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">PDF Form Wizard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload PDF forms and convert them into step-by-step interactive wizards
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upload">Upload New Form</TabsTrigger>
            <TabsTrigger value="forms">Existing Forms</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Merchant Application PDF
                </CardTitle>
                <CardDescription>
                  Upload a PDF form (like Wells Fargo MPA) to automatically convert it into an interactive wizard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pdf-upload">Select PDF File</Label>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    <>Processing PDF...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Convert to Interactive Form
                    </>
                  )}
                </Button>

                {uploadMutation.isPending && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span className="font-medium">Processing PDF...</span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Analyzing form structure and extracting field definitions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your PDF Forms</h2>
                <Badge variant="outline">
                  {pdfForms ? pdfForms.length : 0} forms
                </Badge>
              </div>

              {formsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : pdfForms && Array.isArray(pdfForms) && pdfForms.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pdfForms.map((form: PdfForm) => (
                    <Card key={form.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              {form.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {form.description}
                            </CardDescription>
                          </div>
                          {getStatusBadge(form.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Original File:</span>
                            <span className="font-medium">{form.fileName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Created:</span>
                            <span className="font-medium">
                              {new Date(form.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Button 
                            className="w-full" 
                            onClick={() => window.location.href = `/pdf-form-wizard/${form.id}`}
                          >
                            Open Form Wizard
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => window.location.href = `/pdf-forms/${form.id}/submissions`}
                          >
                            View Submissions
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No PDF Forms Yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                      Upload your first PDF form to get started with the interactive wizard
                    </p>
                    <Button onClick={() => document.querySelector('[value="upload"]')?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Your First Form
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}