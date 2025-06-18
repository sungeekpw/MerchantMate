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
    const lines = content.split('\n');
    const pages = this.createPages(lines, companyName);
    
    // Build PDF structure with multiple pages
    let pdfStructure = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [${pages.map((_, i) => `${3 + i} 0 R`).join(' ')}]
/Count ${pages.length}
>>
endobj

`;

    // Add page objects
    pages.forEach((pageContent, i) => {
      const pageNum = 3 + i;
      const contentNum = pageNum + pages.length;
      
      pdfStructure += `${pageNum} 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents ${contentNum} 0 R
/Resources <<
/Font <<
/F1 ${3 + pages.length * 2} 0 R
/F2 ${4 + pages.length * 2} 0 R
>>
>>
>>
endobj

`;
    });

    // Add content objects
    pages.forEach((pageContent, i) => {
      const contentNum = 3 + pages.length + i;
      pdfStructure += `${contentNum} 0 obj
<<
/Length ${pageContent.length}
>>
stream
${pageContent}
endstream
endobj

`;
    });

    // Add font objects
    const fontNum1 = 3 + pages.length * 2;
    const fontNum2 = 4 + pages.length * 2;
    
    pdfStructure += `${fontNum1} 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

${fontNum2} 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

`;

    // Build xref table
    const totalObjects = 5 + pages.length * 2;
    pdfStructure += `xref
0 ${totalObjects}
0000000000 65535 f `;

    // Calculate object positions (approximate)
    let currentPos = 10;
    for (let i = 1; i < totalObjects; i++) {
      pdfStructure += `\n${currentPos.toString().padStart(10, '0')} 00000 n `;
      currentPos += 100; // Rough estimate
    }

    pdfStructure += `

trailer
<<
/Size ${totalObjects}
/Root 1 0 R
>>
startxref
${currentPos}
%%EOF`;

    return pdfStructure;
  }

  private createPages(lines: string[], companyName: string): string[] {
    const pages: string[] = [];
    let currentPage = '';
    let currentY = 750;
    let isFirstPage = true;
    
    // First page header
    currentPage += 'BT\n';
    currentPage += '/F2 18 Tf\n';
    currentPage += '50 750 Td\n';
    currentPage += '(MERCHANT APPLICATION) Tj\n';
    currentPage += '/F1 14 Tf\n';
    currentPage += '0 -25 Td\n';
    currentPage += `(${companyName.replace(/[()\\]/g, '\\$&')}) Tj\n`;
    currentPage += '/F1 10 Tf\n';
    currentPage += '0 -20 Td\n';
    currentPage += `(Generated: ${new Date().toLocaleDateString()}) Tj\n`;
    currentPage += '0 -15 Td\n';
    currentPage += '(________________________________________________) Tj\n';
    currentPage += '0 -25 Td\n';
    
    currentY = 650; // Start content after header
    
    for (const line of lines) {
      let lineHeight = 12;
      
      if (line.includes('=======')) {
        lineHeight = 20;
        currentPage += '/F2 14 Tf\n';
        currentPage += '0 -20 Td\n';
      } else if (line.includes(':')) {
        lineHeight = 15;
        currentPage += '/F1 11 Tf\n';
        currentPage += '0 -15 Td\n';
      } else {
        lineHeight = 12;
        currentPage += '/F1 10 Tf\n';
        currentPage += '0 -12 Td\n';
      }
      
      // Check if we need a new page
      if (currentY - lineHeight < 50) {
        // Finish current page
        currentPage += 'ET\n';
        pages.push(currentPage);
        
        // Start new page
        currentPage = 'BT\n';
        currentPage += '/F1 12 Tf\n';
        currentPage += '50 750 Td\n';
        currentPage += `(MERCHANT APPLICATION - Page ${pages.length + 1}) Tj\n`;
        currentPage += '0 -20 Td\n';
        currentPage += '(________________________________________________) Tj\n';
        currentPage += '0 -25 Td\n';
        currentY = 700;
        
        // Repeat the line formatting for new page
        if (line.includes('=======')) {
          currentPage += '/F2 14 Tf\n';
          currentPage += '0 -20 Td\n';
        } else if (line.includes(':')) {
          currentPage += '/F1 11 Tf\n';
          currentPage += '0 -15 Td\n';
        } else {
          currentPage += '/F1 10 Tf\n';
          currentPage += '0 -12 Td\n';
        }
      }
      
      const cleanLine = line.replace(/[()\\]/g, '\\$&');
      currentPage += `(${cleanLine}) Tj\n`;
      currentY -= lineHeight;
    }
    
    // Finish last page
    currentPage += 'ET\n';
    pages.push(currentPage);
    
    return pages;
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