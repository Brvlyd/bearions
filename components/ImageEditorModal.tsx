'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Maximize2,
  Minimize2,
  Move,
  RotateCw,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import {
  DEFAULT_TRANSFORM,
  EditorTransform,
  FitMode,
  TRANSPARENT_BACKGROUND,
  buildOutputFileName,
  canvasToBlob,
  clamp,
  formatBytes,
  getCoverZoom,
  loadImageFromFile,
  loadImageFromUrl,
  renderToCanvas,
  resolveOutputMimeType,
  supportsQuality,
} from '@/lib/image-editor'

export interface ImageEditorModalProps {
  open: boolean
  /** Newly selected file to edit. Takes priority over sourceUrl. */
  file?: File | null
  /** Already published image URL, for re-editing without a new upload. */
  sourceUrl?: string | null
  /** Base name used for the produced file. */
  fileNameHint?: string
  title?: string
  description?: string
  /** Forces a fixed width/height ratio (e.g. 1 for a favicon). */
  aspectLock?: number | null
  recommendedWidth?: number
  recommendedHeight?: number
  /** How the image is framed on first open. Match how the site renders it. */
  defaultFit?: FitMode
  maxOutputDimension?: number
  maxFileSizeBytes?: number
  outputFormat?: 'auto' | 'image/jpeg' | 'image/png' | 'image/webp'
  /** Keeps the alpha channel by default (logos, favicons). */
  transparentByDefault?: boolean
  onCancel: () => void
  onApply: (file: File) => void | Promise<void>
}

const MIN_OUTPUT_DIMENSION = 16
const MIN_ZOOM = 0.1
const MAX_ZOOM = 6

const BACKGROUND_SWATCHES = [TRANSPARENT_BACKGROUND, '#ffffff', '#000000', '#f3f4f6']

const CHECKERBOARD_STYLE = {
  backgroundImage:
    'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
}

