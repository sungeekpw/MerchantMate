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
    const sections = this.createContentSections(prospect, formData);
    const pages = this.distributeContentAcrossPages(sections);
    
    return this.buildMultiPagePDF(pages);
  }

  private buildMultiPagePDF(pages: string[]): string {
    const pageCount = pages.length;
    let objectCounter = 1;
    
    // Catalog object
    let pdf = `%PDF-1.4
${objectCounter} 0 obj
<<
/Type /Catalog
/Pages ${objectCounter + 1} 0 R
>>
endobj

`;
    objectCounter++;

    // Pages object
    const pageRefs = [];
    for (let i = 0; i < pageCount; i++) {
      pageRefs.push(`${objectCounter + 1 + i} 0 R`);
    }
    
    pdf += `${objectCounter} 0 obj
<<
/Type /Pages
/Kids [${pageRefs.join(' ')}]
/Count ${pageCount}
>>
endobj

`;
    objectCounter++;

    // Page objects
    const contentObjectStart = objectCounter + pageCount;
    for (let i = 0; i < pageCount; i++) {
      pdf += `${objectCounter} 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents ${contentObjectStart + i} 0 R
/Resources <<
/Font <<
/F1 ${contentObjectStart + pageCount} 0 R
/F2 ${contentObjectStart + pageCount + 1} 0 R
>>
>>
>>
endobj

`;
      objectCounter++;
    }

    // Content objects
    for (let i = 0; i < pageCount; i++) {
      const content = pages[i];
      pdf += `${objectCounter} 0 obj
<<
/Length ${content.length}
>>
stream
${content}
endstream
endobj

`;
      objectCounter++;
    }

    // Font objects
    pdf += `${objectCounter} 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

`;
    objectCounter++;

    pdf += `${objectCounter} 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

`;
    objectCounter++;

    // Xref table
    const totalObjects = objectCounter;
    pdf += `xref
0 ${totalObjects}
0000000000 65535 f `;
    
    for (let i = 1; i < totalObjects; i++) {
      pdf += `\n${(i * 100).toString().padStart(10, '0')} 00000 n `;
    }

    pdf += `

trailer
<<
/Size ${totalObjects}
/Root 1 0 R
>>
startxref
${totalObjects * 100}
%%EOF`;

    return pdf;
  }



  private createContentSections(prospect: MerchantProspect, formData: FormData) {
    const cleanText = (text: string) => text.replace(/[()\\]/g, '\\$&');
    
    const sections = [];

    // Header section
    sections.push({
      type: 'header',
      content: this.createHeaderSection(formData, cleanText),
      height: 100
    });

    // Section 1: Merchant Information
    sections.push({
      type: 'section',
      title: '1. MERCHANT INFORMATION',
      content: this.createMerchantInfoSection(formData, cleanText),
      height: 450
    });

    // Section 2: Business Ownership
    sections.push({
      type: 'section',
      title: '2. BUSINESS OWNERSHIP',
      content: this.createOwnershipSection(formData, cleanText),
      height: formData.owners ? formData.owners.length * 120 + 60 : 80
    });

    // Section 3: Business Description
    sections.push({
      type: 'section',
      title: '3. BUSINESS DESCRIPTION',
      content: this.createDescriptionSection(formData, cleanText),
      height: 80
    });

    // Section 4: Products & Services
    sections.push({
      type: 'section',
      title: '4. PRODUCTS & SERVICES',
      content: this.createServicesSection(formData, cleanText),
      height: 80
    });

    // Section 5: Transaction Information
    sections.push({
      type: 'section',
      title: '5. TRANSACTION INFORMATION',
      content: this.createTransactionSection(formData, cleanText),
      height: 150
    });

    // Footer section
    sections.push({
      type: 'footer',
      content: this.createFooterSection(prospect, cleanText),
      height: 60
    });

    return sections;
  }

  private distributeContentAcrossPages(sections: any[]): string[] {
    const pages = [];
    let currentPage = '';
    let currentY = 750;
    let pageNum = 1;

    for (const section of sections) {
      // Check if section fits on current page
      if (currentY - section.height < 50 && currentPage !== '') {
        // Finish current page and start new one
        currentPage += 'ET\n';
        pages.push(currentPage);
        
        // Start new page
        currentPage = 'BT\n';
        currentPage += '/F1 12 Tf\n';
        currentPage += '50 750 Td\n';
        currentPage += '(MERCHANT APPLICATION - Page ' + (++pageNum) + ') Tj\n';
        currentPage += '0 -20 Td\n';
        currentPage += '/F1 8 Tf\n';
        currentPage += '(________________________________________________________________) Tj\n';
        currentPage += '0 -30 Td\n';
        currentY = 680;
      }

      if (currentPage === '') {
        currentPage = 'BT\n';
      }

      currentPage += section.content;
      currentY -= section.height;
    }

    // Add final page
    if (currentPage !== '') {
      currentPage += 'ET\n';
      pages.push(currentPage);
    }

    return pages;
  }

  private createHeaderSection(formData: FormData, cleanText: Function): string {
    let content = '';
    
    // Company header (centered)
    content += '/F2 14 Tf\n';
    content += '200 750 Td\n';
    content += '(CORE CRM MERCHANT CENTER) Tj\n';
    
    // Right-aligned agent number
    content += '200 0 Td\n';
    content += '/F1 10 Tf\n';
    content += '(AGENT #) Tj\n';
    content += '-400 0 Td\n';
    
    // Main title
    content += '0 -30 Td\n';
    content += '/F2 16 Tf\n';
    content += '150 0 Td\n';
    content += '(MERCHANT PROCESSING APPLICATION & AGREEMENT) Tj\n';
    content += '-150 0 Td\n';
    
    // Date stamp
    content += '400 0 Td\n';
    content += '/F1 9 Tf\n';
    content += '(Date: ' + new Date().toLocaleDateString() + ') Tj\n';
    content += '-400 0 Td\n';
    
    // Company name prominently displayed
    content += '0 -25 Td\n';
    content += '/F2 12 Tf\n';
    content += '(' + cleanText(formData.companyName || 'COMPANY NAME') + ') Tj\n';
    
    // Agent information
    content += '350 0 Td\n';
    content += '/F1 9 Tf\n';
    content += '(Agent: ' + cleanText(formData.assignedAgent || 'N/A') + ') Tj\n';
    content += '-350 0 Td\n';
    
    content += '0 -20 Td\n';
    return content;
  }

  private createMerchantInfoSection(formData: FormData, cleanText: Function): string {
    let content = '';
    
    // Section header with box styling
    content += '/F2 11 Tf\n';
    content += '(  1. MERCHANT INFORMATION) Tj\n';
    content += '0 -20 Td\n';
    
    // Legal name field (full width)
    content += '/F2 8 Tf\n';
    content += '(LEGAL NAME OF BUSINESS / IRS FILING NAME) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.companyName || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(_____________________________________________) Tj\n';
    content += '0 -15 Td\n';
    
    // Address section
    content += '/F2 8 Tf\n';
    content += '(LOCATION / SITE ADDRESS) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.address || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(____________________________________________________) Tj\n';
    content += '0 -15 Td\n';
    
    // City, State, ZIP on separate lines for clarity
    content += '/F2 8 Tf\n';
    content += '(CITY) Tj\n';
    content += '200 0 Td\n';
    content += '(STATE) Tj\n';
    content += '100 0 Td\n';
    content += '(ZIP CODE) Tj\n';
    content += '-300 0 Td\n';
    content += '0 -12 Td\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.city || '') + ') Tj\n';
    content += '200 0 Td\n';
    content += '(' + cleanText(formData.state || '') + ') Tj\n';
    content += '100 0 Td\n';
    content += '(' + cleanText(formData.zipCode || '') + ') Tj\n';
    content += '-300 0 Td\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(___________________) Tj\n';
    content += '200 0 Td\n';
    content += '(__________) Tj\n';
    content += '100 0 Td\n';
    content += '(__________) Tj\n';
    content += '-300 0 Td\n';
    
    // Contact information section
    content += '0 -15 Td\n';
    content += '/F2 8 Tf\n';
    content += '(COMPANY PHONE #) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.companyPhone || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(_____________________) Tj\n';
    content += '0 -15 Td\n';
    
    content += '/F2 8 Tf\n';
    content += '(COMPANY E-MAIL ADDRESS) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.companyEmail || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(____________________________________________) Tj\n';
    
    // Tax ID line
    content += '0 -15 Td\n';
    content += '/F2 8 Tf\n';
    content += '(TAX ID) Tj\n';
    content += '0 -10 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.federalTaxId || '') + ') Tj\n';
    content += '0 -5 Td\n';
    content += '/F1 7 Tf\n';
    content += '(______________) Tj\n';
    
    // Business type section
    content += '0 -15 Td\n';
    content += '/F2 8 Tf\n';
    content += '(BUSINESS TYPE) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.businessType || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(____________________) Tj\n';
    content += '0 -15 Td\n';
    
    // Years in business
    content += '/F2 8 Tf\n';
    content += '(YEARS IN BUSINESS) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.yearsInBusiness || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(______________) Tj\n';
    
    content += '0 -20 Td\n';
    return content;
  }

  private createOwnershipSection(formData: FormData, cleanText: Function): string {
    let content = '';
    
    // Section header
    content += '/F2 11 Tf\n';
    content += '(  2. BUSINESS OWNERSHIP & PRINCIPAL INFORMATION) Tj\n';
    content += '0 -18 Td\n';

    if (formData.owners && formData.owners.length > 0) {
      formData.owners.forEach((owner, index) => {
        // Owner header
        content += '/F2 9 Tf\n';
        content += '(PRINCIPAL ' + (index + 1) + ' INFORMATION) Tj\n';
        content += '0 -12 Td\n';
        
        // Owner name and percentage on same line
        content += '/F2 8 Tf\n';
        content += '(FULL NAME) Tj\n';
        content += '250 0 Td\n';
        content += '(OWNERSHIP PERCENTAGE) Tj\n';
        content += '150 0 Td\n';
        content += '(TITLE) Tj\n';
        content += '-400 0 Td\n';
        content += '0 -10 Td\n';
        content += '/F1 10 Tf\n';
        content += '(' + cleanText(owner.name || '') + ') Tj\n';
        content += '250 0 Td\n';
        content += '(' + cleanText((owner.percentage || '0') + '%') + ') Tj\n';
        content += '-250 0 Td\n';
        content += '0 -5 Td\n';
        content += '/F1 7 Tf\n';
        content += '(____________________________) Tj\n';
        content += '250 0 Td\n';
        content += '(___________) Tj\n';
        content += '150 0 Td\n';
        content += '(_______________) Tj\n';
        content += '-400 0 Td\n';
        
        // Email address
        content += '0 -12 Td\n';
        content += '/F2 8 Tf\n';
        content += '(EMAIL ADDRESS) Tj\n';
        content += '0 -10 Td\n';
        content += '/F1 10 Tf\n';
        content += '(' + cleanText(owner.email || '') + ') Tj\n';
        content += '0 -5 Td\n';
        content += '/F1 7 Tf\n';
        content += '(___________________________________________) Tj\n';

        // Digital signature section
        if (owner.signature) {
          content += '0 -15 Td\n';
          content += '/F2 8 Tf\n';
          content += '(DIGITAL SIGNATURE ACKNOWLEDGMENT) Tj\n';
          content += '0 -10 Td\n';
          content += '/F1 9 Tf\n';
          const sigType = owner.signatureType === 'type' ? 'Electronically Typed' : 'Digitally Drawn';
          content += '(Signature: ' + cleanText(owner.signature) + ' \\(' + sigType + '\\)) Tj\n';
          content += '0 -8 Td\n';
          content += '/F2 7 Tf\n';
          content += '(By providing this digital signature, I acknowledge and agree to the terms of this application.) Tj\n';
        } else {
          content += '0 -15 Td\n';
          content += '/F2 8 Tf\n';
          content += '(SIGNATURE REQUIRED \\(25% or greater ownership\\)) Tj\n';
          content += '0 -10 Td\n';
          content += '/F1 7 Tf\n';
          content += '(___________________________________________) Tj\n';
        }
        
        content += '0 -20 Td\n';
      });
    } else {
      content += '/F2 9 Tf\n';
      content += '(PRINCIPAL INFORMATION NOT PROVIDED) Tj\n';
      content += '0 -15 Td\n';
    }

    return content;
  }

  private createDescriptionSection(formData: FormData, cleanText: Function): string {
    let content = '';
    
    // Business description with proper form styling
    content += '/F2 8 Tf\n';
    content += '(MERCHANT SELLS: \\(SPECIFY PRODUCT, SERVICE AND/OR INFORMATION\\)) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.businessDescription || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(_______________________________________________________________________) Tj\n';
    content += '0 -5 Td\n';
    content += '(_______________________________________________________________________) Tj\n';
    
    content += '0 -15 Td\n';
    return content;
  }

  private createServicesSection(formData: FormData, cleanText: Function): string {
    let content = '';
    
    // Products and services with checkboxes
    content += '/F2 8 Tf\n';
    content += '(PRODUCTS & SERVICES OFFERED:) Tj\n';
    content += '0 -12 Td\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.productsServices || '') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(_______________________________________________________________________) Tj\n';
    content += '0 -5 Td\n';
    content += '(_______________________________________________________________________) Tj\n';
    
    // Refund policy section
    content += '0 -15 Td\n';
    content += '/F2 8 Tf\n';
    content += '(REFUND POLICY FOR VISA / MASTERCARD / AMEX / DISCOVER NETWORK SALES) Tj\n';
    content += '0 -10 Td\n';
    content += '(□ REFUND WILL BE GRANTED TO A CUSTOMER AS FOLLOWS) Tj\n';
    content += '250 0 Td\n';
    content += '(□ NO REFUND. ALL SALES FINAL) Tj\n';
    content += '-250 0 Td\n';
    content += '0 -8 Td\n';
    content += '(□ EXCHANGE) Tj\n';
    content += '100 0 Td\n';
    content += '(□ STORE CREDIT) Tj\n';
    content += '-100 0 Td\n';
    
    content += '0 -20 Td\n';
    return content;
  }

  private createTransactionSection(formData: FormData, cleanText: Function): string {
    let content = '';
    
    // Section header
    content += '/F2 11 Tf\n';
    content += '(  3. TRANSACTION INFORMATION) Tj\n';
    content += '0 -18 Td\n';
    
    // Financial data subheader
    content += '/F2 9 Tf\n';
    content += '(FINANCIAL DATA) Tj\n';
    content += '300 0 Td\n';
    content += '(VISA / MASTERCARD / AMEX / DISCOVER NETWORK INFORMATION) Tj\n';
    content += '-300 0 Td\n';
    content += '0 -15 Td\n';
    
    // Monthly volume line
    content += '/F2 8 Tf\n';
    content += '(  AVERAGE COMBINED MONTHLY VISA/MC/DISCOVER/AMEX VOLUME) Tj\n';
    content += '280 0 Td\n';
    content += '($) Tj\n';
    content += '50 0 Td\n';
    content += '(MERCHANT TYPE) Tj\n';
    content += '-330 0 Td\n';
    content += '0 -10 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.monthlyVolume || '') + ') Tj\n';
    content += '280 0 Td\n';
    content += '(' + cleanText(formData.processingMethod || '') + ') Tj\n';
    content += '-280 0 Td\n';
    content += '0 -5 Td\n';
    content += '/F1 7 Tf\n';
    content += '(__________________) Tj\n';
    content += '280 0 Td\n';
    content += '(__________________) Tj\n';
    content += '-280 0 Td\n';
    
    // Average ticket line
    content += '0 -12 Td\n';
    content += '/F2 8 Tf\n';
    content += '(  AVERAGE VISA / MC / AMEX / DISCOVER NETWORK TICKET) Tj\n';
    content += '280 0 Td\n';
    content += '($) Tj\n';
    content += '50 0 Td\n';
    content += '(RESTAURANT/FOOD) Tj\n';
    content += '-330 0 Td\n';
    content += '0 -10 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.averageTicket || '') + ') Tj\n';
    content += '0 -5 Td\n';
    content += '/F1 7 Tf\n';
    content += '(__________________) Tj\n';
    content += '280 0 Td\n';
    content += '(__________________) Tj\n';
    content += '-280 0 Td\n';
    
    // Highest ticket line
    content += '0 -12 Td\n';
    content += '/F2 8 Tf\n';
    content += '(  HIGHEST TICKET AMOUNT) Tj\n';
    content += '280 0 Td\n';
    content += '($) Tj\n';
    content += '50 0 Td\n';
    content += '(LODGING) Tj\n';
    content += '-330 0 Td\n';
    content += '0 -10 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(formData.highestTicket || '') + ') Tj\n';
    content += '0 -5 Td\n';
    content += '/F1 7 Tf\n';
    content += '(__________________) Tj\n';
    content += '280 0 Td\n';
    content += '(__________________) Tj\n';
    content += '-280 0 Td\n';
    
    // Processing method details
    content += '0 -15 Td\n';
    content += '/F2 8 Tf\n';
    content += '(PROCESSING METHOD: ) Tj\n';
    content += '/F1 9 Tf\n';
    content += '(' + cleanText(formData.processingMethod || 'RETAIL OUTLET') + ') Tj\n';
    content += '0 -8 Td\n';
    content += '/F2 8 Tf\n';
    content += '(□ RETAIL OUTLET    □ RESTAURANT/FOOD    □ LODGING    □ INTERNET    □ MAIL/TELEPHONE ORDER) Tj\n';
    
    content += '0 -20 Td\n';
    return content;
  }

  private createFooterSection(prospect: MerchantProspect, cleanText: Function): string {
    let content = '';
    
    // Merchant acknowledgment section
    content += '/F2 8 Tf\n';
    content += '(Print Client\'s Business Legal Name:) Tj\n';
    content += '0 -10 Td\n';
    content += '/F1 10 Tf\n';
    content += '(' + cleanText(prospect.firstName + ' ' + prospect.lastName) + ') Tj\n';
    content += '0 -5 Td\n';
    content += '/F1 7 Tf\n';
    content += '(_______________________________________________________________________) Tj\n';
    
    // Acknowledgment text
    content += '0 -15 Td\n';
    content += '/F2 7 Tf\n';
    content += '(By its signature below, Client acknowledges that it received the complete Program Guide consisting of multiple) Tj\n';
    content += '0 -8 Td\n';
    content += '(pages including this confirmation. Client further acknowledges reading and agreeing to all terms in the) Tj\n';
    content += '0 -8 Td\n';
    content += '(Program Guide, which shall be incorporated into Client\'s Agreement. Upon receipt of a signed copy of this) Tj\n';
    content += '0 -8 Td\n';
    content += '(Application by us, Client\'s Application will be processed.) Tj\n';
    
    // Warning text
    content += '0 -12 Td\n';
    content += '/F2 8 Tf\n';
    content += '(NO ALTERATIONS OR STRIKE-OUTS TO THE PROGRAM GUIDE WILL BE ACCEPTED AND, IF MADE,) Tj\n';
    content += '0 -8 Td\n';
    content += '(ANY SUCH ALTERATIONS OR STRIKE-OUTS SHALL NOT APPLY.) Tj\n';
    
    // Signature lines
    content += '0 -20 Td\n';
    content += '/F2 8 Tf\n';
    content += '(CLIENTS BUSINESS PRINCIPAL SIGNATURE) Tj\n';
    content += '300 0 Td\n';
    content += '(TITLE) Tj\n';
    content += '100 0 Td\n';
    content += '(DATE) Tj\n';
    content += '-400 0 Td\n';
    content += '0 -15 Td\n';
    content += '/F1 7 Tf\n';
    content += '(___________________________________________) Tj\n';
    content += '300 0 Td\n';
    content += '(______________) Tj\n';
    content += '100 0 Td\n';
    content += '(______________) Tj\n';
    content += '-400 0 Td\n';
    
    // Print name line
    content += '0 -10 Td\n';
    content += '/F2 8 Tf\n';
    content += '(PRINT NAME) Tj\n';
    content += '0 -8 Td\n';
    content += '/F1 7 Tf\n';
    content += '(___________________________________________) Tj\n';
    
    // Copyright and reference info
    content += '0 -20 Td\n';
    content += '/F2 6 Tf\n';
    content += '(© COPYRIGHT 2025 CORE CRM MERCHANT CENTER. ALL RIGHTS RESERVED.) Tj\n';
    content += '250 0 Td\n';
    content += '(MERCHANT PROCESSING APPLICATION & AGREEMENT) Tj\n';
    content += '-250 0 Td\n';
    content += '0 -8 Td\n';
    content += '(Application Reference: ' + cleanText(prospect.validationToken || 'N/A') + ') Tj\n';
    content += '200 0 Td\n';
    content += '(Submitted: ' + new Date().toLocaleDateString() + ') Tj\n';
    content += '100 0 Td\n';
    content += '(PAGE 1 OF 2) Tj\n';
    content += '-300 0 Td\n';
    
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