# Core CRM - Merchant Payment Processing System

## Overview
Core CRM is a comprehensive merchant payment processing management system designed to streamline merchant onboarding, transaction management, location tracking, form processing, and analytics. It offers role-based access for various user types (merchants, agents, administrators, corporate users). The project aims to provide a robust, scalable, and secure platform for payment processing businesses, empowering them with efficient, transparent, and secure payment management to gain a competitive edge.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Theming**: CSS variables support theming for a consistent look and feel.
- **Form Design**: Employs React Hook Form with Zod validation.
- **Responsive Design**: Utilizes Radix UI and shadcn/ui with Tailwind CSS for adaptive layouts.
- **Icon Color Coding**: Visual differentiation by user type:
  - Agents: Blue (`bg-blue-100`, `text-blue-600`)
  - Merchants: Green (`bg-green-100`, `text-green-600`)
  - Prospects: Yellow (`bg-yellow-100`, `text-yellow-600`)

### Technical Implementations
- **Frontend**: React with TypeScript and Vite, using TanStack Query for server state management and Wouter for routing.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM, deployed on Neon serverless.
- **Authentication**: Session-based authentication using `express-session` and a PostgreSQL session store, including 2FA.
- **Email Service**: SendGrid for transactional emails with webhook integration, including a WYSIWYG editor (React Quill).
- **File Handling**: Multer for PDF form uploads.

### Feature Specifications
- **Company-Centric Data Architecture**: Companies are the root entity.
- **Role-Based Access Control**: Granular permissions for `merchant`, `agent`, `admin`, `corporate`, `super_admin` roles.
- **Secure Authentication**: Session management, login attempt tracking, 2FA, password reset, and strong password requirements.
- **Merchant & Agent Management**: Comprehensive profiles, assignment, status tracking, and fee management.
- **Location Management**: Polymorphic locations with geolocation and operating hours.
- **Transaction Processing**: Tracking, commission calculations, and revenue analytics.
- **Form Management System**: PDF upload/parsing, dynamic field generation, public access, and conditional field visibility with both field-level and option-level triggers supporting real-time evaluation.
- **Dashboard System**: Personalized, widget-based dashboards with real-time analytics.
- **Digital Signature**: Inline canvas-based and typed signature functionality with email request workflows, including an agent signature workflow.
- **Address Validation & Autocomplete**: Google Maps Geocoding and Places Autocomplete integration using a standardized `AddressAutocompleteInput` component. Templates define address groups with canonical-to-template field mappings. Backend mapper translates canonical fields (street1, city, state, postalCode) to template-specific names during form submission.
- **Campaign Management**: Full CRUD for campaigns, pricing types, fee groups, and equipment associations.
- **SOC2 Compliance Features**: Comprehensive audit trail system with logging, security events, and login attempt tracking.
- **Generic Trigger/Action Catalog System**: Extensible event-driven action system supporting multi-channel notifications and action chaining with a unified `action_templates` architecture.
- **User Profile Management**: Self-service profile/settings page.

### System Design Choices
- **Testing Framework**: TDD-style with Jest and React Testing Library.
- **Schema Management**: Comprehensive database schema comparison and synchronization utilities with a version-controlled migration system and drift detection.
- **Multi-Environment Support**: Session-based database environment switching (Development, Test, Production).
- **Database Safety**: Strict protocols and wrapper scripts are enforced to prevent accidental production database modifications.
- **Deployment Pipeline Compliance**: All schema changes MUST follow the strict Dev → Test → Production deployment pipeline documented in `MIGRATION_WORKFLOW.md`.
- **User-Company Association Pattern**: **CRITICAL ARCHITECTURE** - ALL agent and merchant lookups MUST use the generic pattern: `User → user_company_associations → Company → Agent/Merchant`.

## Recent Changes

### Campaign Selector Display Enhancement
**Completed**: October 24, 2025

**Changes Made**:
1. **Backend Enhancement** (server/routes.ts):
   - Modified `/api/campaigns` endpoint to include first application template for each campaign
   - Added query to fetch template data from `campaign_application_templates` junction table
   - Response now includes `firstTemplate` object with template ID and name

2. **Frontend Update** (client/src/pages/prospects.tsx):
   - Changed campaign selector display from `{{campaign_name}} - {{acquirer}}` to `{{campaign_name}} - {{template_name}}`
   - Shows "No Template" fallback when campaign has no templates assigned
   - Provides clearer context about which application form prospects will complete

### Address Mapper System Implementation
**Completed**: October 23, 2025

**Changes Made**:
1. **Backend Mapper Services** (server/routes.ts):
   - `mapCanonicalAddressesToTemplate()`: Converts canonical address fields (businessAddress.street1, etc.) to template-specific field names during form submission
   - `mapTemplateAddressesToCanonical()`: Reverse mapping for loading saved data back into canonical format
   - Both mappers use `addressGroups` metadata from templates to determine field mappings

2. **Environment-Specific Database Connections**:
   - Fixed `/api/prospects/token/:token` endpoint to use dbMiddleware pattern (lines 2276-2317)
   - Now correctly respects 3-environment architecture (Dev/Test/Production)
   - Uses `getRequestDB(req)` for environment-specific connections instead of static `db` import
   - Added missing `campaignApplicationTemplates` import (line 25)

3. **Schema Synchronization**:
   - Applied comprehensive migration to DEV and TEST environments
   - Migration file: `migrations/comprehensive-dev-sync-2025-10-23.sql`
   - Added `address_groups` column to `acquirer_application_templates`
   - Created `campaign_application_templates` junction table
   - Added `pdf_field_id` column to `pdf_form_fields`

**Environment-Aware Prospect Links**:
- Email links automatically include `?db=` parameter for non-production environments (via `sendProspectValidationEmail`)
- Frontend copy-to-clipboard function includes environment parameter (via `/api/environment` endpoint)
- Ensures prospects always access the correct database environment where their data was created

**Testing Requirements**:
To test the address mapper end-to-end:
1. Assign a template with `addressGroups` configuration to a campaign via `campaign_application_templates` junction table
2. Create or load a prospect application linked to that campaign
3. Verify addresses are properly mapped both ways (canonical ↔ template-specific)

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