// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  useUser: () => ({
    role: 'admin_parque',
    permissions: ['reports.view'],
  }),
}))

vi.mock('@/components/role-gate', () => ({
  RoleGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('recharts', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>

  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    LineChart: passthrough,
    PieChart: passthrough,
    Pie: passthrough,
    Bar: () => null,
    Line: () => null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  }
})

import ReportesPage from '../app/(dashboard)/reportes/page'

describe('ReportesPage', () => {
  it('muestra un aviso visible de datos de demostración', () => {
    render(<ReportesPage />)

    expect(screen.getByText(/^datos de demostración$/i)).toBeInTheDocument()
    expect(screen.getByText(/contrato backend pendiente/i)).toBeInTheDocument()
    expect(screen.getByText(/aún no existe contrato backend para los reportes agregados/i)).toBeInTheDocument()
  })

  it('usa tokens del design system en los gráficos', () => {
    render(<ReportesPage />)

    const alertasChart = screen.getByTestId('reportes-alertas-zona-chart')
    const alertasStyleText = alertasChart.querySelector('style')?.textContent ?? ''
    const responseChart = screen.getByTestId('reportes-tiempo-respuesta-chart')
    const responseStyleText = responseChart.querySelector('style')?.textContent ?? ''

    expect(alertasStyleText).toContain('var(--color-ds-accent)')
    expect(responseStyleText).toContain('var(--color-ds-accent-darker)')
  })
})
