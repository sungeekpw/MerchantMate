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
- **Secure Authentication**: Session management, login attempt tracking, 2FA support, and password reset.
- **Merchant & Agent Management**: Comprehensive profiles, assignment, status tracking, and fee management. Agents store only role-specific fields (territory, commissionRate); merchants store only financial fields (processingFee, monthlyVolume). Personal data (firstName, lastName) stored in users table; business data stored in companies table. Agent creation wizard now requires user account creation with all fields matching the user add UI: username, password, communication preference (email/sms/both), and roles (multi-select). Edit mode hides user account section to prevent unwanted modifications.
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
- **Multi-Environment Support**: Complete session-based database environment switching with login screen environment selector, ensuring proper ACID compliance and environment isolation.
- **Generic Trigger/Action Catalog System**: Extensible event-driven action system supporting multi-channel notifications (email, SMS, webhook, Slack, in-app) with user communication preference enforcement, conditional execution, action chaining, and comprehensive audit logging.

## Known Issues & Workarounds

### Drizzle ORM Schema Caching Bug
**Problem**: Drizzle ORM has a critical schema caching issue where it persistently caches old column definitions even after schema migrations. During the company-centric refactor, `email` and `phone` columns were removed from the `agents` table and moved to the `companies` table. However, Drizzle continues attempting to insert these phantom columns, causing constraint violations.

**Root Cause**: The caching occurs at multiple levels:
- Migration snapshot files (`migrations/meta/*.json`)
- Drizzle's transaction wrapper intercepts even raw SQL queries
- Cache persists across application restarts, driver changes, and node_modules clearing

**Workaround Implemented**: The `/api/agents` POST endpoint uses a completely independent `pg.Pool` instance (bypassing Drizzle entirely) to perform all database operations within the transaction. The pool uses the environment-specific connection string from `getDatabaseUrl(req.dbEnv)` to maintain proper environment isolation (development/test/production). This ensures the agent creation workflow functions correctly despite Drizzle's caching bug while preserving the multi-environment support architecture.

**Affected Code**: `server/routes.ts` lines ~3886-4200 (agent creation endpoint)

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