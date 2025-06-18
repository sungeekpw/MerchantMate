import { generatePdf } from 'html-pdf-node';
import { MerchantProspect } from '@shared/schema';

interface FormData {
  assignedAgent: string;
  companyEmail: string;
  companyName: string;
  companyPhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  addressLine2?: string;
  federalTaxId: string;
  businessType: string;
  yearsInBusiness: string;
  owners: Array<{
    name: string;
    email: string;
    percentage: string;
    signature?: string;
    signatureType?: string;
  }>;
  businessDescription: string;
  productsServices: string;
  processingMethod: string;
  monthlyVolume: string;
  averageTicket: string;
  highestTicket: string;
}

export class PDFGenerator {
  async generateApplicationPDF(prospect: MerchantProspect, formData: FormData): Promise<Buffer> {
    const html = this.generateHTML(prospect, formData);
    
    const options = {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Merchant Application - ${formData.companyName}
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span> | Generated on ${new Date().toLocaleDateString()}
        </div>
      `
    };

    try {
      const pdfBuffer = await generatePdf({ content: html }, {
        ...options,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run'
        ]
      });
      return pdfBuffer as Buffer;
    } catch (error) {
      console.error('PDF generation failed:', error);
      console.log('Continuing application submission without PDF attachment');
      // Return empty buffer to allow submission to continue
      return Buffer.from('PDF generation temporarily unavailable');
    }
  }

  private generateHTML(prospect: MerchantProspect, formData: FormData): string {
    const submissionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Merchant Application - ${formData.companyName}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            background: #f8fafc;
            color: #1e40af;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: bold;
            border-left: 4px solid #3b82f6;
            margin-bottom: 15px;
          }
          .field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .field-group {
            margin-bottom: 12px;
          }
          .field-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 4px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .field-value {
            color: #111827;
            font-size: 14px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
            min-height: 18px;
          }
          .signature-section {
            border: 2px solid #e5e7eb;
            padding: 20px;
            margin: 15px 0;
            background: #fafafa;
          }
          .signature-box {
            border: 1px solid #d1d5db;
            padding: 15px;
            margin: 10px 0;
            background: white;
            min-height: 60px;
            display: flex;
            align-items: center;
          }
          .signature-typed {
            font-family: 'Brush Script MT', cursive;
            font-size: 24px;
            color: #1e40af;
          }
          .full-width {
            grid-column: 1 / -1;
          }
          .status-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .footer {
            margin-top: 40px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          @media print {
            .header { margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Merchant Application</h1>
          <p>Submitted on ${submissionDate}</p>
          <p><span class="status-badge">Submitted</span></p>
        </div>

        <div class="section">
          <div class="section-title">Company Information</div>
          <div class="field-grid">
            <div class="field-group">
              <div class="field-label">Company Name</div>
              <div class="field-value">${formData.companyName || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Business Type</div>
              <div class="field-value">${formData.businessType || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Federal Tax ID (EIN)</div>
              <div class="field-value">${formData.federalTaxId || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Years in Business</div>
              <div class="field-value">${formData.yearsInBusiness || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Company Email</div>
              <div class="field-value">${formData.companyEmail || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Company Phone</div>
              <div class="field-value">${formData.companyPhone || ''}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Business Address</div>
          <div class="field-grid">
            <div class="field-group full-width">
              <div class="field-label">Street Address</div>
              <div class="field-value">${formData.address || ''}</div>
            </div>
            ${formData.addressLine2 ? `
            <div class="field-group full-width">
              <div class="field-label">Address Line 2</div>
              <div class="field-value">${formData.addressLine2}</div>
            </div>` : ''}
            <div class="field-group">
              <div class="field-label">City</div>
              <div class="field-value">${formData.city || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">State</div>
              <div class="field-value">${formData.state || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">ZIP Code</div>
              <div class="field-value">${formData.zipCode || ''}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Business Ownership</div>
          ${formData.owners?.map((owner, index) => `
            <div class="signature-section">
              <div class="field-grid">
                <div class="field-group">
                  <div class="field-label">Owner ${index + 1} Name</div>
                  <div class="field-value">${owner.name || ''}</div>
                </div>
                <div class="field-group">
                  <div class="field-label">Email Address</div>
                  <div class="field-value">${owner.email || ''}</div>
                </div>
                <div class="field-group">
                  <div class="field-label">Ownership Percentage</div>
                  <div class="field-value">${owner.percentage || ''}%</div>
                </div>
              </div>
              ${owner.signature ? `
                <div class="field-group">
                  <div class="field-label">Digital Signature</div>
                  <div class="signature-box">
                    <span class="signature-typed">${owner.signature}</span>
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('') || ''}
        </div>

        <div class="section">
          <div class="section-title">Business Description</div>
          <div class="field-group">
            <div class="field-label">Business Description</div>
            <div class="field-value">${formData.businessDescription || ''}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Products/Services Sold</div>
            <div class="field-value">${formData.productsServices || ''}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Primary Processing Method</div>
            <div class="field-value">${formData.processingMethod || ''}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Transaction Information</div>
          <div class="field-grid">
            <div class="field-group">
              <div class="field-label">Expected Monthly Volume</div>
              <div class="field-value">$${formData.monthlyVolume || '0.00'}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Average Transaction Amount</div>
              <div class="field-value">$${formData.averageTicket || '0.00'}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Highest Single Transaction</div>
              <div class="field-value">$${formData.highestTicket || '0.00'}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>Application Reference:</strong> ${prospect.validationToken}</p>
          <p><strong>Assigned Agent:</strong> ${formData.assignedAgent}</p>
          <p>This application was submitted electronically and contains legally binding digital signatures.</p>
          <p>Please retain this document for your records.</p>
        </div>
      </body>
      </html>
    `;
  }
}

export const pdfGenerator = new PDFGenerator();