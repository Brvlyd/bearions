import { getImageUrl } from '@/lib/image-utils'
import { getHeroGridColumnsClass, type HeroImageRow } from '@/lib/hero-images'

// Renders both the desktop mosaic and the mobile single-photo background and
// lets CSS pick one — no viewport JS, so there is no hydration flash and it
// still renders correctly before JS loads. Must sit inside a `relative`
// (or otherwise positioned) parent; this component only supplies `absolute inset-0` layers.

const FALLBACK_GRADIENTS = [
  'from-gray-100 to-gray-200',
  'from-gray-200 to-gray-300',
  'from-gray-300 to-gray-400',
  'from-slate-200 to-slate-300',
  'from-zinc-200 to-zinc-300',
  'from-stone-200 to-stone-300',
]

type Props = {
  desktopImages: HeroImageRow[]
  mobileImages: HeroImageRow[]
  alt: string
}

export default function HeroBackground({ desktopImages, mobileImages, alt }: Props) {
  const desktopCount = Math.max(desktopImages.length, 1)
  const gridClass = getHeroGridColumnsClass(desktopCount)
  const mobileImage = mobileImages[0] || null

  return (
    <>
      <div className={`absolute inset-0 hidden md:grid ${gridClass} auto-rows-fr gap-0`}>
        {(desktopImages.length > 0 ? desktopImages : [null]).map((image, index) => (
          <div
            key={image?.id || `fallback-${index}`}
            className={`relative overflow-hidden bg-linear-to-br ${FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]}`}
          >
            {image?.image_url && (
              <img
                src={getImageUrl(image.image_url)}
                alt={`${alt} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      <div className={`absolute inset-0 md:hidden overflow-hidden bg-linear-to-br ${FALLBACK_GRADIENTS[0]}`}>
        {mobileImage?.image_url && (
          <img src={getImageUrl(mobileImage.image_url)} alt={alt} className="w-full h-full object-cover" />
        )}
      </div>
    </>
  )
}
