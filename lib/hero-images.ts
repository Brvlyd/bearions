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
