'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  lang?: string
}

export function CodeBlock({ code, lang = 'tsx' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-md border border-ds-hairline bg-ds-page overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-ds-hairline">
        <span className="text-xs text-ds-ink-muted font-mono">{lang}</span>
        <button
          onClick={copy}
          className="text-ds-ink-muted hover:text-ds-ink-body transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-ds-ink-body leading-relaxed">
        <code>{code.trim()}</code>
      </pre>
    </div>
  )
}
