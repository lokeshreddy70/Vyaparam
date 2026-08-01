# PRODUCT 11
# SmartBiz Enterprise Design System

Version: Phase 1 Foundation
Status: Production Documentation Baseline

## 1. Purpose

This design system is the single source of truth for all SmartBiz product UIs. It defines brand, tokens, components, behaviors, accessibility requirements, and responsive rules. Future screens must compose these standards and avoid ad-hoc styles.

## 2. Brand Identity

Brand principles:

- Operational clarity
- Trust through consistency
- Dense information with low cognitive load
- Fast actions for business-critical workflows

Tone:

- Professional
- Direct
- High signal, low ornamentation

## 3. Logo Usage Guidelines

Rules:

- Maintain clear space equal to logo icon width on all sides.
- Never distort aspect ratio.
- Use dark-on-light primary logo by default.
- Use light-on-dark variant only on dark surfaces.
- Minimum digital height: 24px.
- Never place logo on low-contrast backgrounds.

## 4. Brand Colors

Core brand palette:

- Brand Primary: `#0B5FFF`
- Brand Secondary: `#00A3A3`
- Brand Accent: `#FF8A00`
- Brand Neutral 900: `#0F172A`
- Brand Neutral 100: `#F1F5F9`

## 5. Semantic Colors

Light theme semantic mapping:

- `--color-bg`: `#F8FAFC`
- `--color-surface`: `#FFFFFF`
- `--color-text`: `#0F172A`
- `--color-text-muted`: `#475569`
- `--color-border`: `#CBD5E1`
- `--color-success`: `#15803D`
- `--color-warning`: `#B45309`
- `--color-error`: `#B91C1C`
- `--color-info`: `#0369A1`

Dark theme semantic mapping:

- `--color-bg`: `#0B1220`
- `--color-surface`: `#121B2E`
- `--color-text`: `#E2E8F0`
- `--color-text-muted`: `#94A3B8`
- `--color-border`: `#334155`
- `--color-success`: `#22C55E`
- `--color-warning`: `#F59E0B`
- `--color-error`: `#F87171`
- `--color-info`: `#38BDF8`

## 6. Typography

Families:

- Primary UI font: `"IBM Plex Sans", "Segoe UI", sans-serif`
- Data/mono font: `"JetBrains Mono", "Cascadia Code", monospace`

Weights:

- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

Line-height defaults:

- Headings: 1.2
- Body: 1.5
- Dense table text: 1.35

## 7. Font Scale

Type scale tokens:

- `--font-xs`: 12px
- `--font-sm`: 14px
- `--font-md`: 16px
- `--font-lg`: 18px
- `--font-xl`: 20px
- `--font-2xl`: 24px
- `--font-3xl`: 30px
- `--font-4xl`: 36px

Usage:

- Page titles: 30px
- Section headings: 24px
- Card headings: 18px
- Body text: 14px to 16px
- Table body: 14px
- Table metadata: 12px

## 8. Icon System

Icon source:

- Lucide icon family for consistency and tree-shaking.

Sizes:

- Small: 16px
- Default: 20px
- Large: 24px

Rules:

- Icon-only controls require accessible labels.
- Keep icon stroke contrast at WCAG AA minimum.
- Never mix icon families in same screen.

## 9. Grid System

Desktop foundation:

- 12-column fluid grid
- Max content width: 1440px
- Gutter: 24px

Tablet foundation:

- 8-column grid
- Gutter: 16px

Mobile foundation:

- 4-column grid
- Gutter: 12px

## 10. Spacing System

Base unit: 4px

Scale:

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px

## 11. Border Radius Standards

- `--radius-sm`: 6px
- `--radius-md`: 10px
- `--radius-lg`: 14px
- `--radius-xl`: 18px
- `--radius-pill`: 9999px

## 12. Elevation and Shadows

Elevation tokens:

- `--elevation-0`: none
- `--elevation-1`: `0 1px 2px rgba(15, 23, 42, 0.08)`
- `--elevation-2`: `0 4px 10px rgba(15, 23, 42, 0.12)`
- `--elevation-3`: `0 10px 24px rgba(15, 23, 42, 0.16)`
- `--elevation-4`: `0 20px 40px rgba(15, 23, 42, 0.20)`

Rules:

- Use one elevation increase on hover for interactive cards.
- Use elevation 3+ only for modals and overlays.

## 13. Motion Guidelines

Principles:

- Communicate hierarchy and state change.
- Keep transitions fast and purposeful.
- Respect reduced-motion preferences.

