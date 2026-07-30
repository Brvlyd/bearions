/**
 * Canvas helpers for the live image editor used across the CMS.
 *
 * Everything here is framework-free math + canvas work so the modal component
 * stays focused on interaction, and so call sites can reuse the same output
 * pipeline (resize / crop / re-encode) without duplicating it.
 */

export type FitMode = 'cover' | 'contain'

export type EditorTransform = {
  /** Scale multiplier where 1 = the image exactly fits inside the frame. */
  zoom: number
  /** Horizontal offset from the frame centre, in output pixels. */
  offsetX: number
  /** Vertical offset from the frame centre, in output pixels. */
  offsetY: number
  /** Rotation in degrees, always a multiple of 90. */
  rotation: number
}

export type RenderOptions = {
  outputWidth: number
  outputHeight: number
  transform: EditorTransform
  /** CSS colour, or 'transparent' to keep the alpha channel. */
  background: string
}

export const TRANSPARENT_BACKGROUND = 'transparent'

export const DEFAULT_TRANSFORM: EditorTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
}

/** Loads a File into an <img> element and resolves once it is decodable. */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)

  return new Promise((resolve, reject) => {
    const image = new window.Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to read the selected image'))
    }

    image.src = objectUrl
  })
}

/**
 * Loads a remote image for re-editing. Requests CORS access first so the
 * canvas stays untainted; falls back to a plain load (preview only) when the
 * host does not send CORS headers.
 */
export function loadImageFromUrl(url: string): Promise<{ image: HTMLImageElement; tainted: boolean }> {
  const attempt = (useCors: boolean) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image()
      if (useCors) image.crossOrigin = 'anonymous'

      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to load the image'))
      // Bust any cached opaque response so the CORS attempt is not served a
      // previously cached non-CORS entry.
      image.src = useCors ? withCacheBuster(url) : url
    })

  return attempt(true)
    .then((image) => ({ image, tainted: false }))
    .then(undefined, () => attempt(false).then((image) => ({ image, tainted: true })))
}

function withCacheBuster(url: string) {
  try {
    const parsed = new URL(url, window.location.href)
    parsed.searchParams.set('editor', '1')
    return parsed.toString()
  } catch {
    return url
  }
}

/** Intrinsic image size after applying a 90°-step rotation. */
export function getRotatedSize(image: HTMLImageElement, rotation: number) {
  const swapped = Math.abs(rotation % 180) === 90
  return {
    width: swapped ? image.naturalHeight : image.naturalWidth,
    height: swapped ? image.naturalWidth : image.naturalHeight,
  }
}

/** Scale needed for the rotated image to cover / fit inside the output frame. */
export function getFitScale(
  image: HTMLImageElement,
  outputWidth: number,
  outputHeight: number,
  rotation: number,
  mode: FitMode
) {
  const { width, height } = getRotatedSize(image, rotation)
  if (!width || !height) return 1

  const scaleX = outputWidth / width
  const scaleY = outputHeight / height

  return mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)
}

/** Zoom value (relative to the contain baseline) that fills the whole frame. */
export function getCoverZoom(
  image: HTMLImageElement,
  outputWidth: number,
  outputHeight: number,
  rotation: number
) {
  const contain = getFitScale(image, outputWidth, outputHeight, rotation, 'contain')
  const cover = getFitScale(image, outputWidth, outputHeight, rotation, 'cover')
  return contain > 0 ? cover / contain : 1
}

/** Draws the current edit into a canvas at full output resolution. */
export function renderToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  { outputWidth, outputHeight, transform, background }: RenderOptions
) {
  const width = Math.max(1, Math.round(outputWidth))
  const height = Math.max(1, Math.round(outputHeight))

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, width, height)

  if (background && background !== TRANSPARENT_BACKGROUND) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const baseScale = getFitScale(image, width, height, transform.rotation, 'contain')
  const scale = baseScale * transform.zoom
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale

  ctx.save()
  ctx.translate(width / 2 + transform.offsetX, height / 2 + transform.offsetY)
  ctx.rotate((transform.rotation * Math.PI) / 180)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
}

export function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to encode the edited image'))
      },
      mimeType,
      quality
    )
  })
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Replaces the extension of a source name so it matches the encoded format. */
export function buildOutputFileName(sourceName: string, mimeType: string) {
  const extension = EXTENSION_BY_MIME[mimeType] || 'jpg'
  const base = (sourceName || 'image').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60)
  return `${base || 'image'}-${Date.now()}.${extension}`
}

/**
 * Picks the encoding format. PNG is kept whenever transparency has to survive,
 * otherwise JPEG gives far smaller files for photographic CMS content.
 */
export function resolveOutputMimeType(
  requested: 'auto' | 'image/jpeg' | 'image/png' | 'image/webp',
  sourceMimeType: string | undefined,
  keepsTransparency: boolean
) {
  if (requested !== 'auto') return requested
  if (keepsTransparency) return 'image/png'
  if (sourceMimeType === 'image/png' || sourceMimeType === 'image/webp') return 'image/png'
  return 'image/jpeg'
}

export function supportsQuality(mimeType: string) {
  return mimeType === 'image/jpeg' || mimeType === 'image/webp'
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
