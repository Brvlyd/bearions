import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/ProductDetailClient'
import { productService } from '@/lib/products'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  try {
    const product = await productService.getProductById(id)
    const initialImages = await productService.getProductImageUrls(id, product.image_url)

    return <ProductDetailClient product={product} initialImages={initialImages} />
  } catch (error) {
    console.error('Error loading product detail:', error)
    notFound()
  }
}