Durations:

- Fast: 120ms
- Standard: 180ms
- Emphasis: 240ms

Easing:

- Standard: `cubic-bezier(0.2, 0, 0, 1)`
- Exit: `cubic-bezier(0.4, 0, 1, 1)`

## 14. Animation Standards

Approved patterns:

- Fade + translate for page transitions
- Scale + fade for dialogs
- Skeleton shimmer for loading placeholders
- Toast slide-in from edge

Do not use:

- Infinite decorative motion
- Bouncy transitions for enterprise data flows

## 15. Themes

### 15.1 Light Theme

Default production theme for business hours and high-density data entry.

### 15.2 Dark Theme

Operational alternative for low-light usage. Semantic tokens must remain consistent; only token values change.

## 16. Responsive Breakpoints

- `--bp-mobile`: 0px
- `--bp-tablet`: 768px
- `--bp-laptop`: 1024px
- `--bp-desktop`: 1280px
- `--bp-wide`: 1536px

Layout behavior:

- Desktop/Laptop: multi-panel dashboards, persistent sidebar.
- Tablet: collapsible sidebar, reduced table columns.
- Mobile: single-column stack, bottom-priority action grouping.

## 17. Component Standards

All components must support:

- Light and dark theme
- Keyboard navigation
- Focus-visible indicators
- Disabled state
- Loading state where relevant

### 17.1 Buttons

Variants:

- Primary, Secondary, Tertiary, Danger, Ghost

Sizes:

- Small, Medium, Large

### 17.2 Inputs

Support text, number, password, email, phone, and search patterns with label, helper text, and error text.

### 17.3 Dropdowns

Support single/multi-select, keyboard selection, and typeahead.

### 17.4 Search

Debounced input with clear action and optional filter chips.

### 17.5 Cards

Use for summary KPIs, grouped controls, and detail panes.

### 17.6 Tables

Must support sticky headers, column sorting, pagination, row states, and responsive column priority.

### 17.7 Badges

Semantic badges: neutral, success, warning, error, info.

### 17.8 Alerts

Inline and block alerts with icon + message + optional action.

### 17.9 Dialogs

Modal and non-modal variants; trap focus when modal.

### 17.10 Sidebars and Navigation

Desktop persistent rail + collapsible section groups. Mobile drawer with explicit close control.

### 17.11 Tabs

Underline style for content switching; segmented style for mode switching.

### 17.12 Forms

Consistent vertical rhythm, validation timing, summary error banner for long forms.

### 17.13 Charts

Use semantic color mapping and high-contrast labels; no color-only encoding.

### 17.14 Date Pickers

Keyboard operable calendar grid with locale-aware formatting.

### 17.15 Pagination

First/prev/next/last actions with page-size control where data volume is high.

### 17.16 Loaders and Skeletons

Use skeletons for content structures and spinner for short non-structural waits.

### 17.17 Empty States

Include clear reason + primary next action.

### 17.18 Error States

Expose failure reason, retry option, and support path for unrecoverable errors.

### 17.19 Success States

Show confirmation with minimal interruption; prefer toast over modal when possible.

### 17.20 Notification System

Standardize toast, inline, and inbox notifications with severity and dismissal behavior.

## 18. Accessibility Requirements

### 18.1 Keyboard Navigation

- Every interactive element must be reachable and operable by keyboard.
- Tab order must follow visual flow.

### 18.2 Screen Reader Support

- All controls require accessible names.
- Status and async updates must use ARIA live regions.

### 18.3 Focus Indicators

- Use explicit, high-contrast focus ring token.
- Never remove focus outlines without replacement.

### 18.4 Color Contrast

- Text and controls must meet WCAG AA minimum contrast.
- Critical data should exceed AA where practical.

### 18.5 ARIA Compliance

- Use semantic HTML first.
- Apply ARIA roles/states only when necessary and valid.

## 19. Implementation Governance

- No one-off component variants in feature modules.
- New visual patterns must be added to this system first.
- Changes to tokens/components require design + frontend review.

## 20. Known Limitations

- Current foundation is documentation-first; component-by-component code tokenization rollout follows in next implementation phase.
- Some legacy screens may still include pre-standard styles until migration is completed.

## 21. Future Roadmap

- Tokenization in shared UI package for strict compile-time reuse.
- Visual regression testing integrated with CI.
- Accessibility automation expansion (axe checks in CI).
- Full cross-platform adoption (web, admin, desktop, mobile clients).
