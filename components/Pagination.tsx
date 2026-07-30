'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Optional "showing x-y of z" summary */
  firstItemIndex?: number
  lastItemIndex?: number
  totalItems?: number
  /** Noun used in the summary, e.g. { en: 'products', id: 'produk' } */
  itemLabel?: { en: string; id: string }
  className?: string
  /** Scroll target after a page change; defaults to the pagination bar itself */
  scrollTargetId?: string
}

const DOTS = 'dots' as const

type PageEntry = number | typeof DOTS

/**
 * Builds a compact page list: first, last, and a window around the current
 * page, with ellipsis for the gaps. Keeps the bar a fixed width no matter
 * how many pages exist.
 */
function buildPageEntries(page: number, totalPages: number): PageEntry[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const entries: PageEntry[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) entries.push(DOTS)
  for (let i = start; i <= end; i++) entries.push(i)
  if (end < totalPages - 1) entries.push(DOTS)

  entries.push(totalPages)
  return entries
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  firstItemIndex,
  lastItemIndex,
  totalItems,
  itemLabel,
  className = '',
  scrollTargetId
}: PaginationProps) {
  const { tr, language } = useLanguage()

  if (totalPages <= 1) return null

  const goTo = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages)
    if (clamped === page) return
    onPageChange(clamped)

    if (typeof window !== 'undefined') {
      const target = scrollTargetId ? document.getElementById(scrollTargetId) : null
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const entries = buildPageEntries(page, totalPages)
  const noun = itemLabel ? (language === 'en' ? itemLabel.en : itemLabel.id) : ''
  const showSummary =
    typeof firstItemIndex === 'number' &&
    typeof lastItemIndex === 'number' &&
    typeof totalItems === 'number'

  const navButton =
    'inline-flex items-center justify-center min-w-11 h-11 px-3 rounded-lg border border-gray-200 bg-white text-black transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white'

  return (
    <nav
      aria-label={tr('Pagination', 'Paginasi')}
      className={`mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {showSummary ? (
        <p className="text-sm text-gray-600 text-center sm:text-left">
          {tr(
            `Showing ${firstItemIndex}-${lastItemIndex} of ${totalItems} ${noun}`.trim(),
            `Menampilkan ${firstItemIndex}-${lastItemIndex} dari ${totalItems} ${noun}`.trim()
          )}
        </p>
      ) : (
        <span />
      )}

      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className={navButton}
          aria-label={tr('Previous page', 'Halaman sebelumnya')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Compact indicator on small screens */}
        <span className="sm:hidden px-3 text-sm font-medium text-black whitespace-nowrap">
          {tr(`Page ${page} of ${totalPages}`, `Halaman ${page} dari ${totalPages}`)}
        </span>

        {/* Numbered pages from sm upwards */}
        <div className="hidden sm:flex items-center gap-1">
          {entries.map((entry, index) =>
            entry === DOTS ? (
              <span
                key={`dots-${index}`}
                className="inline-flex items-center justify-center w-8 h-11 text-gray-400 select-none"
              >
                ...
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => goTo(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={`inline-flex items-center justify-center min-w-11 h-11 px-3 rounded-lg border transition font-medium ${
                  entry === page
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-200 hover:bg-gray-50'
                }`}
              >
                {entry}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className={navButton}
          aria-label={tr('Next page', 'Halaman berikutnya')}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}
