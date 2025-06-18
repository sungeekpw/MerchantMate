# Core CRM - Merchant Payment Processing System

## Overview

Core CRM is a comprehensive merchant payment processing management system built with a React frontend and Express backend. The application provides role-based access control for different user types including merchants, agents, administrators, and corporate users. It features merchant onboarding, transaction management, location tracking, form processing, and comprehensive analytics.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and building
- **UI Components**: Radix UI with shadcn/ui component library using Tailwind CSS
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with CSS variables for theming

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: Session-based authentication with express-session
- **Session Storage**: PostgreSQL session store
- **Email Service**: SendGrid for transactional emails
- **File Handling**: Multer for PDF form uploads

### Data Storage Solutions
- **Primary Database**: PostgreSQL with comprehensive schema including:
  - User management with role-based access control
  - Merchant and agent management
  - Location and address tracking with geolocation support
  - Transaction processing and tracking
  - PDF form management and submissions
  - Dashboard customization preferences
- **Session Storage**: PostgreSQL-based session store for authentication
- **File Storage**: Server filesystem for uploaded PDF forms

## Key Components

### User Management & Authentication
- Role-based access control (merchant, agent, admin, corporate, super_admin)
- Session-based authentication with security features
- Login attempt tracking and account lockout protection
- Two-factor authentication support
- Password reset functionality
- Development authentication bypass for testing

### Merchant Management
- Comprehensive merchant profiles with business information
- Agent assignment and management
- Status tracking (active, pending, suspended)
- Processing fee management
- Monthly volume tracking

### Location & Address Management
- Multiple locations per merchant
- Geolocation support with latitude/longitude tracking
- Address management with timezone support
- Operating hours configuration
- Revenue tracking per location

### Transaction Processing
- Transaction tracking with merchant association
- Multiple transaction types and statuses
- Commission calculations
- Revenue analytics and reporting

### Form Management System
- PDF form upload and parsing
- Dynamic form field generation
- Form submission workflow
- Public form access for prospects
- Form validation and data collection

### Dashboard System
- Personalized widget-based dashboards
- Role-specific widget availability
- Configurable widget sizes and positions
- Real-time analytics and metrics

## Data Flow

1. **Authentication Flow**: Users authenticate through session-based system with role validation
2. **Merchant Onboarding**: Prospects complete forms → validation → agent assignment → merchant creation
3. **Transaction Processing**: Transactions are recorded with merchant/location association → analytics generation
4. **Form Workflow**: PDF forms uploaded → parsed into fields → public forms created → submissions collected
5. **Dashboard Updates**: Real-time data flows to personalized widgets based on user role and permissions

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **@sendgrid/mail**: Email service integration
- **@anthropic-ai/sdk**: AI integration capabilities
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Comprehensive UI component primitives

### Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production
- **tailwindcss**: Utility-first CSS framework

### Authentication & Security
- **bcrypt**: Password hashing
- **speakeasy**: Two-factor authentication
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

The application is configured for deployment on Replit with:
- **Development**: `npm run dev` using tsx for hot reloading
- **Production Build**: Vite builds frontend, esbuild bundles backend
- **Database**: Neon PostgreSQL with automatic connection pooling
- **Session Management**: Persistent PostgreSQL-based sessions
- **Environment**: Node.js 20 with PostgreSQL 16 module

