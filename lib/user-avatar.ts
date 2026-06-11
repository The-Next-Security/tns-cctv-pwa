import type { User } from './types'

type AvatarUser = Pick<User, 'nombre' | 'full_name' | 'email'> | null | undefined

function normalizeDisplayName(user: AvatarUser): string {
  const rawName = user?.nombre?.trim() || user?.full_name?.trim() || user?.email?.split('@')[0]?.trim() || ''

  return rawName.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function getUserInitials(user: AvatarUser): string {
  const displayName = normalizeDisplayName(user)

  if (!displayName) return 'U'

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return initials || 'U'
}

export function getUserDisplayName(user: AvatarUser): string {
  const displayName = normalizeDisplayName(user)
  return displayName || 'Usuario'
}
