import CatalogView from '@/components/CatalogView'

export const metadata = {
  title: 'Catalog - Bearions',
  description: 'Browse our collection of premium clothing',
}

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-white pt-16">
      <CatalogView />
    </div>
  )
}
