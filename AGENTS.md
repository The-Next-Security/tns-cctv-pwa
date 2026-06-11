# TNS CCTV PWA — Agent Instructions

<!-- bm-design-system:start -->

## Design System

The design system reference lives at `/admin/design-system`. **Always check there first** before building new UI.

### Token-first styling

Use design system token utilities everywhere. Never use raw Tailwind color utilities for app UI.

| Concept | Token | Example |
|---|---|---|
| Page background | `bg-ds-page` | Page shells, modal backdrops |
| Card / panel | `bg-ds-surface` | Cards, sidebars, drawers |
| Muted background | `bg-ds-muted` | Skeletons, inset panels, tab tracks |
| Border / divider | `border-ds-hairline` | All borders between elements |
| Primary text | `text-ds-ink-display` | Headings, important labels |
| Body text | `text-ds-ink-body` | Paragraphs, descriptions |
| Muted text | `text-ds-ink-muted` | Captions, timestamps, helper text |
| Interactive / accent | `bg-ds-accent` / `text-ds-accent` | Links, focused elements, badges |
| Accent background | `bg-ds-accent-faded` | Accent-tinted panels |
| Critical / error | `text-ds-signal` / `bg-ds-signal` | Alerts, error states |
| Signal background | `bg-ds-signal-faded` | Error / alert panel tints |

**Do not use:** `bg-white`, `bg-gray-*`, `bg-zinc-*`, `text-gray-*`, raw hex in `style={{}}`, or legacy shadcn tokens (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`) — use `ds-*` equivalents above.

### Typography

- Headings: `font-ds-display` (Inter)
- Body / UI: `font-ds-body` (DM Sans)

### Components

Use primitives from `components/ui/` — never build raw buttons, inputs, or dialogs from scratch.

```
Button       → @/components/ui/button
Input        → @/components/ui/input
Label        → @/components/ui/label
Checkbox     → @/components/ui/checkbox
Textarea     → @/components/ui/textarea
Badge        → @/components/ui/badge
Dialog       → @/components/ui/dialog
DropdownMenu → @/components/ui/dropdown-menu
ToggleGroup  → @/components/ui/toggle-group
```

### Icons

All icons come from `lucide-react`. Do not mix in other icon libraries.

- Inline: `size={16}`
- Nav items: `size={18}`
- Standalone icon buttons: `size={20}`
- Always include `aria-label` on icon-only buttons

### Callouts

Use semantic background tints, never solid fills:

```tsx
// Info
style={{ backgroundColor: 'rgb(91 122 157 / 0.12)', borderColor: 'rgb(91 122 157 / 0.35)' }}

// Warning
style={{ backgroundColor: 'rgb(250 173 20 / 0.12)', borderColor: 'rgb(250 173 20 / 0.35)' }}

// Critical
style={{ backgroundColor: 'rgb(255 77 79 / 0.12)', borderColor: 'rgb(255 77 79 / 0.35)' }}

// Success
style={{ backgroundColor: 'rgb(82 196 26 / 0.12)', borderColor: 'rgb(82 196 26 / 0.35)' }}
```

### Long-form prose

Wrap rich-text / CMS content in `.body-content` — it auto-applies Inter headings, DM Sans body, link colors, list styles, blockquote borders, and HR dividers.

### Design system files

| File | Purpose |
|---|---|
| `styles/design-system.css` | `@theme` token definitions + `.body-content` prose styles |
| `components/design-system/palette.ts` | Color + font constants for use in JS/TS |
| `lib/theme.ts` | `useTheme()` hook (dark/light, persisted to localStorage) |
| `components/design-system/` | Reference page components — do not import these into app UI |

<!-- bm-design-system:end -->
