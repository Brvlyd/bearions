'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Order, OrderItem, ShippingAddress, supabase } from '@/lib/supabase'
import { orderService } from '@/lib/orders'
import { useLanguage } from '@/lib/i18n'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Printer } from 'lucide-react'

// Biteship has no label/PDF API — this page IS the resi, rendered from data
// captured when the shipment was booked (app/api/admin/orders/[id]/shipment)
// plus the order's own checkout-time shipping snapshot. Printed via the
// browser's native print dialog; the isolate rule below hides the dashboard
// chrome (sidebar/header) so only the .resi-print box ends up on paper.

type OriginInfo = {
  site_title: string
  shipping_origin_label: string | null
  shipping_origin_address: string | null
  shipping_origin_city: string | null
  shipping_origin_province: string | null
  shipping_origin_postal_code: string | null
  shipping_origin_contact_name: string | null
  shipping_origin_contact_phone: string | null
}

export default function OrderResiPage() {
  const params = useParams()
  const router = useRouter()
  const { tr } = useLanguage()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [origin, setOrigin] = useState<OriginInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (orderId) loadData()
  }, [orderId])

  const loadData = async () => {
    try {
      setLoading(true)

      const orderData = await orderService.getOrderById(orderId)
      if (!orderData || !orderData.biteship_order_id) {
        setNotFound(true)
        return
      }
      setOrder(orderData)

      const items = await orderService.getOrderItems(orderId)
      setOrderItems(items)

      if (orderData.shipping_address_id) {
        const { data: address } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('id', orderData.shipping_address_id)
          .single()
        if (address) setShippingAddress(address)
      }

      const { data: settings } = await supabase
        .from('site_settings')
        .select('site_title, shipping_origin_label, shipping_origin_address, shipping_origin_city, shipping_origin_province, shipping_origin_postal_code, shipping_origin_contact_name, shipping_origin_contact_phone')
        .eq('id', 1)
        .maybeSingle()
      if (settings) setOrigin(settings as OriginInfo)
    } catch (error) {
      console.error('Error loading resi:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner fullScreen label={tr('Loading...', 'Memuat...')} />

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-700">
          {tr(
            'This order has no Biteship shipment yet. Create one from the order page first.',
            'Order ini belum punya pengiriman Biteship. Buat dulu dari halaman order.'
          )}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/admin/dashboard/orders/${orderId}`)}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
        >
          {tr('Back to order', 'Kembali ke order')}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .resi-print, .resi-print * { visibility: visible; }
          .resi-print { position: absolute; top: 0; left: 0; width: 100%; margin: 0; box-shadow: none; }
        }
      `}</style>

      <div className="max-w-md mx-auto mb-4 print:hidden flex justify-between items-center">
        <button
          type="button"
          onClick={() => router.push(`/admin/dashboard/orders/${orderId}`)}
          className="text-sm text-gray-600 hover:text-black"
        >
          {tr('Back', 'Kembali')}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <Printer className="w-4 h-4" />
          {tr('Print', 'Cetak')}
        </button>
      </div>

      <div className="resi-print max-w-md mx-auto bg-white border-2 border-black rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
          <span className="font-extrabold text-xl">{origin?.site_title?.split(' - ')[0] || 'Bearion'}</span>
          <span className="text-xs font-medium">{order.order_number}</span>
        </div>

        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            {tr('From', 'Dari')}
          </p>
          <p className="text-sm font-semibold">
            {origin?.shipping_origin_contact_name || origin?.shipping_origin_label || '-'}
          </p>
          <p className="text-sm">{origin?.shipping_origin_contact_phone || '-'}</p>
          <p className="text-sm">
            {[origin?.shipping_origin_address, origin?.shipping_origin_city, origin?.shipping_origin_province, origin?.shipping_origin_postal_code]
              .filter(Boolean)
              .join(', ') || '-'}
          </p>
        </div>

        <div className="mb-3 pt-3 border-t border-dashed border-gray-300">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            {tr('To', 'Kepada')}
          </p>
          <p className="text-sm font-semibold">{shippingAddress?.recipient_name || order.customer_name}</p>
          <p className="text-sm">{shippingAddress?.phone || order.customer_phone}</p>
          <p className="text-sm">
            {shippingAddress
              ? [
                  shippingAddress.address_line1,
                  shippingAddress.address_line2,
                  shippingAddress.city,
                  shippingAddress.province,
                  shippingAddress.postal_code,
                ]
                  .filter(Boolean)
                  .join(', ')
              : '-'}
          </p>
        </div>

        <div className="my-4 py-3 border-y-2 border-black text-center">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">
            {order.courier || '-'} — {order.shipping_service_name || '-'}
          </p>
          <p className="text-2xl font-mono font-extrabold tracking-widest mt-1">
            {order.tracking_number || '-'}
          </p>
        </div>

        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            {tr('Items', 'Barang')}
          </p>
          <ul className="text-sm space-y-0.5">
            {orderItems.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {item.quantity}x {item.product_name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-dashed border-gray-300 flex justify-between text-xs text-gray-500">
          <span>
            {order.shipping_weight_grams ? `${(order.shipping_weight_grams / 1000).toFixed(2)} kg` : ''}
          </span>
          <span>{new Date(order.created_at).toLocaleDateString('id-ID')}</span>
        </div>
      </div>
    </div>
  )
}
