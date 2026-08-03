export type CategoryRow = {
  id: string
  name: string
  name_id?: string | null
  description?: string | null
}

/**
 * Products store their category as a plain string (`products.category`), not a
 * foreign key, so translating it means looking up the matching row in the
 * categories table by name rather than reading a joined field.
 */
export const getCategoryLabel = (
  categoryName: string,
  categories: CategoryRow[],
  language: 'en' | 'id'
): string => {
  if (language !== 'id') return categoryName

  const match = categories.find((c) => c.name === categoryName)
  return match?.name_id || categoryName
}
