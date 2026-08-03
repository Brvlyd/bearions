'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { CategoryRow } from '@/lib/categories'

const CategoryContext = createContext<CategoryRow[]>([])

/** The live `categories` table, fetched once for the whole tree so every
 *  storefront component that displays a category name can translate it
 *  without re-querying. */
export const useCategories = () => useContext(CategoryContext)

export default function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryRow[]>([])

  useEffect(() => {
    let isMounted = true

    // select('*') on purpose: name_id may not exist yet on stores that haven't
    // run the add-category-name-id migration. Selecting it by name would make
    // this query fail outright and blank out the whole category list.
    supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted || error || !data) return
        setCategories(data)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return <CategoryContext.Provider value={categories}>{children}</CategoryContext.Provider>
}
