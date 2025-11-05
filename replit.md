# Core CRM - Merchant Payment Processing System

## Overview
Core CRM is a comprehensive merchant payment processing management system designed to streamline merchant onboarding, transaction management, location tracking, form processing, and analytics. It offers role-based access for various user types (merchants, agents, administrators, corporate users). The project aims to provide a robust, scalable, and secure platform for payment processing businesses, empowering them with efficient, transparent, and secure payment management to gain a competitive edge.

## Recent Changes

### PDF Parser & Owner Field Visibility Fixes (Nov 5, 2025)

#### PDF Parser Address & Signature Group Extraction
**Fixed critical bug**: PDF parser now correctly extracts address and signature groups from uploaded templates.

**Problem**: The parser was detecting address/signature fields but not creating the addressGroups/signatureGroups arrays. The issue was that extraction methods were using normalized fieldNames (e.g., `merchant_mailing_address_street1`) instead of the original pdfFieldIds (e.g., `merchant_mailing_address.street1`) for pattern matching.

**Solution**: Updated `extractAddressGroups()` and `extractSignatureGroups()` to:
- Use original `pdfFieldId` (preserves dots) for regex pattern matching
- Store normalized `fieldName` in `fieldMappings` for downstream consumption
- Added debug logging to track successful matches

**Impact**: Templates uploaded now properly populate addressGroups and signatureGroups JSONB columns, enabling the Enhanced PDF Wizard to auto-detect and render address/signature input components.

#### Owner Field Visibility & Progressive Disclosure
**Fixed critical bug**: Enhanced PDF Wizard now correctly filters all owner 2-5 fields based on ownership percentage logic.

**Problem**: All 5 owner data entry blocks (regular fields, address groups, and signature groups) were always visible, overwhelming users even when only 1 owner was needed.

**Solution**: Implemented comprehensive filtering across three rendering paths:
1. **Regular Fields**: Added owner pattern matching in `shouldShowField()` to filter fields starting with `owner2_`, `owner3_`, etc.
2. **Address Groups**: Added owner filtering in address group insertion logic to skip `owner2_mailing_address`, etc.
3. **Signature Groups**: Enhanced existing signature group filtering to use correct regex pattern (removed `^` anchor to match `owners_owner1_signature_owner` format)

**Behavior**: 
- Owner 1 fields (all types) → Always visible
- Owner 2-5 fields (all types) → Only visible when total ownership percentage < 100%
- Automatically expands next owner slot when user enters ownership percentage

**Pattern Support**: Handles both naming conventions:
- Direct: `owner1_phone`, `owner1_mailing_address.street1`
- Grouped: `owners_owner1_signature_owner.signerName`

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Theming**: CSS variables for consistent look and feel.
- **Form Design**: React Hook Form with Zod validation.
- **Responsive Design**: Radix UI and shadcn/ui with Tailwind CSS.
- **Icon Color Coding**: Visual differentiation by user type (Agents: Blue, Merchants: Green, Prospects: Yellow).

### Technical Implementations
- **Frontend**: React with TypeScript and Vite, TanStack Query, Wouter for routing.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM on Neon serverless.
- **Authentication**: Session-based with `express-session`, PostgreSQL session store, and 2FA.
- **Email Service**: SendGrid for transactional emails with webhook integration, including a WYSIWYG editor (React Quill).
- **File Handling**: Multer for PDF form uploads.

### Feature Specifications
- **Company-Centric Data Architecture**: Companies as the root entity.
- **Role-Based Access Control**: Granular permissions for multiple roles.
- **Secure Authentication**: Session management, 2FA, password reset, strong password requirements.
- **Merchant & Agent Management**: Comprehensive profiles, assignment, status, fee management.
- **Location Management**: Polymorphic locations with geolocation and operating hours.
- **Transaction Processing**: Tracking, commission calculations, revenue analytics.
- **Form Management System**: PDF upload/parsing, dynamic field generation, public access, conditional fields with real-time evaluation.
- **Dashboard System**: Personalized, widget-based dashboards with real-time analytics.
- **Digital Signature System**: Comprehensive signature capture and management:
  - **Multi-Role Signatures**: Support for owner, agent, guarantor, witness, and acknowledgement signatures
  - **Auto-Detection**: PDF field pattern detection using `{prefix}_signature_{role}.{fieldType}` convention
  - **Capture Methods**: Canvas-based drawing and typed signature input
  - **Email Workflows**: Automated signature request emails with 7-day expiration
  - **Trigger Integration**: signature_requested, signature_captured, signature_expired events
  - **Status Tracking**: pending, requested, signed, expired states with timestamp tracking
  - **Security**: Token-based authentication, expiration validation, audit trail logging
