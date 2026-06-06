'use client'

import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'

const NAV = [
  {
    group: 'Branding',
    items: [
      { id: 'colors', label: 'Colors' },
      { id: 'typography', label: 'Typography' },
    ],
  },
  {
    group: 'Structure',
    items: [
      { id: 'shells', label: 'Shells' },
      { id: 'main-navigation', label: 'Main Navigation' },
      { id: 'sub-navigation', label: 'Sub Navigation' },
      { id: 'page-headers', label: 'Page Headers' },
      { id: 'body-content', label: 'Body Content' },
      { id: 'footers', label: 'Footers' },
    ],
  },
  {
    group: 'Elements',
    items: [
      { id: 'iconography', label: 'Iconography' },
      { id: 'buttons', label: 'Buttons' },
      { id: 'button-dropdown', label: 'Button Dropdown' },
      { id: 'forms', label: 'Forms' },
      { id: 'badges', label: 'Badges' },
      { id: 'toggle-buttons', label: 'Toggle Buttons' },
      { id: 'listings', label: 'Listings' },
      { id: 'modal', label: 'Modal' },
      { id: 'dropdown-menu', label: 'Dropdown Menu' },
      { id: 'callout', label: 'Callout' },
    ],
  },
  {
    group: 'Base Styles',
    items: [
      { id: 'heading-scale', label: 'Heading Scale' },
      { id: 'h1', label: 'H1' },
      { id: 'h2', label: 'H2' },
      { id: 'h3', label: 'H3' },
      { id: 'paragraph', label: 'Paragraph' },
      { id: 'anchor', label: 'Anchor' },
      { id: 'strong', label: 'Strong' },
      { id: 'lists', label: 'Lists' },
      { id: 'blockquote', label: 'Blockquote' },
      { id: 'hr', label: 'Horizontal Rule' },
      { id: 'label', label: 'Label' },
    ],
  },
]

function NavContent({ onClose }: { onClose?: () => void }) {
  return (
    <nav className="space-y-6">
      {NAV.map(section => (
        <div key={section.group}>
          <p className="text-xs font-semibold text-ds-ink-muted uppercase tracking-widest mb-2 px-2">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.items.map(item => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={onClose}
                  className="block px-2 py-1.5 text-sm text-ds-ink-body rounded-md hover:bg-ds-surface hover:text-ds-ink-display transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function SidebarNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2 py-6">
          <NavContent />
        </div>
      </aside>

      {/* Mobile floating button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg"
          style={{ backgroundColor: '#5b7a9d', color: '#fafafa' }}
        >
          <Menu size={16} />
          Sections
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 flex items-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl p-6 max-h-[78vh] overflow-y-auto"
            style={{ backgroundColor: '#242428' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-semibold text-ds-ink-display">Sections</p>
              <button onClick={() => setOpen(false)} className="text-ds-ink-muted hover:text-ds-ink-body">
                <X size={18} />
              </button>
            </div>
            <NavContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
