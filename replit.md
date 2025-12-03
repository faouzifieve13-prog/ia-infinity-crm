# IA Infinity - Multi-Tenant SaaS Platform

## Overview

IA Infinity is a comprehensive multi-tenant B2B SaaS platform designed to manage the complete business lifecycle from prospection to client delivery. The platform features three distinct workspace environments (Internal, Client, and Vendor) with role-based access controls, supporting sales pipeline management, project delivery, client portals, vendor management, and workflow automation.

The application serves as a unified business management system that handles:
- Sales pipeline tracking (Prospect → Meeting → Proposal → Audit → Closing)
- Project and task management with client visibility
- Multi-space architecture for different user types
- Financial management (invoicing, vendor payments, margin tracking)
- Document management and workflow automation
- Vendor/contractor coordination

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight React Router alternative)
- **TanStack Query v5** for server state management and data fetching
- Custom path aliases (@/, @shared/, @assets/) for cleaner imports

**UI Component System**
- **shadcn/ui** components built on Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens
- **New York** style variant with custom color system (neutral base)
- Design system inspired by Linear, Notion, and Material Design principles
- Component library includes: tables, cards, forms, dialogs, dropdown menus, badges, avatars, progress bars, and more

**State Management**
- React Context for global state (theme, space/workspace, user)
- TanStack Query for server data caching and synchronization
- Local state with React hooks for component-level UI state

**Key Features**
- Multi-space architecture with workspace switcher (Internal/Client/Vendor)
- Role-based UI rendering based on user permissions
- Drag-and-drop pipeline board using @dnd-kit
- Responsive design with mobile breakpoint detection
- Dark/light theme support with system preference detection
- Real-time search across deals, projects, and accounts

### Backend Architecture

**Runtime & Server**
- **Node.js** with **Express.js** HTTP server
- **TypeScript** with ESM module system
- Custom build process using esbuild for production bundling
- Development mode uses tsx for fast TypeScript execution
- Hot module replacement in development via Vite middleware

**API Design**
- RESTful HTTP endpoints under /api prefix
- Request/response logging middleware
- JSON payload parsing with raw body access for webhooks
- Single-tenant mode with default organization (DEFAULT_ORG_ID)
- CRUD operations for all major entities (accounts, contacts, deals, projects, tasks, invoices, vendors, missions, documents, workflows)

**Business Logic Layer**
- Storage abstraction layer (IStorage interface) separating database operations from routes
- Domain models defined in shared/schema.ts using Drizzle ORM
- Type-safe data validation with Zod schemas
- Centralized organization/tenant context management

**Data Flow**
1. HTTP request → Express route handler
2. Organization ID extraction from request context
3. Storage layer query with organization scoping
4. Type-safe data transformation
5. JSON response with appropriate status codes

### Data Storage

**Database**
- **PostgreSQL** via Neon serverless driver (@neondatabase/serverless)
- WebSocket-based connection pooling
- **Drizzle ORM** for type-safe database queries and migrations
- Schema-first approach with TypeScript types generated from schema

**Schema Organization**
- Multi-tenant architecture with organization-scoped data
- Core entities: organizations, users, memberships, accounts, contacts, deals, activities, projects, tasks, invoices, vendors, missions, documents, workflow_runs, import_jobs
- Enum types for status fields (user_role, space, deal_stage, project_status, task_status, invoice_status, etc.)
- Foreign key relationships with cascade behavior
- Timestamp tracking (createdAt) on all entities
- UUID primary keys with database-generated defaults

**Key Tables**
- **organizations**: Multi-tenant isolation boundary
- **users**: Authentication and identity
- **memberships**: Links users to organizations with roles and space access
- **accounts**: Client organizations/companies (with Notion sync fields: notionPageId, notionLastEditedAt)
- **deals**: Sales pipeline opportunities with stages and amounts
- **projects**: Client engagements with status tracking
- **tasks**: Granular work items with assignments and priorities
- **invoices** + **invoice_line_items**: Billing with line-item detail
- **vendors**: Contractor directory with skills and availability
- **missions**: Vendor assignments linked to projects
- **documents**: File metadata with account/project associations
- **expenses**: Business expenses with categories (tools, software, services, travel, etc.) and Notion sync support
- **contracts**: Client contracts with different types (audit, prestation, formation, suivi)
- **invitations**: Magic link invitations with tokenHash, role, space, status, and expiration
- **workflow_runs**: Automation execution logs
- **import_jobs**: Tracks Notion sync history and status

### Authentication & Authorization

**Current Implementation**
- Mock user authentication (temporary development setup)
- User context stored in SpaceProvider React Context
- Default admin user ("Alice Martin") for development

