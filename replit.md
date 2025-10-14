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
- **Email Service**: SendGrid for transactional emails with webhook integration.
- **Email Template Editor**: WYSIWYG editor (React Quill) with visual/HTML toggle.
- **File Handling**: Multer for PDF form uploads.

### Feature Specifications
- **Company-Centric Data Architecture**: Companies are the root entity, ensuring data integrity.
- **Role-Based Access Control**: Granular permissions for `merchant`, `agent`, `admin`, `corporate`, `super_admin` roles.
- **Secure Authentication**: Session management, login attempt tracking, 2FA, password reset, and strong password requirements.
- **Merchant & Agent Management**: Comprehensive profiles, assignment, status tracking, and fee management with real-time validation.
- **Location Management**: Polymorphic locations supporting both merchant-specific and company-level addresses, with geolocation and operating hours.
- **Transaction Processing**: Tracking, commission calculations, and revenue analytics.
- **Form Management System**: PDF upload/parsing, dynamic field generation, and public access.
- **Dashboard System**: Personalized, widget-based dashboards with real-time analytics.
- **Digital Signature**: Inline canvas-based and typed signature functionality with email request workflows.
- **Address Validation**: Google Maps Geocoding and Places Autocomplete integration.
- **Campaign Management**: Full CRUD for campaigns, pricing types, fee groups, and equipment associations.
- **SOC2 Compliance Features**: Comprehensive audit trail system with logging, security events, and login attempt tracking.
- **Generic Trigger/Action Catalog System**: Extensible event-driven action system supporting multi-channel notifications and action chaining with a unified `action_templates` architecture.
- **Email Templates Migration**: Successfully migrated from legacy `email_templates` table to unified `action_templates` system. Email Management UI now uses `/api/admin/action-templates/type/email` endpoint.
- **User Profile Management**: Self-service profile/settings page where users can update their own information (name, email, phone, communication preferences) and change passwords without admin intervention. Accessible via user menu dropdown in header.
- **Agent Signature Workflow**: Complete signature chain for merchant applications - owners with ≥25% ownership sign first, then assigned agent provides final signature to complete application. Agent Signature section appears dynamically after all required owner signatures are collected, using the same DigitalSignaturePad component with canvas drawing and typed signature support. Validation enforces signature order and completeness before submission.

### System Design Choices
- **Testing Framework**: TDD-style with Jest and React Testing Library for comprehensive testing, including a visual testing dashboard.
- **Manual Testing Checklist**: Comprehensive manual test cases in `TESTING_CHECKLIST.md`.
- **Schema Management**: Comprehensive database schema comparison and synchronization utilities with a version-controlled migration system and drift detection.
- **Multi-Environment Support**: Session-based database environment switching (Development, Test, Production) with an environment selector and automatic connection fallback.
- **Database Safety**: Strict protocols and wrapper scripts are enforced to prevent accidental production database modifications. Safe schema changes prioritize adding optional fields or using defaults to prevent data loss.
- **Environment Synchronization**: Automated Dev → Test → Production pipeline for schema migrations and lookup data synchronization.
- **Critical Schema Change Protocol**: Mandates updating `shared/schema.ts` first, using `npm run db:push`, and sync tools for propagation, explicitly forbidding manual database modifications.
- **Schema Drift Detection**: CLI and GUI tools for real-time drift detection and automated SQL migration generation across environments to ensure schema consistency and prevent data loss during promotions.
- **React Query Optimization**: Custom queryFn implementations with aggressive refetch settings (`staleTime: 0`, `gcTime: 0`, `refetchOnMount: 'always'`) for critical queries to prevent stale data caching from pre-authentication 401 responses. Applied to Action Templates and other admin pages.

## Recent Changes (October 2025)

### Agent Signature Implementation
**Status**: ✅ Code Complete | ⚠️ Database Sync Pending

**Implemented Features**:
1. **Database Schema** (shared/schema.ts): Added agent_signature, agent_signature_type, agent_signed_at fields to merchantProspects table
2. **Frontend UI** (enhanced-pdf-wizard.tsx): Dynamic "Agent Signature" section appears after all owner signatures (≥25% ownership) are collected
3. **API Endpoint** (routes.ts): POST /api/prospects/:id/agent-signature saves agent signature and timestamp
4. **Validation Logic** (routes.ts): Submit endpoint validates agent signature present before allowing application submission

**Database Synchronization Notes**:
- Schema changes defined in shared/schema.ts
- Columns added to development database via `ALTER TABLE` and `execute_sql_tool`
- Test environment synced via `tsx scripts/bulletproof-deploy.ts test`
- **Known Issue**: Session-based database connections may require additional sync. If encountering "column agent_signature does not exist" errors:
  1. Verify schema with: `tsx scripts/schema-drift-simple.ts development test`
  2. Sync schemas with: `tsx scripts/schema-sync-generator.ts development test`
  3. Apply generated SQL to target environment
  4. Restart server to refresh Drizzle ORM connection pool

**Testing Status**:
- Unit tests: Not applicable (UI/database integration feature)
- E2E tests: Blocked by database schema sync issue
- Manual testing: Requires database environment resolution
- Code review: ✅ Completed by architect

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