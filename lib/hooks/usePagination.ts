'use client'

import { useCallback, useMemo, useState } from 'react'

interface UsePaginationResult<T> {
  page: number
  setPage: (page: number) => void
  totalPages: number
  pageItems: T[]
  /** 1-based index of the first item on the current page (0 when empty) */
  firstItemIndex: number
  /** 1-based index of the last item on the current page (0 when empty) */
  lastItemIndex: number
  totalItems: number
}

/**
 * Client-side pagination over an already filtered/sorted array.
 *
 * The page is clamped while deriving, not stored clamped, so a list that
 * shrinks (a filter was applied, a row was deleted) never strands the user on
 * an empty page and no state sync effect is needed.
 */
export function usePagination<T>(items: T[], pageSize: number): UsePaginationResult<T> {
  const [requestedPage, setRequestedPage] = useState(1)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(Math.max(requestedPage, 1), totalPages)

  // Stable identity: callers list it in effect deps to reset on filter changes.
  const setPage = useCallback((nextPage: number) => {
    setRequestedPage(Math.max(1, nextPage))
  }, [])

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  )

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    firstItemIndex: totalItems === 0 ? 0 : (page - 1) * pageSize + 1,
    lastItemIndex: Math.min(page * pageSize, totalItems),
    totalItems
  }
}
