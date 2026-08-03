// The one place the "-34%" chip is styled, so a discount looks the same on a
// catalog card, a product page and the admin product list.

type DiscountBadgeProps = {
  percent: number
  size?: 'sm' | 'md'
  className?: string
}

export default function DiscountBadge({ percent, size = 'sm', className = '' }: DiscountBadgeProps) {
  const sizeClass = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center rounded-md bg-red-600 font-bold text-white shadow-sm ${sizeClass} ${className}`}
    >
      -{percent}%
    </span>
  )
}
