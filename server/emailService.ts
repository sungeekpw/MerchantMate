import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

if (!process.env.SENDGRID_FROM_EMAIL) {
  throw new Error("SENDGRID_FROM_EMAIL environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface ProspectEmailData {
  firstName: string;
  lastName: string;
  email: string;
  validationToken: string;
  agentName: string;
}

interface SignatureRequestData {
  ownerName: string;
  ownerEmail: string;
  companyName: string;
  ownershipPercentage: string;
  signatureToken: string;
  requesterName: string;
  agentName: string;
}

export class EmailService {
  private getBaseUrl(): string {
    // Use the current domain or localhost for development
    return process.env.BASE_URL || 'http://localhost:5000';
  }

  async sendProspectValidationEmail(data: ProspectEmailData): Promise<boolean> {
    try {
      const validationUrl = `${this.getBaseUrl()}/prospect-validation?token=${data.validationToken}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Merchant Application - Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f9f9f9; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background-color: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Merchant Processing Application</h1>
              <p>Email Verification Required</p>
            </div>
            
            <div class="content">
              <h2>Hello ${data.firstName} ${data.lastName},</h2>
              
              <p>Your assigned agent <strong>${data.agentName}</strong> has created a merchant processing application prospect for you.</p>
              
              <p>To proceed with your merchant application, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${validationUrl}" class="button">Verify Email & Start Application</a>
              </div>
              
              <p>This verification link will expire in 7 days. If you didn't request this application, please ignore this email.</p>
              
              <p>After verification, you'll be directed to complete your merchant processing application with all the necessary forms and documentation.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Click the verification link above</li>
                <li>Complete your merchant application forms</li>
                <li>Submit required documentation</li>
                <li>Your agent will review and process your application</li>
              </ul>
              
              <p>If you have any questions, please contact your assigned agent directly.</p>
            </div>
            
            <div class="footer">
              <p>Merchant Processing Services</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Hello ${data.firstName} ${data.lastName},

Your assigned agent ${data.agentName} has created a merchant processing application prospect for you.

To proceed with your merchant application, please verify your email address by visiting:
${validationUrl}

This verification link will expire in 7 days. If you didn't request this application, please ignore this email.

After verification, you'll be directed to complete your merchant processing application with all the necessary forms and documentation.

What happens next?
- Click the verification link above
- Complete your merchant application forms  
- Submit required documentation
- Your agent will review and process your application

If you have any questions, please contact your assigned agent directly.

Merchant Processing Services
This is an automated message. Please do not reply to this email.
      `;

      await mailService.send({
        to: data.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: 'Merchant Application - Email Verification Required',
        text: textContent,
        html: htmlContent,
      });

      console.log(`Prospect validation email sent successfully to ${data.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send prospect validation email:', error);
      return false;
    }
  }

  async sendSignatureRequestEmail(data: SignatureRequestData): Promise<boolean> {
    try {
      const signatureUrl = `${this.getBaseUrl()}/signature-request?token=${data.signatureToken}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Digital Signature Required - ${data.companyName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f9f9f9; }
            .signature-box { background-color: white; border: 2px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .button { display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { background-color: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Digital Signature Required</h1>
              <p>Merchant Application for ${data.companyName}</p>
            </div>
            
            <div class="content">
              <h2>Hello ${data.ownerName},</h2>
              
              <p>You are listed as a business owner with <strong>${data.ownershipPercentage}% ownership</strong> in ${data.companyName}. Your digital signature is required to complete the merchant application process.</p>
              
              <div class="signature-box">
                <h3 style="margin-top: 0; color: #2563eb;">What You Need to Do:</h3>
                <ol>
                  <li>Click the secure signature link below</li>
                  <li>Review the complete application details</li>
                  <li>Provide your digital signature to authorize the application</li>
                </ol>
              </div>
              
              <div style="text-align: center;">
                <a href="${signatureUrl}" class="button">Sign Application Now</a>
              </div>
              
              <div class="warning">
                <strong>Important:</strong> This signature request was initiated by ${data.requesterName}. 
                If you have questions about this application, contact your agent ${data.agentName} directly.
              </div>
              
              <p><strong>Security Note:</strong> This link is personalized and secure. It will expire in 30 days for your protection.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <p style="font-size: 14px; color: #666;">
                This is a legally binding signature request for merchant processing services. 
                By signing, you acknowledge your ownership percentage and authorize the application on behalf of ${data.companyName}.
              </p>
            </div>
            
            <div class="footer">
              <p>Core CRM - Merchant Services Division</p>
              <p>This email was sent to ${data.ownerEmail}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await mailService.send({
        to: data.ownerEmail,
        from: 'signatures@corecrm.com',
        subject: `Signature Required: ${data.companyName} Merchant Application`,
        html: htmlContent,
      });

      return true;
    } catch (error) {
      console.error('Error sending signature request email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();