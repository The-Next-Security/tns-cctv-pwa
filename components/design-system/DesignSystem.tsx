'use client'

// bm-design-system — main reference page layout
// Route: /admin/design-system

import React from 'react'
import { SidebarNav } from './SidebarNav'
import { ColorsSection } from './sections/ColorsSection'
import { TypographySection } from './sections/TypographySection'
import {
  ShellsSection,
  MainNavigationSection,
  SubNavigationSection,
  PageHeadersSection,
  BodyContentSection,
  FootersSection,
} from './sections/StructureSection'
import { ButtonsSection, ButtonDropdownSection } from './sections/ButtonsSection'
import { FormsSection } from './sections/FormsSection'
import { BadgesSection, ToggleButtonsSection } from './sections/BadgesSection'
import { ListingsSection } from './sections/ListingsSection'
import { ModalSection } from './sections/ModalSection'
import { DropdownMenuSection, CalloutSection } from './sections/DropdownMenuSection'
import { IconographySection } from './sections/IconographySection'
import { BaseStylesSection } from './sections/BaseStylesSection'

export function DesignSystem() {
  return (
    <div className="min-h-screen bg-ds-page text-ds-ink-body">
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-ds-hairline bg-ds-surface/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-ds-accent flex items-center justify-center">
              <span className="text-[10px] font-bold text-ds-ink-display">DS</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-ds-ink-display">Design System</span>
              <span className="hidden sm:inline text-ds-ink-muted text-sm"> — TNS CCTV</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs text-ds-ink-muted hover:text-ds-ink-body transition-colors px-3 py-1.5 rounded-md hover:bg-ds-page"
            >
              ← Back to app
            </a>
          </div>
        </div>
      </header>

      {/* Page body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-10 py-2">
        <SidebarNav />

        {/* Main content */}
        <main className="flex-1 min-w-0 py-6">
          {/* Hero */}
          <div className="pb-8 border-b border-ds-hairline mb-2">
            <h1
              className="text-3xl font-bold text-ds-ink-display tracking-tight mb-2"
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
            >
              TNS CCTV Design System
            </h1>
            <p className="text-ds-ink-muted max-w-xl text-sm leading-relaxed">
              Single reference for all visual primitives, components, and usage patterns.
              Built on the Alto Contraste dark theme. Use token utilities (<code className="font-mono text-ds-accent">bg-ds-*</code>, <code className="font-mono text-ds-accent">text-ds-*</code>) rather than raw colors.
            </p>
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-ds-ink-muted">
              <span className="px-2 py-1 rounded border border-ds-hairline bg-ds-surface">Tailwind v4</span>
              <span className="px-2 py-1 rounded border border-ds-hairline bg-ds-surface">Next.js App Router</span>
              <span className="px-2 py-1 rounded border border-ds-hairline bg-ds-surface">shadcn/ui primitives</span>
              <span className="px-2 py-1 rounded border border-ds-hairline bg-ds-surface">lucide-react</span>
            </div>
          </div>

          {/* Branding */}
          <ColorsSection />
          <TypographySection />

          {/* Structure */}
          <ShellsSection />
          <MainNavigationSection />
          <SubNavigationSection />
          <PageHeadersSection />
          <BodyContentSection />
          <FootersSection />

          {/* Elements */}
          <IconographySection />
          <ButtonsSection />
          <ButtonDropdownSection />
          <FormsSection />
          <BadgesSection />
          <ToggleButtonsSection />
          <ListingsSection />
          <ModalSection />
          <DropdownMenuSection />
          <CalloutSection />

          {/* Base Styles */}
          <BaseStylesSection />
        </main>
      </div>
    </div>
  )
}
