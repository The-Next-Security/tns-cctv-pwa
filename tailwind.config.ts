import type { Config } from 'tailwindcss'

/**
 * Tipografía CCTV — consola de vigilancia
 * sans: UI general · mono: datos técnicos y relojes en vivo
 */
const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          'Geist Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'var(--font-geist-mono)',
          'Geist Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
    },
  },
}

export default config
