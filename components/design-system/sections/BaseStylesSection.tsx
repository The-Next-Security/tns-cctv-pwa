import React from 'react'
import { SectionShell } from '../SectionShell'

export function BaseStylesSection() {
  return (
    <>
      <SectionShell
        id="heading-scale"
        title="Heading Scale"
        description="Full h1–h6 scale using font-ds-display (Inter). Headings use text-ds-ink-display with tight tracking. Apply through Tailwind text-* utilities — the scale maps directly to Tailwind's default type scale."
        sampleCode={`<h1 className="text-4xl font-bold text-ds-ink-display tracking-tight">H1</h1>
<h2 className="text-3xl font-semibold text-ds-ink-display tracking-tight">H2</h2>
<h3 className="text-2xl font-semibold text-ds-ink-display">H3</h3>
<h4 className="text-xl font-semibold text-ds-ink-display">H4</h4>
<h5 className="text-base font-semibold text-ds-ink-display">H5</h5>
<h6 className="text-sm font-semibold text-ds-ink-display">H6</h6>`}
      >
        <div className="space-y-3" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
          {[
            { tag: 'H1', cls: 'text-4xl font-bold tracking-tight' },
            { tag: 'H2', cls: 'text-3xl font-semibold tracking-tight' },
            { tag: 'H3', cls: 'text-2xl font-semibold' },
            { tag: 'H4', cls: 'text-xl font-semibold' },
            { tag: 'H5', cls: 'text-base font-semibold' },
            { tag: 'H6', cls: 'text-sm font-semibold' },
          ].map(({ tag, cls }) => (
            <div key={tag} className="flex items-baseline gap-4">
              <span className="text-xs text-ds-ink-muted w-6">{tag}</span>
              <span className={`text-ds-ink-display ${cls}`}>{tag} — Sistema de Monitoreo TNS</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        id="h1"
        title="H1"
        description="Top-level page title. One per page. Use text-4xl font-bold tracking-tight text-ds-ink-display. On mobile: text-3xl."
        sampleCode={`<h1 className="text-4xl font-bold tracking-tight text-ds-ink-display">
  Dashboard de Operación
</h1>`}
      >
        <h1 className="text-4xl font-bold tracking-tight text-ds-ink-display" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
          Dashboard de Operación
        </h1>
      </SectionShell>

      <SectionShell
        id="h2"
        title="H2"
        description="Section heading within a page. Use text-3xl font-semibold tracking-tight text-ds-ink-display."
        sampleCode={`<h2 className="text-3xl font-semibold tracking-tight text-ds-ink-display">
  Alertas activas
</h2>`}
      >
        <h2 className="text-3xl font-semibold tracking-tight text-ds-ink-display" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
          Alertas activas
        </h2>
      </SectionShell>

      <SectionShell
        id="h3"
        title="H3"
        description="Subsection heading. Use text-2xl font-semibold text-ds-ink-display."
        sampleCode={`<h3 className="text-2xl font-semibold text-ds-ink-display">Zona Norte</h3>`}
      >
        <h3 className="text-2xl font-semibold text-ds-ink-display" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
          Zona Norte
        </h3>
      </SectionShell>

      <SectionShell
        id="paragraph"
        title="Paragraph"
        description="Body copy. text-sm or text-base, text-ds-ink-body, leading-relaxed. Use font-ds-body (DM Sans) for prose. Avoid text-ds-ink-display for long copy — the near-white is fatiguing over many lines."
        sampleCode={`<p className="text-base text-ds-ink-body leading-relaxed max-w-prose">
  El sistema de monitoreo registra todas las alertas en tiempo real. Cada evento queda
  archivado en el expediente correspondiente para auditoría posterior.
</p>`}
      >
        <p className="text-base text-ds-ink-body leading-relaxed max-w-prose" style={{ fontFamily: 'DM Sans, ui-sans-serif, system-ui, sans-serif' }}>
          El sistema de monitoreo registra todas las alertas en tiempo real. Cada evento queda archivado en el expediente correspondiente para auditoría posterior.
        </p>
      </SectionShell>

      <SectionShell
        id="anchor"
        title="Anchor"
        description="Inline links. text-ds-accent with underline-offset-2 on hover. Use for navigational links in prose, not for actions — use Button for those."
        sampleCode={`<a
  href="/expedientes"
  className="text-ds-accent underline underline-offset-2 hover:text-ds-accent-darker transition-colors"
>
  Ver expedientes
</a>`}
      >
        <p className="text-ds-ink-body text-sm">
          Ver el{' '}
          <a
            href="#"
            className="text-ds-accent underline underline-offset-2 hover:text-ds-accent-darker transition-colors"
            onClick={e => e.preventDefault()}
          >
            expediente completo
          </a>{' '}
          para más detalles sobre esta alerta.
        </p>
      </SectionShell>

      <SectionShell
        id="strong"
        title="Strong"
        description="Inline emphasis. text-ds-ink-display font-semibold. Use sparingly — for truly important terms. Don't use for decoration."
        sampleCode={`<p className="text-ds-ink-body text-sm">
  La alerta fue atendida por <strong className="text-ds-ink-display font-semibold">Juan López</strong> a las 09:45.
</p>`}
      >
        <p className="text-ds-ink-body text-sm">
          La alerta fue atendida por <strong className="text-ds-ink-display font-semibold">Juan López</strong> a las 09:45.
        </p>
      </SectionShell>

      <SectionShell
        id="lists"
        title="Lists"
        description="Unordered (disc) and ordered (decimal) lists. Default left-padding of 1.5rem. Items use text-ds-ink-body. Space-y-1 between items. Use .body-content for auto-styling, or apply utilities manually."
        sampleCode={`<ul className="list-disc pl-5 space-y-1 text-sm text-ds-ink-body">
  <li>Revisar cámaras sin señal</li>
  <li>Escalar alertas críticas sin atender</li>
</ul>

<ol className="list-decimal pl-5 space-y-1 text-sm text-ds-ink-body">
  <li>Verificar identidad del acceso</li>
  <li>Registrar el evento en el expediente</li>
</ol>`}
      >
        <div className="flex gap-12">
          <div>
            <p className="text-xs text-ds-ink-muted mb-2">Unordered</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-ds-ink-body">
              <li>Revisar cámaras sin señal</li>
              <li>Escalar alertas críticas</li>
              <li>Verificar registros vehiculares</li>
            </ul>
          </div>
          <div>
            <p className="text-xs text-ds-ink-muted mb-2">Ordered</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-ds-ink-body">
              <li>Verificar identidad</li>
              <li>Registrar en expediente</li>
              <li>Notificar al supervisor</li>
            </ol>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        id="blockquote"
        title="Blockquote"
        description="Pull quotes and important text excerpts. Left border in text-ds-hairline, body in text-ds-ink-muted italic. Used primarily inside .body-content areas."
        sampleCode={`<blockquote className="border-l-2 border-ds-hairline pl-4 text-ds-ink-muted italic text-sm">
  Toda escalación debe quedar registrada con el motivo y el operario responsable.
</blockquote>`}
      >
        <blockquote className="border-l-2 border-ds-hairline pl-4 text-ds-ink-muted italic text-sm">
          Toda escalación debe quedar registrada con el motivo y el operario responsable.
        </blockquote>
      </SectionShell>

      <SectionShell
        id="hr"
        title="Horizontal Rule"
        description="Section divider. border-ds-hairline. Use to separate distinct content blocks within a panel or form. Prefer border-b on a wrapper element for layout-level dividers."
        sampleCode={`<hr className="border-ds-hairline my-6" />`}
      >
        <div className="space-y-4">
          <p className="text-sm text-ds-ink-body">Sección anterior</p>
          <hr className="border-ds-hairline" />
          <p className="text-sm text-ds-ink-body">Siguiente sección</p>
        </div>
      </SectionShell>

      <SectionShell
        id="label"
        title="Label"
        description="Form and metadata labels. text-xs font-semibold uppercase tracking-widest text-ds-ink-muted. Pair with inputs using <Label htmlFor>. Also used for section group headings in sidebars."
        sampleCode={`import { Label } from '@/components/ui/label'

<div className="space-y-1.5">
  <Label htmlFor="zona">Zona asignada</Label>
  <Input id="zona" placeholder="Zona Norte" />
</div>`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-ds-ink-muted mb-1">Form label (via Label component)</p>
            <span className="text-sm font-medium text-ds-ink-display">Zona asignada</span>
          </div>
          <div>
            <p className="text-xs text-ds-ink-muted mb-1">Section group label</p>
            <span className="text-xs font-semibold text-ds-ink-muted uppercase tracking-widest">Branding</span>
          </div>
        </div>
      </SectionShell>
    </>
  )
}