**Magic Link Invitations**
- Passwordless invitation system for onboarding users
- Secure token generation using crypto.randomBytes (32 bytes hex)
- SHA-256 hashed tokens stored in database (never exposed in API responses)
- Configurable expiration: 15 min, 30 min, 1 hour, 24 hours, 7 days, 1 month, 3 months, 6 months, 1 year
- Single-use tokens invalidated upon acceptance
- Role and space assignment at invitation time
- Optional linking to accounts (for clients) or vendors
- Accept page at `/auth/accept-invite` (outside main layout)

**Invitation Status Flow**
- pending → accepted (user clicked link and joined)
- pending → expired (time limit reached)
- pending → revoked (admin cancelled)

**API Endpoints**
- `GET /api/invitations` - List all invitations
- `POST /api/invitations` - Create new invitation (returns link with token)
- `POST /api/invitations/validate` - Validate token before showing accept form
- `POST /api/invitations/accept` - Accept invitation and create user/membership
- `POST /api/invitations/:id/revoke` - Revoke pending invitation
- `DELETE /api/invitations/:id` - Delete invitation record

**Frontend Page**
- `/invitations` - Admin UI for creating and managing invitations
- Statistics cards showing pending, accepted, expired counts
- Create dialog with space/role selection
- Copy-to-clipboard for generated links
- Revoke and delete actions with confirmation dialogs

**Role-Based Access Control**
- 7 user roles: admin, sales, delivery, finance, client_admin, client_member, vendor
- Space-based permissions mapped to roles:
  - admin: access to all spaces
  - sales/delivery/finance: internal space only
  - client_admin/client_member: client portal only
  - vendor: vendor space only
- UI components conditionally render based on role and current space

**Three Distinct Portals**
1. **Portail Admin** (internal space):
   - Full access: Pipeline, Comptes, Contacts, Projets, Tâches, Contrats, Workflows, Documents, Factures, Dépenses, Prestataires
   - Admin features: Sync Notion, Invitations, Paramètres
   - Visual: Shield icon, primary color badge
   
2. **Portail Client** (client space):
   - Limited access: Tableau de bord, Projets, Tâches, Contrats, Documents, Factures
   - Settings and Help available
   - Visual: Building icon, blue color badge
   
3. **Portail Prestataire** (vendor space):
   - Focused access: Tableau de bord, Projets, Tâches, Documents, Mes Missions
   - Settings and Help available
   - Visual: Wrench icon, emerald color badge

**Planned Enhancement**
- Full session-based authentication after accepting invitation
- Email delivery integration for sending invitation links
- Password setup option for users who prefer password auth

### Notion Synchronization

**Overview**
- Import clients and expenses from Notion databases
- Automatic field mapping for French and English property names
- Upsert logic by notionPageId to prevent duplicate imports
- Import job tracking for sync history and error logging

**Supported Mappings**
- **Accounts**: Name, Contact, Email, Website, Status, Plan
- **Expenses**: Title, Amount, Category, Date, Status, Description

**API Endpoints**
- `GET /api/notion/databases` - List accessible Notion databases
- `POST /api/notion/sync/accounts` - Import clients from Notion
- `POST /api/notion/sync/expenses` - Import expenses from Notion
- `GET /api/notion/sync/jobs` - View sync history

**Frontend Pages**
- `/notion-sync` - Configuration UI for triggering syncs
- `/expenses` - Expense management page with CRUD operations, filtering, and statistics

### External Dependencies

**Third-Party Services**
- **Neon Database**: Serverless PostgreSQL hosting
- **Notion API**: Data synchronization (@notionhq/client) with Replit connection for secure token management
- **n8n**: Workflow automation platform (referenced in schema, webhook integration)

**Development Tools**
- **Replit**: Development environment with cartographer plugin for code navigation
- **Drizzle Kit**: Database migrations and schema management

**Frontend Libraries**
- **Radix UI**: 20+ unstyled accessible component primitives
- **@dnd-kit**: Drag-and-drop functionality for pipeline Kanban board
- **TanStack Query**: Server state management
- **Wouter**: Lightweight routing
- **class-variance-authority**: Component variant management
- **clsx + tailwind-merge**: Utility class handling

**Backend Libraries**
- **Express.js**: HTTP server framework
- **Drizzle ORM**: Database query builder
- **Zod**: Runtime type validation
- **ws**: WebSocket support for Neon connection

**Build & Development**
- **Vite**: Frontend build tool and dev server
- **esbuild**: Backend bundler for production
- **tsx**: TypeScript execution for development
- **TypeScript**: Type safety across the stack
- **Tailwind CSS + PostCSS**: Styling pipeline