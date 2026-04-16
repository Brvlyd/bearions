export type CommunityLayoutSize = 's' | 'm' | 'w' | 'l'

export const DEFAULT_COMMUNITY_LAYOUT_SIZE: CommunityLayoutSize = 'm'

export const normalizeCommunityLayoutSize = (value?: string | null): CommunityLayoutSize => {
  if (value === 's' || value === 'm' || value === 'w' || value === 'l') {
    return value
  }

  return DEFAULT_COMMUNITY_LAYOUT_SIZE
}

export const getCommunityTileClassName = (value?: string | null): string => {
  const size = normalizeCommunityLayoutSize(value)

  if (size === 's') return 'col-span-1 row-span-1'
  if (size === 'w') return 'col-span-2 row-span-1'
  if (size === 'l') return 'col-span-2 row-span-2'

  return 'col-span-1 row-span-2'
}
