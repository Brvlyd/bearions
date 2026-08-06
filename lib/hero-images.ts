// Shared shape for the "hero background" image tables (landing_page_images,
// community_page_images): desktop gets a 1-6 photo mosaic, mobile gets a
// single full-bleed photo. Used by both the public pages that render these
// and the admin managers that upload them.

export type HeroImageDevice = 'desktop' | 'mobile'

export type HeroImageRow = {
  id: string
  device: HeroImageDevice
  position: number
  image_url: string
  created_at?: string | null
  updated_at?: string | null
}

export const MAX_HERO_DESKTOP_IMAGES = 6

export const HERO_DESKTOP_SIZE_GUIDE = [
  { count: 1, ratio: '16:9', size: '2560 x 1440 px', width: 2560, height: 1440 },
  { count: 2, ratio: '4:5', size: '1600 x 2000 px', width: 1600, height: 2000 },
  { count: 3, ratio: '2:3', size: '1400 x 2100 px', width: 1400, height: 2100 },
  { count: 4, ratio: '16:9', size: '1920 x 1080 px', width: 1920, height: 1080 },
  { count: 5, ratio: '4:3', size: '1600 x 1200 px', width: 1600, height: 1200 },
  { count: 6, ratio: '4:3', size: '1600 x 1200 px', width: 1600, height: 1200 },
]

export const HERO_MOBILE_SIZE_GUIDE = { ratio: '9:16', size: '1080 x 1920 px', width: 1080, height: 1920 }

/**
 * Where the images end up. 'fullscreen' is the landing hero, which fills the
 * viewport, so portrait crops are right. 'banner' is the strip above the
 * community gallery — a wide, short box — where a 9:16 upload gets cropped down
 * to a sliver of its middle. The two need different guidance and different
 * crop ratios, which is the whole reason this distinction exists.
 */
export type HeroImageVariant = 'fullscreen' | 'banner'

export type HeroSizeGuide = {
  count: number
  ratio: string
  size: string
  width: number
  height: number
}

/**
 * Banner cell ratios, derived from the rendered box: max-w-6xl (1152px) wide by
 * h-96 (384px) tall, split by the same grid `getHeroGridColumnsClass` produces.
 */
export const HERO_BANNER_DESKTOP_SIZE_GUIDE: HeroSizeGuide[] = [
  { count: 1, ratio: '3:1', size: '2304 x 768 px', width: 2304, height: 768 },
  { count: 2, ratio: '3:2', size: '1728 x 1152 px', width: 1728, height: 1152 },
  { count: 3, ratio: '1:1', size: '1152 x 1152 px', width: 1152, height: 1152 },
  { count: 4, ratio: '3:1', size: '1728 x 576 px', width: 1728, height: 576 },
  { count: 5, ratio: '2:1', size: '1152 x 576 px', width: 1152, height: 576 },
  { count: 6, ratio: '2:1', size: '1152 x 576 px', width: 1152, height: 576 },
]

/** Mobile banner box is ~full width by h-56 (224px): a wide strip, not a portrait. */
export const HERO_BANNER_MOBILE_SIZE_GUIDE: HeroSizeGuide = {
  count: 1,
  ratio: '16:9',
  size: '1600 x 900 px',
  width: 1600,
  height: 900,
}

export const getHeroDesktopSizeGuides = (variant: HeroImageVariant): HeroSizeGuide[] =>
  variant === 'banner' ? HERO_BANNER_DESKTOP_SIZE_GUIDE : HERO_DESKTOP_SIZE_GUIDE

export const getHeroMobileSizeGuide = (variant: HeroImageVariant) =>
  variant === 'banner' ? HERO_BANNER_MOBILE_SIZE_GUIDE : HERO_MOBILE_SIZE_GUIDE

export function getHeroGridColumnsClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 md:grid-cols-2'
  if (count === 3) return 'grid-cols-1 md:grid-cols-3'
  if (count === 4) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}

export function splitHeroImagesByDevice(images: HeroImageRow[]): {
  desktop: HeroImageRow[]
  mobile: HeroImageRow[]
} {
  const withUrl = images.filter((image) => !!image.image_url)

  return {
    desktop: withUrl
      .filter((image) => image.device !== 'mobile')
      .sort((a, b) => a.position - b.position)
      .slice(0, MAX_HERO_DESKTOP_IMAGES),
    mobile: withUrl
      .filter((image) => image.device === 'mobile')
      .sort((a, b) => a.position - b.position)
      .slice(0, 1),
  }
}
