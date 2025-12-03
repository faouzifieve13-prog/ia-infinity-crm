# Design Guidelines: Multi-Tenant SaaS Platform

## Design Approach
**System-Based Approach** drawing from Linear's modern aesthetics, Notion's flexible layouts, and Material Design's data-density patterns. This B2B productivity tool prioritizes clarity, efficiency, and professional polish over visual experimentation.

## Core Design Principles
1. **Information Hierarchy**: Clear visual distinction between primary actions, secondary data, and contextual information
2. **Density Control**: Balanced information density—not too sparse, not overwhelming
3. **Multi-Space Consistency**: Maintain visual language across Internal, Client, and Vendor spaces while allowing subtle contextual differences
4. **Progressive Disclosure**: Show essential information upfront, reveal details on demand

## Typography System

**Font Stack**: Inter (primary), SF Pro Display (fallback), system fonts
- Display/Hero: text-4xl to text-5xl, font-semibold (page titles, dashboard headers)
- H1: text-3xl, font-semibold (section headers)
- H2: text-2xl, font-semibold (subsection headers)
- H3: text-xl, font-medium (card headers, modal titles)
- Body Large: text-base, font-normal (primary content)
- Body: text-sm, font-normal (secondary content, table cells)
- Caption: text-xs, font-medium (labels, metadata, timestamps)

## Layout System

**Spacing Primitives**: Use Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Page margins: px-8, py-6
- Card spacing: p-6
- Form fields: space-y-4

**Grid System**:
- Dashboard layouts: 12-column grid with gap-6
- Pipeline Kanban: Horizontal scroll with fixed-width columns (320px)
- Data tables: Full-width with responsive column priorities
- Detail panels: 2/3 main content, 1/3 sidebar pattern

## Component Library

### Navigation
**Top Navigation Bar**: Fixed header with logo, global search, notifications, user menu. Height h-16, border-b with subtle elevation.

**Side Navigation**: Collapsible sidebar (w-64 expanded, w-16 collapsed) with icon-only or icon+label states. Nested navigation for complex structures. Active state with indicator bar.

**Space Switcher**: Prominent dropdown (Internal/Client/Vendor) in top nav with role badge.

### Data Display

**Tables**: 
- Sticky headers with sortable columns
- Row hover states with subtle elevation
- Inline actions (edit, delete) revealed on hover
- Pagination with rows-per-page selector
- Bulk selection with checkbox column
- Status badges and priority indicators as inline pills

**Kanban Pipeline**:
- Vertical cards with drag handles
- Card header: deal name + amount (bold)
- Card body: company, contact, next action (compact)
- Card footer: probability indicator, owner avatar, days in stage
- Column headers with count badges
- Add card button at column bottom

**Dashboard Cards**:
- Elevated cards with p-6 padding
- Card header with title + action menu
- Metric displays: Large number (text-3xl font-bold) + label + trend indicator
- Mini charts for sparklines
- Quick action buttons in card footer

### Forms & Inputs

**Form Layout**: Single column max-w-2xl for focused entry, two-column for compact data collection

**Input Fields**:
- Label above field (text-sm font-medium)
- Input with border, rounded corners, focus ring
- Helper text below (text-xs)
- Error states with validation messages
- Required field indicators

**Rich Text Editors**: For proposals, audit reports—toolbar above, content area with preview toggle

**File Upload**: Drag-drop zone with file type icons, progress bars, thumbnail previews

### Modals & Overlays

**Modal Dialogs**: 
- Centered overlay with max-w-2xl to max-w-4xl depending on content
- Header with title + close button
- Content section with scrollable body
- Footer with action buttons (primary right, secondary left)

**Slide-Over Panels**: Right-side slide-in for detail views, task editing, quick actions. Width w-96 to w-1/2.

**Dropdowns**: Attached to trigger, max-height with scroll, keyboard navigation, search for long lists.

### Action Components

**Buttons**:
- Primary: Solid fill, prominent
- Secondary: Outline style
- Tertiary: Ghost/text-only
- Sizes: Small (h-8 px-3), Medium (h-10 px-4), Large (h-12 px-6)

**Status Badges**: Pill-shaped, uppercase text-xs font-semibold, semantic meanings (success, warning, error, info, neutral)

**Progress Indicators**: Linear progress bars for uploads, circular loaders for async actions

### Specialized Components

**Timeline/Activity Feed**: Vertical timeline with icons, timestamps, actor avatars, expandable details

**Document Preview**: Split view with PDF/template on left, metadata/actions on right

**Workflow Execution Logs**: Monospace font for technical details, collapsible steps, status indicators, timestamps

**Invoice Display**: Structured layout mimicking paper invoice, line items table, payment status banner

**Client Portal Dashboard**: Hero metric cards (3-column grid), recent activity list, quick actions panel

**Vendor Timesheet**: Weekly grid view, inline editing, approval workflow indicators

## Responsive Strategy

**Breakpoints**: Mobile (base), Tablet (md: 768px), Desktop (lg: 1024px), Wide (xl: 1280px)

**Mobile Adaptations**:
- Collapse side nav to bottom tab bar
- Stack dashboard cards vertically
- Tables become vertical cards with key data
- Modals become full-screen
- Kanban becomes single column with swipe navigation

## Images & Visual Assets

**Icons**: Heroicons outline for navigation/actions, solid for status indicators. Size: w-5 h-5 standard, w-4 h-4 for compact contexts.

**Avatars**: Circular, sizes: w-8 h-8 (small), w-10 h-10 (medium), w-12 h-12 (large). Fallback to initials.

**Illustrations**: Minimal, geometric empty states for data tables, onboarding flows. No hero images—this is a productivity tool focused on data and workflows.

**Charts**: Line charts for trends, bar charts for comparisons, donut charts for proportions. Use charting library (Chart.js/Recharts) with consistent styling.

## Interaction Patterns

**Loading States**: Skeleton screens for tables/lists, spinner overlays for actions, progressive loading for dashboards

**Empty States**: Centered illustration + descriptive text + primary action button to populate

**Contextual Actions**: Hover reveals, right-click menus, inline edit modes

**Confirmation Patterns**: Destructive actions require modal confirmation with explicit "Delete [Item Name]" buttons

**Real-time Updates**: Toast notifications for background events, badge counts for new items, subtle pulse animation for live data

## Space-Specific Adaptations

**Internal Space**: Data-dense, multi-column layouts, advanced filters, bulk operations prominent

**Client Portal**: Simplified navigation, focus on active projects, large action buttons, less technical language

**Vendor Space**: Task-focused, timesheet prominently placed, deliverable upload prioritized, minimal navigation complexity