import { MerchantProspect } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

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
    try {
      // Generate a simple text-based PDF content using plain text formatting
      const textContent = this.generateTextContent(prospect, formData);
      
      // Create a basic PDF structure with proper headers
      const pdfContent = this.createBasicPDF(textContent, formData.companyName);
      
      return Buffer.from(pdfContent, 'binary');
    } catch (error) {
      console.error('PDF generation failed:', error);
      console.log('Continuing application submission without PDF attachment');
      // Return a minimal valid PDF structure
      return this.createMinimalPDF(formData.companyName);
    }
  }

  private createBasicPDF(content: string, companyName: string): string {
    // Create a minimal but valid PDF structure
    const date = new Date().toISOString();
    
    const pdfHeader = `%PDF-1.4
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
>>
>>
>>
endobj

4 0 obj
<<
/Length ${content.length + 200}
>>
stream
BT
/F1 12 Tf
50 750 Td
(MERCHANT APPLICATION) Tj
0 -20 Td
(Company: ${companyName}) Tj
0 -20 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -40 Td
${content.split('\n').map(line => `(${line.replace(/[()\\]/g, '\\$&')}) Tj 0 -15 Td`).join('\n')}
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000246 00000 n 
0000000${(500 + content.length).toString().padStart(6, '0')} 00000 n 

trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${600 + content.length}
%%EOF`;

    return pdfHeader;
  }

  private createMinimalPDF(companyName: string): Buffer {
    const minimalPdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 150>>stream
BT/F1 12 Tf 50 750 Td(MERCHANT APPLICATION)Tj 0 -20 Td(Company: ${companyName})Tj 0 -20 Td(Generated: ${new Date().toLocaleDateString()})Tj 0 -40 Td(PDF Generation Unavailable)Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref 0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
0000000234 00000 n 
0000000434 00000 n 
trailer<</Size 6/Root 1 0 R>>startxref 494 %%EOF`;
    
    return Buffer.from(minimalPdf, 'binary');
  }

  private generateTextContent(prospect: MerchantProspect, formData: FormData): string {
    const lines = [
      '',
      'COMPANY INFORMATION',
      '===================',
      `Company Name: ${formData.companyName || 'N/A'}`,
      `Business Type: ${formData.businessType || 'N/A'}`,
      `Federal Tax ID: ${formData.federalTaxId || 'N/A'}`,
      `Years in Business: ${formData.yearsInBusiness || 'N/A'}`,
      `Email: ${formData.companyEmail || 'N/A'}`,
      `Phone: ${formData.companyPhone || 'N/A'}`,
      '',
      'BUSINESS ADDRESS',
      '================',
      `Address: ${formData.address || 'N/A'}`,
      formData.addressLine2 ? `Address Line 2: ${formData.addressLine2}` : '',
      `City: ${formData.city || 'N/A'}`,
      `State: ${formData.state || 'N/A'}`,
      `ZIP Code: ${formData.zipCode || 'N/A'}`,
      '',
      'BUSINESS OWNERSHIP',
      '==================',
    ];

    if (formData.owners && formData.owners.length > 0) {
      formData.owners.forEach((owner, index) => {
        lines.push(`Owner ${index + 1}:`);
        lines.push(`  Name: ${owner.name || 'N/A'}`);
        lines.push(`  Email: ${owner.email || 'N/A'}`);
        lines.push(`  Ownership: ${owner.percentage || '0'}%`);
        if (owner.signature) {
          lines.push(`  Signature: ${owner.signature} (${owner.signatureType || 'type'})`);
        }
        lines.push('');
      });
    }

    lines.push('BUSINESS DESCRIPTION');
    lines.push('====================');
    lines.push(formData.businessDescription || 'N/A');
    lines.push('');
    lines.push('PRODUCTS/SERVICES');
    lines.push('=================');
    lines.push(formData.productsServices || 'N/A');
    lines.push('');
    lines.push('TRANSACTION INFORMATION');
    lines.push('=======================');
    lines.push(`Monthly Volume: $${formData.monthlyVolume || '0.00'}`);
    lines.push(`Average Transaction: $${formData.averageTicket || '0.00'}`);
    lines.push(`Highest Transaction: $${formData.highestTicket || '0.00'}`);
    lines.push(`Processing Method: ${formData.processingMethod || 'N/A'}`);
    lines.push('');
    lines.push('APPLICATION DETAILS');
    lines.push('===================');
    lines.push(`Reference: ${prospect.validationToken}`);
    lines.push(`Assigned Agent: ${formData.assignedAgent}`);
    lines.push(`Submitted: ${new Date().toLocaleDateString()}`);

    return lines.filter(line => line !== '').join('\n');
  }


}

export const pdfGenerator = new PDFGenerator();