import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, AlertCircle, FileText, Mail, User, Calendar, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApplicationData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  status: string;
  validationToken: string;
  agentId: number;
  formData?: string;
  createdAt: string;
  updatedAt: string;
  agent?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ApplicationStatus() {
  const [, params] = useRoute('/application-status/:token');
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = params?.token;

  useEffect(() => {
    if (!token) {
      setError('Invalid application ID');
      setLoading(false);
      return;
    }

    fetchApplicationStatus();
  }, [token]);

  const fetchApplicationStatus = async () => {
    try {
      const response = await fetch(`/api/application-status/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Application not found');
        } else {
          setError('Failed to load application status');
        }
        return;
      }

      const data = await response.json();
      setApplication(data);
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          label: 'Submitted',
          color: 'bg-green-100 text-green-800',
          description: 'Your application has been successfully submitted and is being reviewed.'
        };
      case 'in_review':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-600" />,
          label: 'Under Review',
          color: 'bg-yellow-100 text-yellow-800',
          description: 'Your application is currently being reviewed by our team.'
        };
      case 'approved':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          label: 'Approved',
          color: 'bg-green-100 text-green-800',
          description: 'Congratulations! Your application has been approved.'
        };
      case 'rejected':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
          label: 'Rejected',
          color: 'bg-red-100 text-red-800',
          description: 'Your application was not approved. Please contact your agent for details.'
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-600" />,
          label: 'Processing',
          color: 'bg-gray-100 text-gray-800',
          description: 'Your application is being processed.'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFormData = () => {
    if (!application?.formData) return null;
    try {
      return JSON.parse(application.formData);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.href = '/'}>Return to Home</Button>
        </div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const statusInfo = getStatusInfo(application.status);
  const formData = getFormData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Status</h1>
          <p className="text-gray-600">Track your merchant application progress</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {statusInfo.icon}
                <div>
                  <CardTitle className="text-xl">Application Status</CardTitle>
                  <CardDescription>Current status of your application</CardDescription>
                </div>
              </div>
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{statusInfo.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Submitted:</span>
                <span className="font-medium">{formatDate(application.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Application ID:</span>
                <span className="font-medium">{application.validationToken}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Application Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Applicant Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{application.firstName} {application.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{application.email}</span>
                  </div>
                  {formData?.companyName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company:</span>
                      <span className="font-medium">{formData.companyName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Agent Information</h3>
                <div className="space-y-2 text-sm">
                  {application.agent && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assigned Agent:</span>
                        <span className="font-medium">{application.agent.firstName} {application.agent.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Agent Email:</span>
                        <span className="font-medium">{application.agent.email}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {formData && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {formData.businessType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Business Type:</span>
                        <span className="font-medium">{formData.businessType}</span>
                      </div>
                    )}
                    {formData.yearsInBusiness && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Years in Business:</span>
                        <span className="font-medium">{formData.yearsInBusiness}</span>
                      </div>
                    )}
                    {formData.monthlyVolume && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Volume:</span>
                        <span className="font-medium">${formData.monthlyVolume}</span>
                      </div>
                    )}
                    {formData.averageTicket && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Ticket:</span>
                        <span className="font-medium">${formData.averageTicket}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Next Steps</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {application.status === 'submitted' && (
                <>
                  <p className="text-gray-700">Your application is under review. Here's what happens next:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Your assigned agent will review your application</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>You will be contacted within 2-3 business days</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>Check this page anytime for status updates</span>
                    </li>
                  </ul>
                </>
              )}
              
              {application.status === 'approved' && (
                <p className="text-green-700">
                  Congratulations! Your application has been approved. Your agent will contact you with next steps 
                  to set up your merchant account.
                </p>
              )}
              
              {application.status === 'rejected' && (
                <p className="text-red-700">
                  Your application was not approved at this time. Please contact your assigned agent for more 
                  information about the decision and potential next steps.
                </p>
              )}

              {application.agent && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Need help?</strong> Contact your assigned agent {application.agent.firstName} {application.agent.lastName} 
                    at <a href={`mailto:${application.agent.email}`} className="underline">{application.agent.email}</a>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="text-center">
          <Button onClick={fetchApplicationStatus} variant="outline">
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  );
}