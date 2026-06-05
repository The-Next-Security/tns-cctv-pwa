import React from 'react'
import { CodeBlock } from './CodeBlock'

interface UseCases {
  use: string[]
  avoid: string[]
}

interface SectionShellProps {
  id: string
  title: string
  description: string
  useCases?: UseCases
  sampleCode?: string
  options?: React.ReactNode
  children: React.ReactNode
}

export function SectionShell({
  id,
  title,
  description,
  useCases,
  sampleCode,
  options,
  children,
}: SectionShellProps) {
  return (
    <section
      id={id}
      className="scroll-mt-20 py-10 border-b border-ds-hairline last:border-0"
    >
      <h2 className="text-lg font-semibold text-ds-ink-display mb-6" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
        {title}
      </h2>

      {/* 1. Preview */}
      <div className="rounded-lg border border-ds-hairline bg-ds-page p-6 mb-5">
        {children}
      </div>

      {/* 2. Description */}
      <p className="text-sm text-ds-ink-body mb-5 leading-relaxed">{description}</p>

      {/* 3. Use cases */}
      {useCases && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-4 rounded-md bg-ds-surface border border-ds-hairline">
          <div>
            <p className="text-xs font-semibold text-ds-ink-muted uppercase tracking-widest mb-2">When to use</p>
            <ul className="space-y-1.5">
              {useCases.use.map((item, i) => (
                <li key={i} className="text-sm text-ds-ink-body flex gap-2">
                  <span className="text-ds-accent shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-ds-ink-muted uppercase tracking-widest mb-2">When not to use</p>
            <ul className="space-y-1.5">
              {useCases.avoid.map((item, i) => (
                <li key={i} className="text-sm text-ds-ink-body flex gap-2">
                  <span className="text-ds-signal shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 4. Sample code */}
      {sampleCode && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-ds-ink-muted uppercase tracking-widest mb-2">Sample</p>
          <CodeBlock code={sampleCode} />
        </div>
      )}

      {/* 5. Options / variations */}
      {options && (
        <div>
          <p className="text-xs font-semibold text-ds-ink-muted uppercase tracking-widest mb-3">Options / Variations</p>
          {options}
        </div>
      )}
    </section>
  )
}
