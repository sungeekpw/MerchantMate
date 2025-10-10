# Core CRM - Merchant Payment Processing System

## Overview
Core CRM is a comprehensive merchant payment processing management system designed to streamline merchant onboarding, transaction management, location tracking, form processing, and analytics. It offers role-based access for various user types (merchants, agents, administrators, corporate users). The project aims to provide a robust, scalable, and secure platform for payment processing businesses, empowering them with efficient, transparent, and secure payment management to gain a competitive edge.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Theming**: CSS variables support theming for a consistent look and feel.
- **Form Design**: Employs React Hook Form with Zod validation for robust and user-friendly data input.
- **Responsive Design**: Utilizes Radix UI and shadcn/ui with Tailwind CSS for adaptive layouts.

### Technical Implementations
- **Frontend**: React with TypeScript and Vite, using TanStack Query for server state management and Wouter for routing.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM, deployed on Neon serverless.
- **Authentication**: Session-based authentication using `express-session` and a PostgreSQL session store, including 2FA and robust password management.
- **Email Service**: SendGrid for transactional emails with webhook integration for delivery and open rate tracking.
- **Email Template Editor**: WYSIWYG editor (React Quill) with visual/HTML toggle for easy template creation and editing, preserving variable placeholders.
- **File Handling**: Multer for PDF form uploads.

### Feature Specifications
- **Company-Centric Data Architecture**: Companies are the root entity, ensuring data integrity and cascading operations for agents and merchants.
- **Role-Based Access Control**: Granular permissions for `merchant`, `agent`, `admin`, `corporate`, `super_admin` roles.
- **Secure Authentication**: Session management, login attempt tracking, 2FA, password reset, and strong password requirements with re-verification for sensitive operations.
- **Merchant & Agent Management**: Comprehensive profiles, assignment, status tracking, and fee management with real-time phone number and EIN/Tax ID formatting and validation.
- **Location Management**: Polymorphic locations supporting both merchant-specific and company-level addresses, with geolocation and operating hours.
- **Transaction Processing**: Tracking, commission calculations, and revenue analytics.
- **Form Management System**: PDF upload/parsing, dynamic field generation, and public access.
- **Dashboard System**: Personalized, widget-based dashboards with real-time analytics.
- **Digital Signature**: Inline canvas-based and typed signature functionality with email request workflows.
- **Address Validation**: Google Maps Geocoding and Places Autocomplete integration.
- **Campaign Management**: Full CRUD for campaigns, pricing types, fee groups, and equipment associations.
- **SOC2 Compliance Features**: Comprehensive audit trail system with logging, security events, and login attempt tracking.
- **Generic Trigger/Action Catalog System**: Extensible event-driven action system supporting multi-channel notifications and action chaining.

### System Design Choices
- **Testing Framework**: TDD-style with Jest and React Testing Library for comprehensive testing, including a visual testing dashboard.
- **Manual Testing Checklist**: Comprehensive manual test cases in `TESTING_CHECKLIST.md` covering all Communication Management features for non-technical users to validate before deployment.
- **Schema Management**: Comprehensive database schema comparison and synchronization utilities with a version-controlled migration system.
- **Multi-Environment Support**: Session-based database environment switching (Development, Test, Production) with an environment selector and automatic connection fallback.
- **Database Safety**: Strict protocols and wrapper scripts (`scripts/execute-sql.ts`) are enforced to prevent accidental production database modifications, explicitly forbidding direct use of `execute_sql_tool` for non-emergency situations.
- **Safe Schema Changes**: NEVER add required fields (`.notNull()`) to existing tables with data - this causes Drizzle to drop/recreate tables, deleting all data. Always make new fields optional or use defaults. See `DEPLOYMENT_GUIDE.md` for detailed safety guidelines.
- **Environment Synchronization**: Automated Dev → Test → Production pipeline using `scripts/sync-environments.ts` for schema migrations and lookup data synchronization. See `SYNC_GUIDE.md` for non-technical user instructions.

### Critical Schema Change Protocol
**MANDATORY STEPS - NEVER SKIP:**
1. **ALWAYS update `shared/schema.ts` FIRST** when adding/modifying database columns
2. **NEVER manually modify databases** with SQL commands - all changes go through the schema file
3. **Run `npm run db:push`** to sync schema changes to Development database
4. **Use sync tools** to propagate changes: `tsx scripts/sync-environments.ts dev-to-test`
5. **Column order matters** - PostgreSQL column positions must match exactly across environments
6. **Verify with Compare Schemas** - Use Database Utilities to visually confirm sync success

**Why This Matters:**
- Schema drift (database columns not in schema.ts) causes Drizzle to drop tables/columns on next push
- Manual database changes bypass version control and cause environment inconsistencies
- Incorrect column order confuses Drizzle's change detection system

**Recent Schema Updates (October 2025):**
- Added to `equipmentItems`: model (text), price (decimal), status (text, default 'available')
- Added to `feeItems`: feeItemGroupId (integer, foreign key to fee_item_groups)
- Extended `auditLogs`: Added 15 columns for enhanced tracking (resource_type, details, timestamp, severity, category, outcome, error_message, request_id, correlation_id, metadata, geolocation, device_info, retention_policy, encryption_key_id, updated_at)
- Extended `merchants`: Added 10 columns for comprehensive merchant data (business_name, business_type, email, phone, dba_name, legal_name, ein, website, industry, updated_at)

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
- **react-quill**: WYSIWYG rich text editor for email template HTML content.
- **google-maps-services-js**: Google Maps Geocoding and Places APIs.