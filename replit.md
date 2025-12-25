# IA Infinity - Multi-Tenant SaaS Platform

## Overview

IA Infinity is a multi-tenant B2B SaaS platform for managing the entire business lifecycle, from sales prospecting to client delivery. It features three distinct workspace environments (Internal, Client, Vendor) with role-based access, supporting sales pipeline management, project delivery, client portals, vendor management, and workflow automation. The platform aims to be a unified business management system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Build**: Vite
- **Routing**: Wouter
- **Data Fetching**: TanStack Query v5
- **UI**: shadcn/ui (Radix UI + Tailwind CSS) with a custom New York style variant, inspired by Linear and Notion.
- **State Management**: React Context for global state, TanStack Query for server state.
- **Key Features**: Multi-space architecture with role-based UI, drag-and-drop Kanban board (@dnd-kit), responsive design, dark/light theme, real-time search.

### Backend

- **Runtime**: Node.js with Express.js (TypeScript, ESM)
- **API**: RESTful HTTP endpoints
- **Business Logic**: Storage abstraction layer, Drizzle ORM for models, Zod for validation, centralized organization context.

### Data Storage

- **Database**: PostgreSQL (Neon serverless driver)
- **ORM**: Drizzle ORM for type-safe queries and migrations.
- **Schema**: Multi-tenant, organization-scoped data with UUID primary keys. Core entities include organizations, users, accounts, deals, projects, tasks, invoices, vendors, documents, and workflow runs.

### Authentication & Authorization

- **Authentication**: Magic link invitations (passwordless) with configurable expiration and single-use tokens. Planned enhancement for full session-based auth.
- **Authorization**: Role-Based Access Control (RBAC) with 7 roles (admin, sales, delivery, finance, client_admin, client_member, vendor) and space-based permissions across Admin, Client, and Vendor portals.

### Notion Synchronization

- **Functionality**: Imports clients and expenses from Notion databases with automatic field mapping and upsert logic.
- **Tracking**: Import job tracking for history and error logging.

### Google Drive Integration

- **Functionality**: Stores quotes/devis as PDFs in Google Drive, with features for viewing, downloading, and deleting directly from the CRM. Includes automatic file sharing.

### Qonto Integration

- **Functionality**: Generates quotes (devis) directly in the Qonto banking platform, supporting "Audit IA" and "Automatisation IA" types. Includes automatic client creation in Qonto if not existing and direct links to generated quotes.

### Electronic Signature System

- **Functionality**: Dual signature system for Qonto quotes enabling admin + client signatures.
- **Flow**: Admin signs first → generates token-based secure link (SHA-256, 30-day expiration) → client signs via public page → both signatures trigger PDF generation.
- **PDF Storage**: Signed quote PDFs with embedded signatures uploaded to Google Drive folder "IA Infinity - Devis Signés".
- **Client Portal**: Clients can view and sign pending quotes from their portal (/client/quotes).

### Visual Design System

- **Styling**: Portal-specific styling with distinct color gradients and icons for Admin, Client, and Vendor portals.
- **Animations**: Framer Motion for component entrance, staggered lists, animated progress bars, and interactive elements.
- **Component Enhancements**: Custom styling and animations for MetricCard, ProjectCard, DealCard, GlobalSearch, AppHeader, and AppSidebar.

## External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **Notion API**: Data synchronization (`@notionhq/client`)
- **Gmail API**: Email sending (via Replit Gmail connector)
- **Google Drive API**: Quote storage and management (via Replit Drive connector)
- **Google Calendar API**: Calendar synchronization (via Replit Calendar connector)
- **Qonto API**: Quote generation and client management.
- **n8n**: Workflow automation platform (webhook integration).