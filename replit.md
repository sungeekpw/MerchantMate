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
- **Form Management System**: PDF upload/parsing, dynamic field generation, public access, and conditional field visibility.
- **Dashboard System**: Personalized, widget-based dashboards with real-time analytics.
- **Digital Signature**: Inline canvas-based and typed signature functionality with email request workflows, including an agent signature workflow.
- **Address Validation**: Google Maps Geocoding and Places Autocomplete integration.
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