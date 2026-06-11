import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AlertCard } from '@/components/operacion/alert-card'
import type { Alert } from '@/lib/types'

function buildAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 42,
    criticality: 'alta',
    status: 'resuelta',
    timestamp: '2026-06-11T10:00:00.000Z',
    event_code: 'CrossLineDetection',
    description: 'Intrusión perimetral',
    resolution_notes: 'Patrulla verificó y descartó intrusión',
    camera: { id: 7, name: 'Portería Norte', active: true },
    zone: { id: 3, name: 'Acceso Norte', active: true },
    ...overrides,
  }
}

describe('AlertCard label de resueltas', () => {
  it('prioriza la nota real de resolución cuando es útil', () => {
    render(
      <AlertCard
        alert={buildAlert({ resolution_notes: 'Falsa alarma — viento movió malla' })}
        onAction={vi.fn()}
        onEscalate={vi.fn()}
      />,
    )

    expect(screen.getByText('Resuelta: Falsa alarma — viento movió malla')).toBeInTheDocument()
    expect(screen.queryByText('Resuelta: CONFIRMED')).not.toBeInTheDocument()
  })

  it('no expone enums crudos y los traduce al español', () => {
    render(
      <AlertCard
        alert={buildAlert({ resolution_notes: 'CONFIRMED' })}
        onAction={vi.fn()}
        onEscalate={vi.fn()}
      />,
    )

    expect(screen.getByText('Resuelta: Confirmada')).toBeInTheDocument()
    expect(screen.queryByText('Resuelta: CONFIRMED')).not.toBeInTheDocument()
  })

  it('usa un texto seguro cuando llega una decisión desconocida en mayúsculas', () => {
    render(
      <AlertCard
        alert={buildAlert({ resolution_notes: 'NEEDS_MANUAL_REVIEW' })}
        onAction={vi.fn()}
        onEscalate={vi.fn()}
      />,
    )

    expect(screen.getByText('Resuelta: Resolución registrada')).toBeInTheDocument()
    expect(screen.queryByText('Resuelta: NEEDS_MANUAL_REVIEW')).not.toBeInTheDocument()
  })
})
