import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/ProductDetailClient'
import { productService } from '@/lib/products'
import { productColorService } from '@/lib/product-colors'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Loading is what can throw, so only that sits in the try — notFound() works
  // by throwing too, and catching it here would turn a missing product into a
  // generic error page.
  let data: Awaited<ReturnType<typeof loadProductDetail>>

  try {
    data = await loadProductDetail(id)
  } catch (error) {
    console.error('Error loading product detail:', error)
    notFound()
  }

  return (
    <ProductDetailClient
      product={data.product}
      initialImages={data.initialImages}
      initialColors={data.initialColors}
    />
  )
}

async function loadProductDetail(id: string) {
  const product = await productService.getProductById(id)
  const [initialImages, initialColors] = await Promise.all([
    productService.getProductImageUrls(id, product.image_url),
    productColorService.getColorsForProduct(id),
  ])

  return { product, initialImages, initialColors }
}