export default function ImageEditorModal({
  open,
  file,
  sourceUrl,
  fileNameHint,
  title,
  description,
  aspectLock = null,
  recommendedWidth,
  recommendedHeight,
  defaultFit = 'cover',
  maxOutputDimension = 4096,
  maxFileSizeBytes = 5 * 1024 * 1024,
  outputFormat = 'auto',
  transparentByDefault = false,
  onCancel,
  onApply,
}: ImageEditorModalProps) {
  const { tr } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragStateRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tainted, setTainted] = useState(false)
  const [outputWidth, setOutputWidth] = useState(0)
  const [outputHeight, setOutputHeight] = useState(0)
  const [aspect, setAspect] = useState<number | null>(aspectLock)
  const [transform, setTransform] = useState<EditorTransform>(DEFAULT_TRANSFORM)
  const [background, setBackground] = useState<string>(
    transparentByDefault ? TRANSPARENT_BACKGROUND : '#ffffff'
  )
  const [quality, setQuality] = useState(0.9)
  const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const sourceName = fileNameHint || file?.name || 'image'
  const mimeType = useMemo(
    () => resolveOutputMimeType(outputFormat, file?.type, background === TRANSPARENT_BACKGROUND),
    [outputFormat, file?.type, background]
  )
  const qualityEnabled = supportsQuality(mimeType)

  /** Computes a sensible starting frame + zoom for a freshly loaded image. */
  const initializeFor = useCallback(
    (loaded: HTMLImageElement) => {
      let width: number
      let height: number

      if (recommendedWidth && recommendedHeight) {
        width = recommendedWidth
        height = recommendedHeight
      } else if (aspectLock) {
        width = clamp(loaded.naturalWidth, MIN_OUTPUT_DIMENSION, maxOutputDimension)
        height = Math.round(width / aspectLock)
      } else {
        const shrink = Math.min(1, maxOutputDimension / Math.max(loaded.naturalWidth, loaded.naturalHeight))
        width = Math.max(MIN_OUTPUT_DIMENSION, Math.round(loaded.naturalWidth * shrink))
        height = Math.max(MIN_OUTPUT_DIMENSION, Math.round(loaded.naturalHeight * shrink))
      }

      const startZoom = defaultFit === 'cover' ? getCoverZoom(loaded, width, height, 0) : 1

      setOutputWidth(width)
      setOutputHeight(height)
      setAspect(aspectLock ?? width / height)
      setTransform({ ...DEFAULT_TRANSFORM, zoom: startZoom })
    },
    [aspectLock, defaultFit, maxOutputDimension, recommendedHeight, recommendedWidth]
  )

  // Load the source (new file or already published URL) whenever the modal opens.
  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setApplyError(null)
    setEstimatedBytes(null)
    setTainted(false)
    setImage(null)

    const run = async () => {
      try {
        if (file) {
          const loaded = await loadImageFromFile(file)
          if (cancelled) return
          setImage(loaded)
          initializeFor(loaded)
        } else if (sourceUrl) {
          const { image: loaded, tainted: isTainted } = await loadImageFromUrl(sourceUrl)
          if (cancelled) return
          setImage(loaded)
          setTainted(isTainted)
          initializeFor(loaded)
        } else {
          setLoadError(tr('No image selected', 'Belum ada gambar yang dipilih'))
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr('Failed to load this image', 'Gagal memuat gambar ini'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file, sourceUrl, initializeFor])

  // Redraw at full output resolution on every change: the canvas *is* the preview,
  // so what the admin sees is exactly the file that gets uploaded.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || !outputWidth || !outputHeight) return

    renderToCanvas(canvas, image, {
      outputWidth,
      outputHeight,
      transform,
      background,
    })
    // `loading` is a dependency because the canvas only mounts once it flips off.
  }, [image, outputWidth, outputHeight, transform, background, loading])

  // Weigh the encoded result shortly after the preview settles so the admin can
  // see the real upload size before committing.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || !outputWidth || !outputHeight || tainted) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const blob = await canvasToBlob(canvas, mimeType, quality)
        if (!cancelled) setEstimatedBytes(blob.size)
      } catch {
        if (!cancelled) setEstimatedBytes(null)
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [image, outputWidth, outputHeight, transform, background, mimeType, quality, tainted])

  // Close on Escape, matching the other admin modals.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applying) onCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, applying, onCancel])

  const applyOutputSize = (nextWidth: number, nextHeight: number) => {
    const width = clamp(Math.round(nextWidth) || MIN_OUTPUT_DIMENSION, MIN_OUTPUT_DIMENSION, maxOutputDimension)
    const height = clamp(Math.round(nextHeight) || MIN_OUTPUT_DIMENSION, MIN_OUTPUT_DIMENSION, maxOutputDimension)

    // Offsets live in output pixels, so rescale them to keep the framing steady.
    setTransform((prev) => ({
      ...prev,
      offsetX: outputWidth ? (prev.offsetX * width) / outputWidth : prev.offsetX,
      offsetY: outputHeight ? (prev.offsetY * height) / outputHeight : prev.offsetY,
    }))
    setOutputWidth(width)
    setOutputHeight(height)
  }

  const handleWidthChange = (value: number) => {
    if (aspect) applyOutputSize(value, value / aspect)
    else applyOutputSize(value, outputHeight)
  }

  const handleHeightChange = (value: number) => {
    if (aspect) applyOutputSize(value * aspect, value)
    else applyOutputSize(outputWidth, value)
  }

  const handleAspectChange = (nextAspect: number | null) => {
    setAspect(nextAspect)
    if (!nextAspect) return

    // Keep the longest edge so switching ratio never silently shrinks the export.
    const longestEdge = Math.max(outputWidth, outputHeight)
    const width = nextAspect >= 1 ? longestEdge : Math.round(longestEdge * nextAspect)
    const height = nextAspect >= 1 ? Math.round(longestEdge / nextAspect) : longestEdge

    setTransform((prev) => ({ ...prev, offsetX: 0, offsetY: 0 }))
    setOutputWidth(clamp(width, MIN_OUTPUT_DIMENSION, maxOutputDimension))
    setOutputHeight(clamp(height, MIN_OUTPUT_DIMENSION, maxOutputDimension))
  }

  const handleScalePercent = (percent: number) => {
    applyOutputSize((outputWidth * percent) / 100, (outputHeight * percent) / 100)
  }

  const setZoom = (nextZoom: number) => {
    setTransform((prev) => ({ ...prev, zoom: clamp(nextZoom, MIN_ZOOM, MAX_ZOOM) }))
  }

  const fitWhole = () => setTransform((prev) => ({ ...prev, zoom: 1, offsetX: 0, offsetY: 0 }))

  const fillFrame = () => {
    if (!image) return
    const coverZoom = getCoverZoom(image, outputWidth, outputHeight, transform.rotation)
    setTransform((prev) => ({ ...prev, zoom: clamp(coverZoom, MIN_ZOOM, MAX_ZOOM), offsetX: 0, offsetY: 0 }))
  }

  const rotate = (direction: 1 | -1) => {
    setTransform((prev) => ({
      ...prev,
      rotation: (prev.rotation + direction * 90 + 360) % 360,
      offsetX: 0,
      offsetY: 0,
    }))
  }

  const resetAll = () => {
    if (image) initializeFor(image)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    // Convert CSS movement into output-pixel movement so dragging tracks the cursor.
    const ratioX = outputWidth / rect.width
    const ratioY = outputHeight / rect.height
    const deltaX = (event.clientX - drag.x) * ratioX
    const deltaY = (event.clientY - drag.y) * ratioY

    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    setTransform((prev) => ({ ...prev, offsetX: prev.offsetX + deltaX, offsetY: prev.offsetY + deltaY }))
  }

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    }
  }

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !open) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
      setTransform((prev) => ({ ...prev, zoom: clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM) }))
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [open, image, loading])

  const handleApply = async () => {
    const canvas = canvasRef.current
    if (!canvas || !image) return

    try {
      setApplying(true)
      setApplyError(null)

      const blob = await canvasToBlob(canvas, mimeType, quality)

      if (blob.size > maxFileSizeBytes) {
        setApplyError(
          tr(
            `The result is ${formatBytes(blob.size)}, over the ${formatBytes(maxFileSizeBytes)} limit. Reduce the size or quality.`,
            `Hasilnya ${formatBytes(blob.size)}, melebihi batas ${formatBytes(maxFileSizeBytes)}. Kecilkan ukuran atau kualitasnya.`
          )
        )
        return
      }

      const outputFile = new File([blob], buildOutputFileName(sourceName, mimeType), {
        type: mimeType,
        lastModified: Date.now(),
      })

      await onApply(outputFile)
    } catch {
      setApplyError(tr('Failed to process this image', 'Gagal memproses gambar ini'))
    } finally {
      setApplying(false)
    }
  }

  if (!open) return null

  const zoomPercent = Math.round(transform.zoom * 100)
  const overLimit = estimatedBytes !== null && estimatedBytes > maxFileSizeBytes

  const aspectOptions: { id: string; label: string; value: number | null }[] = [
    { id: 'free', label: tr('Free', 'Bebas'), value: null },
    { id: 'square', label: tr('1:1', '1:1'), value: 1 },
    { id: 'landscape43', label: tr('4:3', '4:3'), value: 4 / 3 },
    { id: 'portrait34', label: tr('3:4', '3:4'), value: 3 / 4 },
    { id: 'wide169', label: tr('16:9', '16:9'), value: 16 / 9 },
    { id: 'story916', label: tr('9:16', '9:16'), value: 9 / 16 },
  ]

  const activeAspectId = aspect
    ? aspectOptions.find((option) => option.value && Math.abs(option.value - aspect) < 0.01)?.id || 'custom'
    : 'free'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-black">
              {title || tr('Adjust image size', 'Sesuaikan ukuran gambar')}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {description ||
                tr(
                  'Drag to reposition, zoom, and set the exact export size. The preview is exactly what gets published.',
                  'Geser untuk memindahkan, zoom, dan atur ukuran ekspor persis. Preview ini sama persis dengan yang dipublikasikan.'
                )}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-black disabled:opacity-40"
            aria-label={tr('Close editor', 'Tutup editor')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 p-5">
          {/* Live preview */}
          <div>
            <div
              className="rounded-xl border border-gray-300 p-3 flex items-center justify-center min-h-64"
              style={CHECKERBOARD_STYLE}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
              ) : loadError ? (
                <p className="text-sm text-red-600 py-10">{loadError}</p>
              ) : (
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="max-h-[55vh] max-w-full touch-none cursor-grab active:cursor-grabbing rounded shadow-sm"
                />
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5" />
              {tr('Drag the image to reposition, scroll to zoom.', 'Seret gambar untuk memindahkan, scroll untuk zoom.')}
            </p>

            {image && (
              <p className="mt-1 text-xs text-gray-500">
                {tr('Original', 'Asli')}: {image.naturalWidth} x {image.naturalHeight} px
                {' • '}
                {tr('Export', 'Ekspor')}: {outputWidth} x {outputHeight} px
                {estimatedBytes !== null ? ` • ${tr('Approx.', 'Sekitar')} ${formatBytes(estimatedBytes)}` : ''}
              </p>
            )}

            {tainted && (
              <p className="mt-2 text-xs text-yellow-700">
                {tr(
                  'This image cannot be re-encoded from its current URL. Upload the file again to resize it.',
                  'Gambar ini tidak bisa diproses ulang dari URL-nya. Unggah ulang filenya untuk mengubah ukuran.'
                )}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                {tr('Export size (px)', 'Ukuran ekspor (px)')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={outputWidth}
                  min={MIN_OUTPUT_DIMENSION}
                  max={maxOutputDimension}
                  onChange={(event) => handleWidthChange(Number(event.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                  aria-label={tr('Width in pixels', 'Lebar dalam piksel')}
                />
                <span className="text-gray-400 text-sm">×</span>
                <input
                  type="number"
                  value={outputHeight}
                  min={MIN_OUTPUT_DIMENSION}
                  max={maxOutputDimension}
                  onChange={(event) => handleHeightChange(Number(event.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                  aria-label={tr('Height in pixels', 'Tinggi dalam piksel')}
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {[50, 75, 150].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => handleScalePercent(percent)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                  >
                    {percent}%
                  </button>
                ))}
                {recommendedWidth && recommendedHeight && (
                  <button
                    type="button"
                    onClick={() => applyOutputSize(recommendedWidth, recommendedHeight)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                  >
                    {tr('Recommended', 'Rekomendasi')}
                  </button>
                )}
                {image && !aspectLock && (
                  <button
                    type="button"
                    onClick={() => {
                      setAspect(image.naturalWidth / image.naturalHeight)
                      applyOutputSize(
                        Math.min(image.naturalWidth, maxOutputDimension),
                        Math.min(image.naturalWidth, maxOutputDimension) /
                          (image.naturalWidth / image.naturalHeight)
                      )
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                  >
                    {tr('Original size', 'Ukuran asli')}
                  </button>
                )}
              </div>
            </div>

            {!aspectLock && (
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  {tr('Aspect ratio', 'Rasio aspek')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {aspectOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleAspectChange(option.value)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition ${
                        activeAspectId === option.id
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 text-black hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                {tr('Zoom', 'Zoom')} · {zoomPercent}%
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom(transform.zoom / 1.15)}
                  className="rounded-lg border border-gray-300 p-2 text-black hover:bg-gray-50"
                  aria-label={tr('Zoom out', 'Perkecil')}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={transform.zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-black"
                  aria-label={tr('Zoom level', 'Tingkat zoom')}
                />
                <button
                  type="button"
                  onClick={() => setZoom(transform.zoom * 1.15)}
                  className="rounded-lg border border-gray-300 p-2 text-black hover:bg-gray-50"
                  aria-label={tr('Zoom in', 'Perbesar')}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={fitWhole}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  {tr('Fit whole image', 'Muat seluruh gambar')}
                </button>
                <button
                  type="button"
                  onClick={fillFrame}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  {tr('Fill frame', 'Penuhi bingkai')}
                </button>
                <button
                  type="button"
                  onClick={() => rotate(-1)}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {tr('Rotate left', 'Putar kiri')}
                </button>
                <button
                  type="button"
                  onClick={() => rotate(1)}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  {tr('Rotate right', 'Putar kanan')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                {tr('Empty area', 'Area kosong')}
              </label>
              <div className="flex items-center gap-2">
                {BACKGROUND_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setBackground(swatch)}
                    style={swatch === TRANSPARENT_BACKGROUND ? CHECKERBOARD_STYLE : { backgroundColor: swatch }}
                    className={`h-8 w-8 rounded-lg border-2 transition ${
                      background === swatch ? 'border-black' : 'border-gray-300'
                    }`}
                    aria-label={
                      swatch === TRANSPARENT_BACKGROUND
                        ? tr('Transparent background', 'Latar transparan')
                        : tr('Solid background colour', 'Warna latar solid')
                    }
                  />
                ))}
                <input
                  type="color"
                  value={background === TRANSPARENT_BACKGROUND ? '#ffffff' : background}
                  onChange={(event) => setBackground(event.target.value)}
                  className="h-8 w-10 rounded border border-gray-300 bg-white"
                  aria-label={tr('Pick a custom background colour', 'Pilih warna latar kustom')}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {tr('Used when the image does not fill the whole frame.', 'Dipakai saat gambar tidak memenuhi seluruh bingkai.')}
              </p>
            </div>

            {qualityEnabled && (
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  {tr('Quality', 'Kualitas')} · {Math.round(quality * 100)}%
                </label>
                <input
                  type="range"
                  min={0.4}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="w-full accent-black"
                  aria-label={tr('Export quality', 'Kualitas ekspor')}
                />
              </div>
            )}

            <button
              type="button"
              onClick={resetAll}
              className="text-xs text-gray-600 underline hover:text-black"
            >
              {tr('Reset all adjustments', 'Atur ulang semua penyesuaian')}
            </button>
          </div>
        </div>

        {(overLimit || applyError) && (
          <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {applyError ||
              tr(
                `Result is ${formatBytes(estimatedBytes || 0)}, over the ${formatBytes(maxFileSizeBytes)} limit.`,
                `Hasilnya ${formatBytes(estimatedBytes || 0)}, melebihi batas ${formatBytes(maxFileSizeBytes)}.`
              )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-black hover:bg-gray-50 disabled:opacity-50"
          >
            {tr('Cancel', 'Batal')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !image || !!loadError || tainted}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-sm text-white hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            {applying ? tr('Applying...', 'Menerapkan...') : tr('Apply & upload', 'Terapkan & unggah')}
          </button>
        </div>
      </div>
    </div>
  )
}
