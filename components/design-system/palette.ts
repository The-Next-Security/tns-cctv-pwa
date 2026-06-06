// bm-design-system — TNS CCTV palette
// Los swatches reflejan los TOKENS REALES de la app (variables --cctv-* en
// app/globals.css), no valores hardcodeados. Cada swatch declara la expresión
// CSS (`cssValue`) que usa la app, de modo que la sección de Colores muestra
// exactamente lo que se renderiza — y cambia con el tema claro/oscuro.
// El `hex` es solo un fallback de SSR antes de hidratar y leer el valor vivo.

export const fonts = {
  display: "'Inter', ui-sans-serif, system-ui, sans-serif",
  body: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
} as const

export interface Swatch {
  /** Nombre del token utilitario (sin prefijo de propiedad), ej. ds-page → bg-ds-page */
  name: string
  /** Expresión CSS real usada por la app (debe coincidir con styles/design-system.css) */
  cssValue: string
  /** Fallback de SSR (valor en tema oscuro, el por defecto) */
  hex: string
  label: string
  usage: string
}

export const swatches: Swatch[] = [
  { name: 'ds-page', cssValue: 'var(--cctv-bg-base)', hex: '#121212', label: 'Page', usage: 'Page background' },
  { name: 'ds-surface', cssValue: 'var(--cctv-bg-surface)', hex: '#1a1a1a', label: 'Surface', usage: 'Cards, panels' },
  { name: 'ds-hairline', cssValue: 'var(--cctv-border)', hex: '#2d333b', label: 'Hairline', usage: 'Borders, dividers' },
  { name: 'ds-ink-display', cssValue: 'var(--cctv-text-primary)', hex: '#e4e4e7', label: 'Ink Display', usage: 'Headings, primary text' },
  { name: 'ds-ink-body', cssValue: 'var(--cctv-text-secondary)', hex: '#a1a1aa', label: 'Ink Body', usage: 'Body copy' },
  { name: 'ds-ink-muted', cssValue: 'var(--cctv-text-muted)', hex: '#71717a', label: 'Ink Muted', usage: 'Captions, secondary text' },
  { name: 'ds-accent', cssValue: 'var(--cctv-accent-blue)', hex: '#5b7a9d', label: 'Accent', usage: 'Links, interactive elements' },
  { name: 'ds-accent-faded', cssValue: 'var(--info-bg)', hex: 'rgb(91 122 157 / 0.12)', label: 'Accent Faded', usage: 'Accent backgrounds' },
  { name: 'ds-accent-darker', cssValue: 'color-mix(in srgb, var(--cctv-accent-blue) 80%, black 20%)', hex: '#49627e', label: 'Accent Darker', usage: 'Accent hover states' },
  { name: 'ds-signal', cssValue: 'var(--alert-critical)', hex: '#ff4d4f', label: 'Signal', usage: 'Critical alerts, errors' },
  { name: 'ds-signal-faded', cssValue: 'var(--alert-critical-bg)', hex: 'rgb(255 77 79 / 0.12)', label: 'Signal Faded', usage: 'Alert backgrounds' },
  { name: 'ds-signal-darker', cssValue: 'color-mix(in srgb, var(--alert-critical) 80%, black 20%)', hex: '#cc3e40', label: 'Signal Darker', usage: 'Alert hover states' },
]
