# Project Management System - Design Guidelines

## Design Approach
**Selected Approach**: Design System + Reference-Based Hybrid
- **Primary References**: Linear (for clean project management aesthetics), Notion (for organized information display), Asana (for workflow clarity)
- **Justification**: Utility-focused productivity tool requiring efficiency, clear information hierarchy, and professional polish for academic/institutional use

## Core Design Principles
1. **Clarity Over Decoration**: Every element serves a functional purpose
2. **Hierarchical Information**: Clear visual distinction between primary actions, secondary data, and metadata
3. **Status-Driven Design**: Project states (pending, under review, graded) immediately visible through color and iconography
4. **Role-Aware Interfaces**: Different user types see contextually relevant information first

## Color Palette

**Inspired by AASU Journal Management System**

### Light Mode
- **Primary Brand**: 215 28% 32% (navy blue for headings, CTAs, primary actions)
- **Accent Orange**: 38 92% 50% (vibrant orange for highlights, accents, badges)
- **Success/Teal**: 174 64% 47% (teal for completed projects, success states)
- **Danger/Rejected**: 0 84% 60% (red for issues/rejections)
- **Neutral Background**: 0 0% 98% (light gray main background)
- **Surface**: 0 0% 100% (white cards, modals)
- **Border**: 215 15% 88% (subtle navy-tinted divisions)
- **Text Primary**: 215 30% 20% (dark navy for headings and body)
- **Text Secondary**: 215 10% 45% (muted navy for metadata)

### Dark Mode
- **Primary Brand**: 215 25% 42% (lighter navy for dark mode)
- **Accent Orange**: 38 92% 55% (vibrant orange)
- **Success/Teal**: 174 60% 55% (brighter teal for dark backgrounds)
- **Danger/Rejected**: 0 75% 65% (softer red)
- **Neutral Background**: 215 25% 10% (dark navy background)
- **Surface**: 215 20% 14% (slightly lighter cards)
- **Border**: 215 15% 22% (subtle borders)
- **Text Primary**: 0 0% 95% (light text)
- **Text Secondary**: 215 8% 65% (muted light text)

## Typography
- **Primary Font**: Inter (via Google Fonts CDN)
- **Monospace**: JetBrains Mono (for project IDs, budget values)

**Scale**:
- **Page Titles**: text-3xl font-bold (faculty dashboard, project details)
- **Section Headers**: text-xl font-semibold (pending reviews, submitted projects)
- **Card Titles**: text-lg font-medium (project cards)
- **Body Text**: text-base (descriptions, comments)
- **Metadata**: text-sm text-secondary (timestamps, editor names)
- **Labels**: text-xs uppercase tracking-wide font-medium (status badges)

## Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- **Component Padding**: p-4 to p-6 for cards
- **Section Margins**: mb-8 to mb-12 between major sections
- **Grid Gaps**: gap-4 to gap-6 for card layouts
- **Form Spacing**: space-y-4 for form fields

**Container Strategy**:
- **Main Content**: max-w-7xl mx-auto px-4
- **Forms/Modals**: max-w-2xl
- **Wide Dashboards**: max-w-screen-2xl

## Component Library

### Navigation
**Sidebar Navigation** (Desktop):
- Fixed left sidebar (w-64) with logo at top
- Role-based menu items with icons (Heroicons)
- Active state: bg-primary/10 with left border accent
- User profile dropdown at bottom
- Collapsible on tablet (hamburger menu)

**Top Bar**:
- Project title/breadcrumbs on left
- Notifications bell + user avatar on right
- Search bar (center) for admins/process leads

### Dashboard Components

**Project Cards**:
- White surface (dark: dark surface) with subtle border
- Header: Title (bold) + status badge (right aligned)
- Body: Department, budget (KD), submission date
- Footer: Assigned editors (avatar stack) + view button
- Hover: subtle shadow lift (shadow-md to shadow-lg)

**Status Badges**:
- Pill-shaped, small uppercase text
- "Pending AI": amber background
- "Under Review": blue background
- "Graded": green background
- "Needs Attention": red background

**Data Tables** (Admin/Process Lead):
- Zebra striping (every other row slightly darker)
- Sortable columns with arrow indicators
- Inline actions (grade, reassign) on hover
- Sticky header on scroll
- Responsive: collapse to cards on mobile

### Forms

**Project Submission Form**:
- Single column layout with clear section breaks
- Field groups: Project Details, Budget, Attachments
- File upload: Drag-and-drop zone with progress bar
- Inline validation messages
- Large submit button at bottom (w-full on mobile)

**Grading Interface**:
- Project details summary at top (read-only)
- Score input: Large number input (0-60 for editors)
- Comments: Rich text area (h-32 minimum)
- AI score display (read-only, 40% badge)
- Submit grade button (prominent, primary color)

### Data Displays

**Grading Breakdown Card**:
- Visual score meter (progress bar)
- AI Score: 40% weight (with icon)
- Editor Scores: Individual bars per editor
- Final Score: Large, prominent display
- Color-coded: green (>70), amber (50-70), red (<50)

**Assignment Widget**:
- Editor avatars with names
- Assignment date (small text below)
- Reassign button for admins (ghost button)

### Modals & Overlays
- Backdrop: bg-black/50 blur
- Modal: Centered, max-w-lg, rounded-lg, shadow-2xl
- Close button: top-right, subtle hover state
- Actions: Right-aligned footer buttons

## Icons
**Library**: Heroicons (CDN)
- Navigation: outline style
- Status indicators: solid style
- Actions: mini outline
- Decorative: Use sparingly

## Animations
**Minimal & Purposeful**:
- Card hover: transform scale-[1.02] transition-transform duration-200
- Modal entry: fade + slide from top (duration-300)
- Status badge changes: transition-colors duration-200
- **No** scroll-triggered animations
- **No** decorative parallax effects

## Images
**Limited Strategic Use**:
- User avatars: 32px circular (dashboard), 48px (profile)
- Empty states: Simple illustration (max-w-sm, centered)
- **No hero images** - this is a utility application
- File previews: Thumbnail grid for attachments

## Accessibility
- All interactive elements: min h-10 (touch targets)
- Form inputs: Dark mode compatible backgrounds
- Focus states: ring-2 ring-primary ring-offset-2
- Color contrast: WCAG AA minimum
- Skip links for keyboard navigation

## Role-Specific Layouts

**Faculty Dashboard**:
- Quick submit button (top-right, always visible)
- My Projects grid (3 columns desktop, 1 mobile)
- Recent activity timeline

**Editor Dashboard**:
- Pending reviews (priority section at top)
- 2-column layout: pending left, completed right
- Quick grade actions inline

**Process Lead Dashboard**:
- Stats overview (4-column grid): total projects, pending, graded, avg score
- Full project table below
- Export/filter controls in sticky header
- Assignment management panel

This design creates a professional, efficient, and role-aware project management system optimized for academic institutional use with clear visual hierarchy and minimal cognitive load.