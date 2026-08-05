'use client'

import { useEffect } from 'react'
import { Check, X } from 'lucide-react'
import SafeImage from './SafeImage'
import { useLanguage } from '@/lib/i18n'
import type { ColorOption } from '@/lib/product-colors'

interface ColorPreviewModalProps {
  color: ColorOption
  productName: string
  category?: string
  /** True when this colour is already the selected one on the page behind. */
  selected: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Shows the garment in the colour the shopper just tapped. Opened only for
 * colours that actually have a photo — a colour without one selects silently
 * rather than popping an empty frame.
 */
export default function ColorPreviewModal({
  color,
  productName,
  category,
  selected,
  onConfirm,
  onClose,
}: ColorPreviewModalProps) {
  const { tr } = useLanguage()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-51 flex items-center justify-center p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} — ${color.label}`}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('Close', 'Tutup')}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-black shadow-lg ring-1 ring-black/5 backdrop-blur-md transition hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative aspect-square w-full bg-gray-50">
            <SafeImage
              src={color.imageUrl}
              alt={`${productName} — ${color.label}`}
              fill
              category={category}
              objectFit="contain"
              sizes="(max-width: 768px) 100vw, 28rem"
            />
          </div>

          <div className="flex items-center gap-3 border-t border-gray-200 p-4">
            <span
              aria-hidden="true"
              className="h-8 w-8 shrink-0 rounded-full border border-black/10 shadow-inner"
              style={{ backgroundColor: color.hex || '#e5e7eb' }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-black">{color.label}</p>
              <p className="truncate text-sm text-gray-500">{productName}</p>
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={onConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 font-semibold text-white transition hover:bg-gray-800"
            >
              <Check className="h-4 w-4" />
              {selected
                ? tr('Keep this color', 'Pakai warna ini')
                : tr('Choose this color', 'Pilih warna ini')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