- **Address Validation & Autocomplete**: Google Maps Geocoding and Places Autocomplete integration with standardized components and backend mapping.
- **Campaign Management**: Full CRUD for campaigns, pricing types, fee groups, equipment associations.
- **SOC2 Compliance Features**: Comprehensive audit trail, logging, security events, login attempt tracking.
- **Generic Trigger/Action Catalog System**: Extensible event-driven action system supporting multi-channel notifications and action chaining.
- **User Profile Management**: Self-service profile/settings page.

### System Design Choices
- **Testing Framework**: TDD-style with Jest and React Testing Library.
- **Schema Management**: Comprehensive database schema comparison, synchronization, version-controlled migration system, and drift detection.
- **Multi-Environment Support**: Session-based database environment switching (Development, Test, Production).
- **Database Safety**: Strict protocols and wrapper scripts to prevent accidental production database modifications.
- **Deployment Pipeline Compliance**: All schema changes must follow Dev → Test → Production pipeline.
- **User-Company Association Pattern**: **CRITICAL ARCHITECTURE** - All agent and merchant lookups MUST use the generic pattern: `User → user_company_associations → Company → Agent/Merchant`.

## Signature System Architecture

### Database Schema
- **signature_captures**: Stores all signature data with fields:
  - `id`, `applicationId`, `prospectId`, `roleKey`, `signerType`, `signerName`, `signerEmail`
  - `signature` (base64), `signatureType` (canvas/typed), `initials`, `dateSigned`
  - `timestampSigned`, `timestampRequested`, `timestampExpires`, `requestToken`
  - `status` (pending/requested/signed/expired), `notes`, `ownershipPercentage`

### Field Naming Conventions
Signature groups use a strict naming pattern for PDF field detection:
- **Pattern**: `{prefix}_signature_{role}.{fieldType}`
- **Example**: `owner1_signature_owner.signername`, `owner1_signature_owner.signature`, `owner1_signature_owner.email`
- **Field Types**: `signername`, `signature`, `initials`, `email`, `datesigned`
- **Role Prefixes**: `owner1`, `owner2`, `guarantor`, `agent`, `witness`

### API Endpoints
- `POST /api/signature-requests` - Request signature from signer (authenticated)
- `POST /api/signatures/capture` - Submit signature (public, token-validated)
- `GET /api/signatures/:token/status` - Check signature status (public)
- `POST /api/signatures/:token/resend` - Resend expired request (authenticated)
- `GET /api/signatures/application/:applicationId` - Get all signatures for application
- `GET /api/signatures/prospect/:prospectId` - Get all signatures for prospect

### Workflow States
1. **Pending**: Initial state, signature not yet requested
2. **Requested**: Email sent to signer with token link (7-day expiration)
3. **Signed**: Signature captured and stored
4. **Expired**: Request token expired after 7 days

### Trigger/Action Integration
- **signature_requested**: Fires after successful email send, creates audit trail
- **signature_captured**: Fires when signature is submitted, sends confirmation email
- **signature_expired**: Fires when signature expires (requires scheduled job)
- **Email Templates**: Request, Confirmation, 3-Day Reminder, 1-Day Reminder, Expiration Notice

### Frontend Components
- **SignatureGroupInput**: Reusable component with canvas/typed signature capture
- **Enhanced PDF Wizard**: Auto-detects signature groups and renders signature controls
- **Status Indicators**: Visual feedback for pending, requested, signed, expired states

## External Dependencies
- **pg**: Native PostgreSQL driver.
- **drizzle-orm**: Type-safe ORM for PostgreSQL.
- **@sendgrid/mail**: SendGrid email API client.
- **@anthropic-ai/sdk**: AI integration.
- **@tanstack/react-query**: React server state management.
- **@radix-ui/**\*: UI component primitives.
- **bcrypt**: Password hashing.
- **speakeasy**: Two-factor authentication.
- **express-session**: Session management middleware.
- **connect-pg-simple**: PostgreSQL session store.
- **multer**: Middleware for handling `multipart/form-data`.
- **react-quill**: WYSIWYG rich text editor.
- **google-maps-services-js**: Google Maps Geocoding and Places APIs.