import { describe, expect, it } from 'vitest'
import { getUserInitials } from '@/lib/user-avatar'

describe('getUserInitials', () => {
  it('prefers the real user name when available', () => {
    expect(
      getUserInitials({
        nombre: 'Carlos',
        full_name: undefined,
        email: 'carlos@tns.cl',
      }),
    ).toBe('C')
  })

  it('falls back to the email prefix when the real name is missing', () => {
    expect(
      getUserInitials({
        nombre: undefined,
        full_name: undefined,
        email: 'maria.jose@tns.cl',
      }),
    ).toBe('MJ')
  })
})
