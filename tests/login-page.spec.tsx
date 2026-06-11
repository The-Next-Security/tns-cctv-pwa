// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loginMock = vi.fn()

vi.mock('@/components/brand/brand-logo', () => ({
  BrandLogo: () => <div data-testid="brand-logo" />,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ login: loginMock }),
}))

import LoginPage from '../app/(auth)/login/page'

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el copy real de acceso y no promete que cualquier contraseña funciona', () => {
    render(<LoginPage />)

    expect(screen.getByText(/usuario de prueba:/i)).toHaveTextContent(
      'Usuario de prueba: guardia@tenant.cl · contraseña secret123',
    )
    expect(screen.queryByText(/cualquier contraseña funciona/i)).not.toBeInTheDocument()
  })

  it('rellena las credenciales reales desde acceso rápido y las envía al login', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /guardia/i }))

    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue('guardia@tenant.cl')
    expect(screen.getByLabelText(/^contraseña$/i)).toHaveValue('secret123')

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    expect(loginMock).toHaveBeenCalledWith('guardia@tenant.cl', 'secret123')
  })
})
