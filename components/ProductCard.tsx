'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/supabase'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group cursor-pointer">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1 group-hover:text-gray-600 transition">
          {product.name}
        </h3>
        <p className="text-black font-bold">{formatPrice(product.price)}</p>
        <p className="text-sm text-gray-500 mt-1">Stock: {product.stock}</p>
      </div>
    </Link>
  )
}
