# Core CRM - Merchant Payment Processing System

## Overview
Core CRM is a comprehensive merchant payment processing management system designed to streamline merchant onboarding, transaction management, location tracking, form processing, and analytics. It offers role-based access for various user types (merchants, agents, administrators, corporate users). The project aims to provide a robust, scalable, and secure platform for payment processing businesses, empowering them with efficient, transparent, and secure payment management to gain a competitive edge.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite.
- **UI Components**: Radix UI with shadcn/ui and Tailwind CSS, supporting theming via CSS variables.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter for client-side routing.
- **Forms**: React Hook Form with Zod validation.

### Backend Architecture
- **Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM, deployed on Neon serverless.
- **Authentication**: Session-based authentication with `express-session` and PostgreSQL session store.
- **Email Service**: SendGrid for transactional emails.
- **File Handling**: Multer for PDF form uploads.

### Data Storage Solutions
- **Primary Database**: PostgreSQL for user, merchant, agent, location, transaction, and form data.
- **Session Storage**: PostgreSQL-based session store.
- **File Storage**: Server filesystem for uploaded PDF forms.

### Key Features & Design Patterns
- **Company-Centric Data Architecture**: Companies are the root entity in the system. Agents and merchants must reference a company, eliminating data duplication and ensuring proper cascading operations. Business information (name, email, phone, businessType) is stored at the company level. This architecture enables:
  - Clean separation of business entities from individual users
  - Proper foreign key relationships with cascade delete support
  - Elimination of duplicate contact information across agents/merchants
  - Support for polymorphic locations (company-level or merchant-specific)
- **Role-Based Access Control**: Granular permissions for `merchant`, `agent`, `admin`, `corporate`, `super_admin` roles.
- **Secure Authentication**: Session management, login attempt tracking, 2FA support, and password reset. Strong password requirements enforced (minimum 12 characters with uppercase, lowercase, number, and special character). Password re-verification required for sensitive operations including role changes, status updates, commission rate modifications, processing fee changes, API key management, application approvals, and agent-merchant assignments. Dual verification flow: password verified once in confirmation dialog, then re-verified in backend endpoint with full audit logging (IP address, username, environment context). Cryptographically secure password generator available in user and agent creation forms, generating 16-character passwords using Web Crypto API with guaranteed character diversity and automatic clipboard copy.
- **Merchant & Agent Management**: Comprehensive profiles, assignment, status tracking, and fee management. Agents store only role-specific fields (territory, commissionRate); merchants store only financial fields (processingFee, monthlyVolume). Personal data (firstName, lastName) stored in users table; business data stored in companies table. Agent creation wizard requires user account creation with username, password, and communication preference (email/sms/both). Agents automatically receive the "agent" role - no manual role selection needed. Edit mode hides user account section to prevent unwanted modifications. All phone number fields feature real-time formatting to (XXX) XXX-XXXX with strict validation requiring exactly 10 digits using `unformatPhoneNumber` utility to strip formatting before validation. EIN/Tax ID fields format to XX-XXXXXXX with strict validation requiring exactly 9 digits using `unformatEIN` utility.
- **Location Management**: Polymorphic locations supporting both merchant-specific and company-level addresses, with geolocation and operating hours.
- **Transaction Processing**: Tracking, commission calculations, and revenue analytics.
- **Form Management System**: PDF upload/parsing, dynamic field generation, and public access.
- **Dashboard System**: Personalized, widget-based dashboards with real-time analytics.
- **Digital Signature**: Inline canvas-based and typed signature functionality with email request workflows.
- **Address Validation**: Google Maps Geocoding and Places Autocomplete integration.
- **Campaign Management**: Full CRUD for campaigns, pricing types, fee groups, and equipment associations.
- **SOC2 Compliance Features**: Comprehensive audit trail system with logging, security events, and login attempt tracking.
- **Testing Framework**: TDD-style with Jest and React Testing Library for component, page, API, and schema tests, including a visual testing dashboard.
- **Schema Management**: Comprehensive database schema comparison and synchronization utilities supporting production, development, and test environments, including a bulletproof version-controlled migration system.
- **Multi-Environment Support**: Complete session-based database environment switching with login screen environment selector, ensuring proper ACID compliance and environment isolation. Automatic database connection fallback dialog for non-production environments: when the application cannot connect to the requested database environment (e.g., TEST_DATABASE_URL not configured), a dialog appears allowing users to switch to an available environment without manual configuration changes.
- **Generic Trigger/Action Catalog System**: Extensible event-driven action system supporting multi-channel notifications (email, SMS, webhook, Slack, in-app) with user communication preference enforcement, conditional execution, action chaining, and comprehensive audit logging.

## Known Issues & Workarounds

### Drizzle ORM Schema Caching Bug
**Problem**: Drizzle ORM has a critical schema caching issue where it persistently caches old column definitions even after schema migrations. During the company-centric refactor, `email` and `phone` columns were removed from the `agents` table and moved to the `companies` table. However, Drizzle continues attempting to insert/reference these phantom columns, causing constraint violations and failed operations.

**Root Cause**: The caching occurs at multiple levels:
- Migration snapshot files (`migrations/meta/*.json`)
- Drizzle's transaction wrapper intercepts even raw SQL queries
- Cache persists across application restarts, driver changes, and node_modules clearing
- Affects both data modification (INSERT/UPDATE/DELETE) and queries

**Workaround Implemented**: Both agent creation and deletion endpoints use completely independent `pg.Pool` instances (bypassing Drizzle entirely) to perform all database operations within transactions. The pool uses the environment-specific connection string from `getDatabaseUrl(req.dbEnv)` to maintain proper environment isolation (development/test/production). This ensures the agent workflows function correctly despite Drizzle's caching bug while preserving the multi-environment support architecture.

**Affected Code**: 
- Agent creation: `server/routes.ts` lines ~3943-4200 (POST /api/agents)
- Agent deletion: `server/routes.ts` lines ~4444-4610 (DELETE /api/agents/:id)

### Agent Deletion Business Rules
**Critical Rule**: Agents cannot be deleted if their company has any merchants. This protects the company structure that merchants depend on.

**Deletion Flow**:
1. Check if agent has direct merchant associations → Block if yes
2. Check if agent's company has ANY merchants → Block if yes
3. Check if company has other agents:
   - If YES: Delete only agent + user account (preserve company)
   - If NO: Cascade delete agent + user + company + locations + addresses
4. All deletions occur in a single PostgreSQL transaction for ACID compliance

## External Dependencies
- **pg**: Native PostgreSQL driver (used for agent creation workaround).
- **drizzle-orm**: Type-safe ORM for PostgreSQL.
- **@sendgrid/mail**: SendGrid email API client.
- **@anthropic-ai/sdk**: AI integration (potential future use).
- **@tanstack/react-query**: React server state management.
- **@radix-ui/**\*: UI component primitives.
- **bcrypt**: Password hashing.
- **speakeasy**: Two-factor authentication.
- **express-session**: Session management middleware.
- **connect-pg-simple**: PostgreSQL session store.
- **multer**: Middleware for handling `multipart/form-data`.
- **google-maps-services-js**: Google Maps Geocoding and Places APIs.