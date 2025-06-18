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
    // Create a professional-looking PDF with better formatting
    const lines = content.split('\n');
    let yPosition = 750;
    let pdfContent = '';
    
    // Header styling
    pdfContent += 'BT\n';
    pdfContent += '/F2 18 Tf\n'; // Larger font for title
    pdfContent += '50 750 Td\n';
    pdfContent += '(MERCHANT APPLICATION) Tj\n';
    
    // Company name
    pdfContent += '/F1 14 Tf\n';
    pdfContent += '0 -25 Td\n';
    pdfContent += `(${companyName.replace(/[()\\]/g, '\\$&')}) Tj\n`;
    
    // Date
    pdfContent += '/F1 10 Tf\n';
    pdfContent += '0 -20 Td\n';
    pdfContent += `(Generated: ${new Date().toLocaleDateString()}) Tj\n`;
    
    // Add a line separator
    pdfContent += '0 -15 Td\n';
    pdfContent += '(________________________________________________) Tj\n';
    pdfContent += '0 -25 Td\n';
    
    // Content with better formatting
    for (const line of lines) {
      if (line.includes('=======')) {
        // Section headers - bold and larger
        pdfContent += '/F2 14 Tf\n';
        pdfContent += '0 -20 Td\n';
      } else if (line.includes(':')) {
        // Field labels - normal weight
        pdfContent += '/F1 11 Tf\n';
        pdfContent += '0 -15 Td\n';
      } else {
        // Regular text
        pdfContent += '/F1 10 Tf\n';
        pdfContent += '0 -12 Td\n';
      }
      
      const cleanLine = line.replace(/[()\\]/g, '\\$&');
      pdfContent += `(${cleanLine}) Tj\n`;
    }
    
    pdfContent += 'ET\n';
    
    const pdfStructure = `%PDF-1.4
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
/Length ${pdfContent.length}
>>
stream
${pdfContent}
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
0000000${(350 + pdfContent.length).toString().padStart(6, '0')} 00000 n 
0000000${(400 + pdfContent.length).toString().padStart(6, '0')} 00000 n 

trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
${450 + pdfContent.length}
%%EOF`;

    return pdfStructure;
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
      '',
      'COMPANY INFORMATION',
      '===================',
      '',
      `Company Name: ${formData.companyName || 'N/A'}`,
      `Business Type: ${formData.businessType || 'N/A'}`,
      `Federal Tax ID (EIN): ${formData.federalTaxId || 'N/A'}`,
      `Years in Business: ${formData.yearsInBusiness || 'N/A'}`,
      `Email Address: ${formData.companyEmail || 'N/A'}`,
      `Phone Number: ${formData.companyPhone || 'N/A'}`,
      '',
      '',
      'BUSINESS ADDRESS',
      '================',
      '',
      `Street Address: ${formData.address || 'N/A'}`,
      formData.addressLine2 ? `Address Line 2: ${formData.addressLine2}` : '',
      `City: ${formData.city || 'N/A'}`,
      `State: ${formData.state || 'N/A'}`,
      `ZIP Code: ${formData.zipCode || 'N/A'}`,
      '',
      '',
      'BUSINESS OWNERSHIP',
      '==================',
      '',
    ];

    if (formData.owners && formData.owners.length > 0) {
      formData.owners.forEach((owner, index) => {
        lines.push(`OWNER ${index + 1}`);
        lines.push(`----------`);
        lines.push(`Name: ${owner.name || 'N/A'}`);
        lines.push(`Email: ${owner.email || 'N/A'}`);
        lines.push(`Ownership Percentage: ${owner.percentage || '0'}%`);
        if (owner.signature) {
          lines.push(`Digital Signature: ${owner.signature} (${owner.signatureType === 'type' ? 'Typed' : 'Drawn'})`);
        }
        lines.push('');
      });
    } else {
      lines.push('No ownership information provided');
    }

    lines.push('');
    lines.push('BUSINESS DESCRIPTION');
    lines.push('====================');
    lines.push('');
    lines.push(formData.businessDescription || 'No description provided');
    lines.push('');
    lines.push('');
    lines.push('PRODUCTS & SERVICES');
    lines.push('===================');
    lines.push('');
    lines.push(formData.productsServices || 'No products/services listed');
    lines.push('');
    lines.push('');
    lines.push('TRANSACTION INFORMATION');
    lines.push('=======================');
    lines.push('');
    lines.push(`Expected Monthly Volume: $${formData.monthlyVolume || '0.00'}`);
    lines.push(`Average Transaction Amount: $${formData.averageTicket || '0.00'}`);
    lines.push(`Highest Single Transaction: $${formData.highestTicket || '0.00'}`);
    lines.push(`Primary Processing Method: ${formData.processingMethod || 'N/A'}`);
    lines.push('');
    lines.push('');
    lines.push('APPLICATION DETAILS');
    lines.push('===================');
    lines.push('');
    lines.push(`Application Reference: ${prospect.validationToken || 'N/A'}`);
    lines.push(`Assigned Agent: ${formData.assignedAgent || 'N/A'}`);
    lines.push(`Date Submitted: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`);
    lines.push(`Status: Submitted`);

    return lines.join('\n');
  }


}

export const pdfGenerator = new PDFGenerator();