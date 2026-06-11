import React from 'react'
import { SectionShell } from '../SectionShell'

export function ShellsSection() {
  return (
    <SectionShell
      id="shells"
      title="Shells"
      description="Page shells define the top-level layout grid. The TNS CCTV console uses a fixed sidebar + main content pattern. On mobile, the sidebar collapses to a bottom navigation bar."
      useCases={{
        use: ['Full-page app views with persistent navigation', 'Admin and operations dashboards'],
        avoid: ['Marketing pages or landing pages — those use their own layout', 'Modals and overlays — they float above the shell'],
      }}
      sampleCode={`<div className="flex h-screen bg-ds-page">
  {/* Sidebar */}
  <aside className="hidden lg:flex w-60 flex-col border-r border-ds-hairline bg-ds-surface">
    <nav className="flex-1 p-4">{/* nav items */}</nav>
  </aside>
  {/* Main */}
  <main className="flex-1 overflow-y-auto p-6">
    {/* page content */}
  </main>
</div>`}
    >
      <div className="rounded-lg border border-ds-hairline overflow-hidden" style={{ height: 200 }}>
        <div className="flex h-full">
          <div className="w-40 border-r border-ds-hairline bg-ds-surface flex flex-col p-3 gap-2">
            <div className="h-3 w-24 rounded bg-ds-hairline" />
            <div className="h-2 w-16 rounded bg-ds-hairline opacity-60" />
            <div className="h-2 w-20 rounded bg-ds-hairline opacity-60" />
            <div className="h-2 w-14 rounded bg-ds-hairline opacity-60" />
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="h-6 w-32 rounded bg-ds-hairline" />
            <div className="grid grid-cols-3 gap-2 flex-1">
              <div className="rounded border border-ds-hairline bg-ds-surface" />
              <div className="rounded border border-ds-hairline bg-ds-surface" />
              <div className="rounded border border-ds-hairline bg-ds-surface" />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

export function MainNavigationSection() {
  return (
    <SectionShell
      id="main-navigation"
      title="Main Navigation"
      description="The primary sidebar nav lists the app's top-level destinations. Active state uses text-ds-ink-display + bg-ds-surface. Inactive links use text-ds-ink-muted."
      useCases={{
        use: ['Primary app routes: Operación, Expedientes, Configuración', 'Icons + labels on desktop, icons-only on collapsed mobile nav'],
        avoid: ['Secondary or contextual navigation — use Sub Navigation', 'Breadcrumbs — those are separate'],
      }}
      sampleCode={`<nav className="flex flex-col gap-1 p-2">
  <a
    href="/operacion"
    className="flex items-center gap-3 px-3 py-2 rounded-md
               text-ds-ink-display bg-ds-surface font-medium text-sm"
  >
    <ShieldAlert size={16} />
    Operación
  </a>
  <a
    href="/expedientes"
    className="flex items-center gap-3 px-3 py-2 rounded-md
               text-ds-ink-muted hover:text-ds-ink-body hover:bg-ds-surface
               transition-colors text-sm"
  >
    <FolderOpen size={16} />
    Expedientes
  </a>
</nav>`}
    >
      <nav className="flex flex-col gap-1 w-52">
        {[
          { label: 'Operación', active: true },
          { label: 'Expedientes', active: false },
          { label: 'Administración', active: false },
          { label: 'Configuración', active: false },
        ].map(item => (
          <div
            key={item.label}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-default ${
              item.active
                ? 'text-ds-ink-display bg-ds-surface font-medium'
                : 'text-ds-ink-muted'
            }`}
          >
            <div className="w-4 h-4 rounded-sm bg-ds-hairline shrink-0" />
            {item.label}
          </div>
        ))}
      </nav>
    </SectionShell>
  )
}

export function SubNavigationSection() {
  return (
    <SectionShell
      id="sub-navigation"
      title="Sub Navigation"
      description="Tab-style navigation for secondary destinations within a section. Uses a bottom border indicator for the active tab."
      useCases={{
        use: ['Secondary views within a section (e.g., Alertas / Historial / Configuración)', 'Filter tabs on listings pages'],
        avoid: ['Top-level app navigation — use Main Navigation for that'],
      }}
      sampleCode={`<div className="flex border-b border-ds-hairline gap-1">
  {tabs.map(tab => (
    <button
      key={tab}
      className={cn(
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active === tab
          ? "border-ds-accent text-ds-ink-display"
          : "border-transparent text-ds-ink-muted hover:text-ds-ink-body"
      )}
    >
      {tab}
    </button>
  ))}
</div>`}
    >
      <div className="flex border-b border-ds-hairline gap-1">
        {['Alertas', 'Historial', 'Configuración'].map((tab, i) => (
          <div
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px cursor-default ${
              i === 0
                ? 'border-ds-accent text-ds-ink-display'
                : 'border-transparent text-ds-ink-muted'
            }`}
          >
            {tab}
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

export function PageHeadersSection() {
  return (
    <SectionShell
      id="page-headers"
      title="Page Headers"
      description="Page headers anchor each view with a title, optional subtitle, and action buttons. Keep to one primary action on the right."
      useCases={{
        use: ['Top of every main content view', 'Title + optional back button for detail pages'],
        avoid: ['Repeated inside nested panels or cards'],
      }}
      sampleCode={`<header className="flex items-center justify-between py-4 border-b border-ds-hairline">
  <div>
    <h1 className="text-xl font-semibold text-ds-ink-display">Operación</h1>
    <p className="text-sm text-ds-ink-muted mt-0.5">Monitoreo en tiempo real</p>
  </div>
  <Button size="sm">Nueva alerta</Button>
</header>`}
    >
      <header className="flex items-center justify-between py-4 border-b border-ds-hairline">
        <div>
          <h1 className="text-xl font-semibold text-ds-ink-display">Operación</h1>
          <p className="text-sm text-ds-ink-muted mt-0.5">Monitoreo en tiempo real</p>
        </div>
        <div className="h-8 px-4 rounded-md text-sm flex items-center bg-ds-accent text-ds-ink-display font-medium cursor-default">
          Nueva alerta
        </div>
      </header>
    </SectionShell>
  )
}

export function BodyContentSection() {
  return (
    <SectionShell
      id="body-content"
      title="Body Content"
      description="The .body-content wrapper applies full long-form prose styles — font, line-height, heading hierarchy, links, lists, blockquotes — in one class. Use it for rich text output from a CMS or editor."
      useCases={{
        use: ['CMS-sourced content areas', 'Help text and documentation sections', 'Rich-text editor output'],
        avoid: ['UI layouts — this is for prose content only', 'Short labels or captions — use token utilities directly'],
      }}
      sampleCode={`<article className="body-content max-w-2xl">
  <h2>Procedimiento de escalación</h2>
  <p>Cuando una alerta crítica no es atendida en 5 minutos, el sistema escala automáticamente al supervisor de turno.</p>
  <ul>
    <li>Notificación push al supervisor</li>
    <li>Registro en el expediente</li>
  </ul>
</article>`}
    >
      <article className="body-content max-w-xl">
        <h2>Procedimiento de escalación</h2>
        <p>Cuando una alerta crítica no es atendida en 5 minutos, el sistema escala automáticamente al supervisor de turno.</p>
        <ul>
          <li>Notificación push al supervisor</li>
          <li>Registro en el expediente de la alerta</li>
          <li>Correo de confirmación al equipo de seguridad</li>
        </ul>
        <blockquote>Toda escalación debe quedar registrada con el motivo y el operario responsable.</blockquote>
      </article>
    </SectionShell>
  )
}

export function FootersSection() {
  return (
    <SectionShell
      id="footers"
      title="Footers"
      description="App footers appear inside the main shell, below all content. Keep them minimal — version info, legal links, or tenant branding. Never put primary navigation or actions in the footer."
      useCases={{
        use: ['App version number', 'Legal disclaimer for the current tenant', 'Powered-by or branding credit'],
        avoid: ['Primary actions or navigation links', 'Long form content'],
      }}
      sampleCode={`<footer className="border-t border-ds-hairline px-6 py-3 flex items-center justify-between">
  <span className="text-xs text-ds-ink-muted">TNS Track v2.1.0</span>
  <span className="text-xs text-ds-ink-muted">Agrolivo Industrial · 2026</span>
</footer>`}
    >
      <footer className="border-t border-ds-hairline px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-ds-ink-muted">TNS Track v2.1.0</span>
        <span className="text-xs text-ds-ink-muted">Agrolivo Industrial · 2026</span>
      </footer>
    </SectionShell>
  )
}
