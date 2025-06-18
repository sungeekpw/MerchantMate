import type { MerchantProspect } from '../shared/schema';

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
    console.log('Generating professional form PDF for prospect:', prospect.id);
    
    try {
      const pdfContent = this.createProfessionalFormPDF(prospect, formData);
      return Buffer.from(pdfContent, 'binary');
    } catch (error) {
      console.error('PDF generation failed:', error);
      return this.createMinimalPDF(formData.companyName);
    }
  }

  private createProfessionalFormPDF(prospect: MerchantProspect, formData: FormData): string {
    const content = this.generateFormContent(prospect, formData);
    
    const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
/F2 6 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${content.length}
>>
stream
${content}
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
0000000246 00000 n 
0000000350 00000 n 
0000000400 00000 n 

trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
450
%%EOF`;

    return pdf;
  }

  private generateFormContent(prospect: MerchantProspect, formData: FormData): string {
    const cleanText = (text: string) => text.replace(/[()\\]/g, '\\$&');
    
    let content = 'BT\n';
    
    // Header - Professional form title
    content += '/F2 16 Tf\n';
    content += '50 750 Td\n';
    content += '(MERCHANT PROCESSING APPLICATION) Tj\n';
    
    // Date and Agent info
    content += '300 0 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + new Date().toLocaleDateString() + ') Tj\n';
    content += '-300 0 Td\n';
    
    // Company name prominently displayed
    content += '0 -25 Td\n';
    content += '/F2 14 Tf\n';
    content += '(' + cleanText(formData.companyName || 'Company Name') + ') Tj\n';
    
    // Agent information
    content += '300 0 Td\n';
    content += '/F1 10 Tf\n';
    content += '(Agent: ' + cleanText(formData.assignedAgent || 'N/A') + ') Tj\n';
    content += '-300 0 Td\n';
    
    // Section separator
    content += '0 -20 Td\n';
    content += '/F1 8 Tf\n';
    content += '(________________________________________________________________) Tj\n';
    
    // Section 1: Merchant Information
    content += '0 -30 Td\n';
    content += '/F2 12 Tf\n';
    content += '(1. MERCHANT INFORMATION) Tj\n';
    content += '0 -15 Td\n';
    content += '/F1 8 Tf\n';
    content += '(________________________________________________) Tj\n';
    
    // Form fields with labels and underlines
    const fields = [
      ['LEGAL NAME OF BUSINESS', formData.companyName || ''],
      ['BUSINESS TYPE', formData.businessType || ''],
      ['FEDERAL TAX ID (EIN)', formData.federalTaxId || ''],
      ['YEARS IN BUSINESS', formData.yearsInBusiness || ''],
      ['LOCATION ADDRESS', formData.address || ''],
      ['CITY', formData.city || ''],
      ['STATE', formData.state || ''],
      ['ZIP CODE', formData.zipCode || ''],
      ['COMPANY EMAIL', formData.companyEmail || ''],
      ['COMPANY PHONE', formData.companyPhone || '']
    ];

    fields.forEach(([label, value]) => {
      content += '0 -20 Td\n';
      content += '/F2 9 Tf\n';
      content += '(' + cleanText(label) + ') Tj\n';
      content += '0 -12 Td\n';
      content += '/F1 10 Tf\n';
      content += '(' + cleanText(value) + ') Tj\n';
      content += '0 -3 Td\n';
      content += '/F1 8 Tf\n';
      content += '(________________________________) Tj\n';
    });

    // Section 2: Business Ownership
    content += '0 -25 Td\n';
    content += '/F2 12 Tf\n';
    content += '(2. BUSINESS OWNERSHIP) Tj\n';
    content += '0 -15 Td\n';
    content += '/F1 8 Tf\n';
    content += '(________________________________________________) Tj\n';

    if (formData.owners && formData.owners.length > 0) {
      formData.owners.forEach((owner, index) => {
        content += '0 -20 Td\n';
        content += '/F2 10 Tf\n';
        content += '(OWNER ' + (index + 1) + ') Tj\n';
        
        const ownerFields = [
          ['NAME', owner.name || ''],
          ['EMAIL', owner.email || ''],
          ['OWNERSHIP PERCENTAGE', (owner.percentage || '0') + '%']
        ];

        ownerFields.forEach(([label, value]) => {
          content += '0 -15 Td\n';
          content += '/F2 8 Tf\n';
          content += '(' + cleanText(label) + ') Tj\n';
          content += '0 -10 Td\n';
          content += '/F1 9 Tf\n';
          content += '(' + cleanText(value) + ') Tj\n';
          content += '0 -2 Td\n';
          content += '/F1 7 Tf\n';
          content += '(____________________) Tj\n';
        });

        if (owner.signature) {
          content += '0 -15 Td\n';
          content += '/F2 8 Tf\n';
          content += '(DIGITAL SIGNATURE) Tj\n';
          content += '0 -10 Td\n';
          content += '/F1 9 Tf\n';
          const sigType = owner.signatureType === 'type' ? 'Typed' : 'Drawn';
          content += '(' + cleanText(owner.signature) + ' (' + sigType + ')) Tj\n';
        }
      });
    }

    // Section 3: Business Description
    content += '0 -25 Td\n';
    content += '/F2 12 Tf\n';
    content += '(3. BUSINESS DESCRIPTION) Tj\n';
    content += '0 -15 Td\n';
    content += '/F1 8 Tf\n';
    content += '(________________________________________________) Tj\n';
    content += '0 -15 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.businessDescription || 'Not provided') + ') Tj\n';

    // Section 4: Products & Services
    content += '0 -20 Td\n';
    content += '/F2 12 Tf\n';
    content += '(4. PRODUCTS & SERVICES) Tj\n';
    content += '0 -15 Td\n';
    content += '/F1 8 Tf\n';
    content += '(________________________________________________) Tj\n';
    content += '0 -15 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.productsServices || 'Not provided') + ') Tj\n';

    // Section 5: Transaction Information
    content += '0 -25 Td\n';
    content += '/F2 12 Tf\n';
    content += '(5. TRANSACTION INFORMATION) Tj\n';
    content += '0 -15 Td\n';
    content += '/F1 8 Tf\n';
    content += '(________________________________________________) Tj\n';

    const transactionFields = [
      ['MONTHLY VOLUME', '$' + (formData.monthlyVolume || '0.00')],
      ['AVERAGE TRANSACTION', '$' + (formData.averageTicket || '0.00')],
      ['HIGHEST TRANSACTION', '$' + (formData.highestTicket || '0.00')],
      ['PROCESSING METHOD', formData.processingMethod || 'Not specified']
    ];

    transactionFields.forEach(([label, value]) => {
      content += '0 -18 Td\n';
      content += '/F2 9 Tf\n';
      content += '(' + cleanText(label) + ') Tj\n';
      content += '0 -10 Td\n';
      content += '/F1 10 Tf\n';
      content += '(' + cleanText(value) + ') Tj\n';
      content += '0 -3 Td\n';
      content += '/F1 8 Tf\n';
      content += '(________________________) Tj\n';
    });

    // Footer
    content += '0 -30 Td\n';
    content += '/F1 8 Tf\n';
    content += '(________________________________________________________________) Tj\n';
    content += '0 -15 Td\n';
    content += '(Application Reference: ' + cleanText(prospect.validationToken || 'N/A') + ') Tj\n';
    content += '0 -12 Td\n';
    content += '(Submitted: ' + new Date().toLocaleDateString() + ') Tj\n';
    content += '0 -12 Td\n';
    content += '(Status: Submitted for Processing) Tj\n';

    content += 'ET\n';
    
    return content;
  }

  private createMinimalPDF(companyName: string): Buffer {
    const cleanCompany = companyName.replace(/[()\\]/g, '\\$&');
    
    const content = `BT
/F1 12 Tf
50 750 Td
(MERCHANT APPLICATION) Tj
0 -20 Td
(Company: ${cleanCompany}) Tj
0 -20 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -20 Td
(Status: Application Submitted) Tj
ET`;

    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${content.length}>>stream
${content}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
0000000200 00000 n 
0000000300 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
350
%%EOF`;
    
    return Buffer.from(pdf, 'binary');
  }
}

export const pdfGenerator = new PDFGenerator();