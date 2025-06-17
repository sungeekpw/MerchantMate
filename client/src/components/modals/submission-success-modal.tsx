import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, FileText, Mail, ExternalLink, Copy, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  applicationId: string;
  statusUrl: string;
  agentName?: string;
}

export function SubmissionSuccessModal({
  isOpen,
  onClose,
  companyName,
  applicationId,
  statusUrl,
  agentName
}: SubmissionSuccessModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(applicationId);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Application ID copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the application ID",
        variant: "destructive"
      });
    }
  };

  const handleViewStatus = () => {
    window.open(statusUrl, '_blank');
  };

  const handleEmailNotification = () => {
    toast({
      title: "Email sent!",
      description: "Confirmation email with PDF attachment has been sent to your email address",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-green-800">
            Application Successfully Submitted!
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600">
            Your merchant application for <strong>{companyName}</strong> has been received
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="text-center">
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm font-medium">
              Status: Under Review
            </Badge>
          </div>

          {/* Application Details Card */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Application ID:</span>
                  <div className="flex items-center space-x-2">
                    <code className="rounded bg-white px-2 py-1 text-sm font-mono text-gray-800 border">
                      {applicationId}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyId}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className={`h-4 w-4 ${copied ? 'text-green-600' : 'text-gray-500'}`} />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Submitted:</span>
                  <span className="text-sm text-gray-800">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {agentName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Assigned Agent:</span>
                    <span className="text-sm text-gray-800">{agentName}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">What happens next?</h3>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">
                  Your application has been submitted and assigned to an agent
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 mt-0.5">
                  <Mail className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-sm text-gray-700">
                  You will receive a confirmation email with a PDF copy of your application
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 mt-0.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">
                  Your agent will review and contact you within 2-3 business days
                </span>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="font-medium text-blue-900 mb-2">Important</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Keep your application ID for reference: <code className="font-mono bg-blue-100 px-1 rounded">{applicationId}</code></li>
              <li>• Check your email for a PDF copy with digital signatures</li>
              <li>• Track your application status anytime using the link below</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleViewStatus} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Track Application Status
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>

          {/* Contact Information */}
          {agentName && (
            <div className="text-center text-sm text-gray-600 pt-4 border-t">
              Questions? Contact your assigned agent <strong>{agentName}</strong> directly.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionSuccessModal;