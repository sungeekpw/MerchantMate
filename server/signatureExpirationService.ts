import { storage } from './storage';
import { TriggerService } from './triggerService';

export class SignatureExpirationService {
  private triggerService: TriggerService;

  constructor() {
    this.triggerService = new TriggerService();
  }

  /**
   * Check for signatures that need reminders or expiration
   * Should be called periodically (e.g., every 6 hours)
   */
  async processExpiringSignatures(dbEnv: string = 'development'): Promise<{
    reminders3Day: number;
    reminders1Day: number;
    expired: number;
  }> {
    const now = new Date();
    const results = {
      reminders3Day: 0,
      reminders1Day: 0,
      expired: 0
    };

    try {
      // Get all requested signatures that haven't expired yet
      const requestedSignatures = await storage.getSignatureCapturesByStatus('requested');

      for (const signature of requestedSignatures) {
        if (!signature.timestampExpires || !signature.timestampRequested) {
          continue;
        }

        const expiresAt = new Date(signature.timestampExpires);
        const requestedAt = new Date(signature.timestampRequested);
        const timeUntilExpiration = expiresAt.getTime() - now.getTime();
        const daysSinceRequest = Math.floor((now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60 * 24));

        // Check if expired (7 days = 0 days until expiration)
        if (timeUntilExpiration <= 0) {
          await this.handleExpiredSignature(signature, dbEnv);
          results.expired++;
          continue;
        }

        // Calculate days until expiration (rounded)
        const daysUntilExpiration = Math.ceil(timeUntilExpiration / (1000 * 60 * 60 * 24));

        // Send 3-day reminder (between 72-78 hours before expiration)
        // This is approximately 4 days after request
        if (daysUntilExpiration === 3 && daysSinceRequest >= 4) {
          const reminder3DaySent = await this.send3DayReminder(signature, dbEnv);
          if (reminder3DaySent) results.reminders3Day++;
        }

        // Send 1-day reminder (between 24-30 hours before expiration)
        // This is approximately 6 days after request
        else if (daysUntilExpiration === 1 && daysSinceRequest >= 6) {
          const reminder1DaySent = await this.send1DayReminder(signature, dbEnv);
          if (reminder1DaySent) results.reminders1Day++;
        }
      }

      console.log(`[SignatureExpirationService] Processed ${requestedSignatures.length} signatures:`, results);
      return results;
    } catch (error) {
      console.error('[SignatureExpirationService] Error processing expiring signatures:', error);
      throw error;
    }
  }

  /**
   * Send 3-day reminder email
   */
  private async send3DayReminder(signature: any, dbEnv: string): Promise<boolean> {
    try {
      // Check if we already sent this reminder
      // We use notes field to track sent reminders
      if (signature.notes?.includes('3-day reminder sent')) {
        return false;
      }

      // Get company name and agent name
      const { companyName, agentName } = await this.getContextData(signature);

      // Get signature URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
      const signatureUrl = `${baseUrl}/sign/${signature.requestToken}`;

      // Send reminder email using SendGrid directly
      const { db } = await import('./db');
      const { actionTemplates, emailActivity } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const sgMail = await import('@sendgrid/mail').then(m => m.default);

      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      const template = await db.query.actionTemplates.findFirst({
        where: eq(actionTemplates.name, 'Signature Expiration Reminder - 3 Days')
      });

      if (!template || template.actionType !== 'email') {
        console.error('[SignatureExpirationService] 3-day reminder template not found');
        return false;
      }

      // Replace variables in email content
      const variables = {
        ownerName: signature.signerName || 'Owner',
        ownerEmail: signature.signerEmail,
        companyName,
        signatureUrl,
        agentName
      };

      let subject = (template.config as any).subject || 'Reminder: Signature Required';
      let htmlContent = (template.config as any).htmlContent || '';
      let textContent = (template.config as any).textContent || '';

      // Replace variables
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        htmlContent = htmlContent.replace(regex, value);
        textContent = textContent.replace(regex, value);
      });

      // Send email
      await sgMail.send({
        to: signature.signerEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject,
        text: textContent,
        html: htmlContent
      });

      // Log email activity
      await db.insert(emailActivity).values({
        templateId: template.id,
        templateName: template.name,
        recipientEmail: signature.signerEmail,
        recipientName: signature.signerName,
        subject,
        status: 'sent',
        triggerSource: 'signature_workflow',
        triggeredBy: 'system',
        metadata: {
          signatureId: signature.id,
          roleKey: signature.roleKey,
          companyName,
          agentName,
          daysUntilExpiration: 3
        },
        sentAt: new Date()
      });

      // Update notes to track reminder sent
      const updatedNotes = signature.notes 
        ? `${signature.notes}; 3-day reminder sent on ${new Date().toISOString()}`
        : `3-day reminder sent on ${new Date().toISOString()}`;
      
      await storage.updateSignatureCapture(signature.id, {
        notes: updatedNotes
      });

      console.log(`[SignatureExpirationService] Sent 3-day reminder for signature ${signature.id}`);
      return true;
    } catch (error) {
      console.error('[SignatureExpirationService] Error sending 3-day reminder:', error);
      return false;
    }
  }

  /**
   * Send 1-day reminder email
   */
  private async send1DayReminder(signature: any, dbEnv: string): Promise<boolean> {
    try {
      // Check if we already sent this reminder
      if (signature.notes?.includes('1-day reminder sent')) {
        return false;
      }

      // Get company name and agent name
      const { companyName, agentName } = await this.getContextData(signature);

      // Get signature URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
      const signatureUrl = `${baseUrl}/sign/${signature.requestToken}`;

      // Manually send reminder email using the action template
      const { EmailService } = await import('./emailService');
      const emailService = new EmailService();

      // Get the action template for 1-day reminder
      const db = await import('./db').then(m => m.db);
      const { actionTemplates } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const template = await db.query.actionTemplates.findFirst({
        where: eq(actionTemplates.name, 'Signature Expiration Reminder - 1 Day')
      });

      if (!template || template.actionType !== 'email') {
        console.error('[SignatureExpirationService] 1-day reminder template not found');
        return false;
      }

      // Replace variables in email content
      const variables = {
        ownerName: signature.signerName || 'Owner',
        ownerEmail: signature.signerEmail,
        companyName,
        signatureUrl,
        agentName
      };

      let subject = (template.config as any).subject || 'URGENT: Signature Required Today';
      let htmlContent = (template.config as any).htmlContent || '';
      let textContent = (template.config as any).textContent || '';

      // Replace variables
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        htmlContent = htmlContent.replace(regex, value);
        textContent = textContent.replace(regex, value);
      });

      // Send email
      const mailService = emailService.getMailService();
      await mailService.send({
        to: signature.signerEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject,
        text: textContent,
        html: htmlContent
      });

      // Log email activity
      await emailService.logEmailActivity(
        'signature_reminder_1_day',
        signature.signerEmail,
        subject,
        'sent',
        undefined,
        'signature_workflow',
        {
          signatureId: signature.id,
          roleKey: signature.roleKey,
          companyName,
          agentName,
          daysUntilExpiration: 1
        }
      );

      // Update notes to track reminder sent
      const updatedNotes = signature.notes 
        ? `${signature.notes}; 1-day reminder sent on ${new Date().toISOString()}`
        : `1-day reminder sent on ${new Date().toISOString()}`;
      
      await storage.updateSignatureCapture(signature.id, {
        notes: updatedNotes
      });

      console.log(`[SignatureExpirationService] Sent 1-day reminder for signature ${signature.id}`);
      return true;
    } catch (error) {
      console.error('[SignatureExpirationService] Error sending 1-day reminder:', error);
      return false;
    }
  }

  /**
   * Handle expired signature
   */
  private async handleExpiredSignature(signature: any, dbEnv: string): Promise<void> {
    try {
      // Update status to expired
      await storage.updateSignatureCapture(signature.id, {
        status: 'expired',
        notes: signature.notes 
          ? `${signature.notes}; Expired on ${new Date().toISOString()}`
          : `Expired on ${new Date().toISOString()}`
      });

      // Get company name and agent name for trigger
      const { companyName, agentName } = await this.getContextData(signature);

      // Fire signature_expired trigger
      await this.triggerService.fireTrigger('signature_expired', {
        ownerName: signature.signerName || 'Owner',
        ownerEmail: signature.signerEmail,
        companyName,
        roleKey: signature.roleKey,
        originalRequestDate: signature.timestampRequested?.toISOString().split('T')[0] || 'Unknown',
        agentName
      }, {
        triggerSource: 'signature_expiration_service',
        dbEnv
      });

      console.log(`[SignatureExpirationService] Marked signature ${signature.id} as expired`);
    } catch (error) {
      console.error('[SignatureExpirationService] Error handling expired signature:', error);
    }
  }

  /**
   * Get company name and agent name from application/prospect
   */
  private async getContextData(signature: any): Promise<{ companyName: string; agentName: string }> {
    let companyName = 'Merchant Application';
    let agentName = 'Agent';

    try {
      if (signature.applicationId) {
        const application = await storage.getApplication(signature.applicationId);
        if (application?.businessName) {
          companyName = application.businessName;
        }
        if (application?.createdBy) {
          const creator = await storage.getUserByIdOrUsername(application.createdBy);
          if (creator && creator.firstName && creator.lastName) {
            agentName = `${creator.firstName} ${creator.lastName}`;
          } else if (creator && creator.username) {
            agentName = creator.username;
          }
        }
      } else if (signature.prospectId) {
        const prospect = await storage.getProspectById(signature.prospectId);
        if (prospect?.businessName) {
          companyName = prospect.businessName;
        }
        if (prospect?.createdBy) {
          const creator = await storage.getUserByIdOrUsername(prospect.createdBy);
          if (creator && creator.firstName && creator.lastName) {
            agentName = `${creator.firstName} ${creator.lastName}`;
          } else if (creator && creator.username) {
            agentName = creator.username;
          }
        }
      }
    } catch (error) {
      console.error('[SignatureExpirationService] Error getting context data:', error);
    }

    return { companyName, agentName };
  }
}