### Build Process
1. Frontend built with Vite to `dist/public`
2. Backend bundled with esbuild to `dist/index.js`
3. Database schema managed with Drizzle migrations
4. Static assets served from built frontend

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SENDGRID_API_KEY`: Email service authentication
- `SENDGRID_FROM_EMAIL`: Default sender email
- `SESSION_SECRET`: Session encryption key (optional, has fallback)

## Changelog
- June 17, 2025. Initial setup
- June 17, 2025. Added Google Maps address validation and autocomplete
  - Integrated Google Maps Geocoding API for address validation
  - Added Google Places Autocomplete API for address suggestions
  - Implemented real-time address autocomplete after 4 characters
  - Auto-populates city, state, and ZIP code fields when valid address selected
  - Added visual feedback with loading indicators and validation status
  - Phone number formatting on blur for company phone field
  - US states dropdown for consistent state selection
- June 17, 2025. Completed Agent Dashboard implementation
  - Built comprehensive agent dashboard with real-time statistics and application tracking
  - Added agent-specific navigation in sidebar for role-based access
  - Created backend API endpoints for dashboard stats and applications with proper authentication
  - Fixed React Query configuration with explicit queryFn for agent dashboard endpoints
  - Implemented session-based authentication for agent dashboard API calls
  - Dashboard displays live prospect data including status tracking and completion percentages
  - Successfully tested with agent Mike Chen showing 1 prospect (Rudy Thurston) in "contacted" status
- June 17, 2025. Fixed Address Selection in Merchant Application Form
  - Resolved address autocomplete issues where Vancouver data was persisting incorrectly
  - Implemented proper form data clearing and direct DOM manipulation to override browser persistence
  - Added keyboard navigation support (arrow keys, Enter, Escape) for address suggestions
  - Made City, State, and ZIP Code fields read-only after address selection from autocomplete
  - Added "Edit Address" button to unlock fields when users need to make manual changes
  - Enhanced visual feedback with proper styling for locked/unlocked states
  - Address selection now correctly populates with selected data (e.g., Tustin, CA 92780)
- June 17, 2025. Added EIN validation and formatting to merchant application form
  - Implemented automatic EIN formatting from 9 digits to XX-XXXXXXX format on field blur
  - Added comprehensive EIN validation requiring exactly 9 digits
  - Enhanced user experience with helpful placeholder text indicating EIN format requirements
  - Integrated EIN formatting alongside existing phone number formatting functionality
  - Added validation error messages for invalid EIN entries with clear formatting guidance
- June 17, 2025. Implemented inline digital signature functionality for Business Ownership section
  - Created canvas-based digital signature component with draw and type options
  - Users can draw signatures with mouse/touch or type names in signature font style
  - Replaced file upload system with seamless inline signature experience
  - Added signature preview, edit, clear, and save functionality
  - Integrated signature requirements for owners with >25% ownership automatically
  - Added proper TypeScript definitions and null safety checks for canvas operations
  - Enhanced form UX with signature status indicators and professional styling
  - Improved ownership UI by hiding "Add Owner" button when total reaches 100%
  - Added professional email signature request system using SendGrid
  - Created secure signature request emails with personalized links and legal disclaimers
  - Integrated email request buttons for owners who cannot sign immediately
  - Added email status tracking with timestamps and delivery confirmation
- June 17, 2025. Implemented money field formatting for transaction information
  - Added automatic currency formatting for transaction fields (monthlyVolume, averageTicket, highestTicket)
  - Fields automatically format to two decimal places when users finish entering values
  - Enhanced placeholder text to guide users on proper currency format entry
  - Ensures consistent financial data formatting throughout the application
- June 17, 2025. Fixed agent prospect modal assignment functionality
  - Resolved issue where two separate ProspectModal components existed (separate file vs inline)
  - Fixed the inline ProspectModal in prospects.tsx to properly detect agent role authentication
  - Added read-only "Assigned Agent" field that auto-fills with logged-in agent name and email
  - Agents now see "Mike Chen (mike.chen@corecrm.com)" in a read-only field when adding new prospects
  - Form automatically assigns correct agentId (2) for agent users creating new prospects
  - Updated API permissions to allow agents to create and edit prospects
  - Fixed email service to send validation emails with correct agent information
  - Prospects created by agents now appear correctly in agent-filtered prospect list
- June 17, 2025. Updated prospects table column from "Validated" to "Submitted"
  - Changed column header from "Validated" to "Submitted" for better clarity
  - Modified display logic to show submission date (updatedAt) for submitted/applied prospects
  - Maintains visual consistency with green calendar icon and formatted date display
  - Shows dash (—) for prospects that haven't submitted applications yet
- June 17, 2025. Fixed signature request email sending error and implemented public signature page
  - Resolved 403 Forbidden error in signature request emails
  - Changed hardcoded sender address to use verified SENDGRID_FROM_EMAIL environment variable
  - Implemented workflow continuation when signature emails fail - system generates token and continues process
  - Added graceful email failure handling to prevent blocking the application workflow
  - Created public signature request page (/signature-request) that doesn't require authentication
  - Added canvas-based drawing and typed signature options for business owners
  - Implemented secure signature submission endpoint for external users
  - Complete signature workflow now functional from email link to signature submission
  - Fixed signature retrieval timing issue - signatures now properly appear in application form
  - Added signature storage system with automatic retrieval when prospects return to form
  - Enhanced debugging and error handling for signature workflow integration
  - Fixed signature token saving issue - tokens now properly saved to owner records when sending email requests
  - Complete end-to-end signature workflow now functional with proper token linking and retrieval
  - Added manual "Check for Signatures" button to retrieve submitted signatures when form data doesn't persist owners
  - Signature system fully operational with manual refresh capability for edge cases
  - Enhanced signature system with email-token mapping and email-based signature search
  - Signatures now automatically include owner email addresses for reliable retrieval
  - Added fallback email search when signature tokens are not available in form data
  - Implemented dual storage system with token-based and email-based signature lookup for reliability
  - Complete signature workflow now tested and confirmed working end-to-end
  - Signatures persist across server restarts and can be retrieved by email when tokens are lost
- June 18, 2025. Implemented complete database-backed signature system with PostgreSQL persistence
  - Replaced in-memory signature storage with PostgreSQL database tables (prospect_owners, prospect_signatures)
  - Created comprehensive database schema with proper owner-signature relationships and foreign key constraints
  - Updated all signature API endpoints to use database storage for complete persistence across server restarts
  - Added automatic signature loading functionality that retrieves stored signatures when form loads
  - Fixed prospect ID extraction from nested data structure for proper signature request processing
  - Implemented owners-with-signatures API endpoint that merges owner data with completed signatures
  - Fixed percentage field formatting to remove % sign for proper form input display
  - Complete signature workflow now fully database-backed with reliable persistence and automatic recovery
  - Successfully tested end-to-end: signature requests, submissions, and form loading all working perfectly

## User Preferences
Preferred communication style: Simple, everyday language.