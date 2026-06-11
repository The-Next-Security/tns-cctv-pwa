import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const TNS_LOGO_SRC = '/brand/tns-logo.png'

/** Dimensiones reales del asset — 800×250 px (ratio 3.2:1) */
export const LOGO_INTRINSIC_WIDTH = 800
export const LOGO_INTRINSIC_HEIGHT = 250
const LOGO_RATIO = LOGO_INTRINSIC_WIDTH / LOGO_INTRINSIC_HEIGHT

function logoDimensions(targetHeight: number) {
  return {
    height: targetHeight,
    width: Math.round(targetHeight * LOGO_RATIO),
  }
}

interface BrandLogoProps {
  /** full: horizontal · mark: emblema · hero: login destacado */
  variant?: 'full' | 'mark' | 'hero'
  subtitle?: string | null
  href?: string | null
  className?: string
  imageClassName?: string
  priority?: boolean
}

const VARIANT_HEIGHT_PX = {
  full: 32,
  hero: 56,
  mark: 36,
} as const

function HorizontalLogo({
  variant,
  priority,
  imageClassName,
}: {
  variant: 'full' | 'hero'
  priority?: boolean
  imageClassName?: string
}) {
  const heightPx = VARIANT_HEIGHT_PX[variant]
  const { width, height } = logoDimensions(heightPx)

  return (
    <Image
      src={TNS_LOGO_SRC}
      alt="TNS Tracking & Security"
      width={width}
      height={height}
      priority={priority}
      className={cn('block shrink-0 tns-brand-logo', imageClassName)}
      style={imageClassName?.includes('!h-') ? { width: 'auto', maxWidth: '100%' } : undefined}
    />
  )
}

export function BrandLogo({
  variant = 'full',
  subtitle = 'Track · Parque Agrolivo',
  href = '/operacion',
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  const markHeight = VARIANT_HEIGHT_PX.mark
  const markFull = logoDimensions(markHeight)

  const logoImage =
    variant === 'mark' ? (
      <div
        className={cn(
          'relative mx-auto shrink-0 overflow-hidden rounded-xl',
          'bg-[var(--cctv-bg-ds-muted)] ring-1 ring-[var(--cctv-border)]'
        )}
        style={{ width: markHeight, height: markHeight }}
      >
        <Image
          src={TNS_LOGO_SRC}
          alt="TNS"
          width={markFull.width}
          height={markFull.height}
          priority={priority}
          className={cn(
            'absolute left-0 top-0 block tns-brand-logo',
            imageClassName
          )}
        />
      </div>
    ) : (
      <HorizontalLogo variant={variant} priority={priority} imageClassName={imageClassName} />
    )

  const inner = (
    <div
      className={cn(
        'min-w-0',
        variant === 'mark' ? 'flex justify-center' : 'inline-flex flex-col gap-1.5',
        className
      )}
    >
      {logoImage}
      {subtitle && variant !== 'mark' && (
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-ds-ink-muted">
          {subtitle}
        </p>
      )}
    </div>
  )

  if (!href) {
    return inner
  }

  return (
    <Link
      href={href}
      className="group inline-block min-w-0 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40"
      aria-label="TNS Track — inicio"
    >
      <div className={cn(variant !== 'mark' && 'transition-transform group-hover:scale-[1.01]')}>
        {inner}
      </div>
    </Link>
  )
}
