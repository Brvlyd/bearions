'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Package, Truck, CheckCircle, MapPin, CreditCard, Clock } from 'lucide-react'
import { orderService } from '@/lib/orders'
import { paymentService } from '@/lib/payments'
import type { Order, OrderItem, Payment } from '@/lib/supabase'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderNumber = params.orderNumber as string

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderNumber) {
      loadOrderDetails()
    }
  }, [orderNumber])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      const orderData = await orderService.getOrderByNumber(orderNumber)
      
      if (!orderData) {
        router.push('/orders')
        return
      }

      setOrder(orderData)

      const [items, paymentData] = await Promise.all([
        orderService.getOrderItems(orderData.id),
        paymentService.getPaymentByOrderId(orderData.id),
      ])

      setOrderItems(items)
      setPayment(paymentData)
    } catch (error) {
      console.error('Error loading order details:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusSteps = () => {
    if (!order) return []

    const steps = [
      { key: 'pending', label: 'Order Placed', icon: Package, date: order.created_at },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, date: order.confirmed_at },
      { key: 'processing', label: 'Processing', icon: Package, date: null },
      { key: 'shipped', label: 'Shipped', icon: Truck, date: order.shipped_at },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle, date: order.delivered_at },
    ]

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
    const currentIndex = statusOrder.indexOf(order.status)

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Order not found</h1>
          <Link href="/orders" className="text-gray-600 hover:text-black">
            ← Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const statusSteps = getStatusSteps()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Orders
        </Link>

        {/* Order Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-black mb-2">
                Order #{order.order_number}
              </h1>
              <p className="text-gray-600">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                order.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                Payment: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
              </span>
            </div>
          </div>

          {/* Order Status Timeline */}
          {order.status !== 'cancelled' && (
            <div className="relative">
              <div className="flex justify-between">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        step.completed ? 'bg-green-500 text-white' :
                        step.current ? 'bg-blue-500 text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <p className={`text-xs font-medium text-center ${
                        step.completed || step.current ? 'text-black' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(step.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(statusSteps.filter(s => s.completed).length / statusSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-black mb-4">Order Items</h2>
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                      {item.product_image_url ? (
                        <Image
                          src={item.product_image_url}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-black">{item.product_name}</h3>
                      <div className="flex gap-4 mt-1 text-sm text-gray-600">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <p className="mt-2 font-bold text-black">{formatPrice(item.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            {order.tracking_number && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
                  <Truck className="w-6 h-6" />
                  Shipping Information
                </h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Tracking Number</p>
                    <p className="font-medium text-black">{order.tracking_number}</p>
                  </div>
                  {order.courier && (
                    <div>
                      <p className="text-sm text-gray-600">Courier</p>
                      <p className="font-medium text-black">{order.courier}</p>
                    </div>
                  )}
                  {order.estimated_delivery && (
                    <div>
                      <p className="text-sm text-gray-600">Estimated Delivery</p>
                      <p className="font-medium text-black">
                        {formatDate(order.estimated_delivery)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-black mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-black">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Payment
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium text-black capitalize">
                    {order.payment_method?.replace('_', ' ') || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                    order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    order.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </span>
                </div>
                {payment?.paid_at && (
                  <div>
                    <p className="text-sm text-gray-600">Paid At</p>
                    <p className="font-medium text-black">{formatDate(payment.paid_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Notes */}
            {order.customer_notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-black mb-4">Order Notes</h2>
                <p className="text-gray-600">{order.customer_notes}</p>
              </div>
            )}

            {/* Need Help */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-black mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Contact our customer service for any questions about your order.
              </p>
              <Link
                href="/contact"
                className="inline-block w-full text-center bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
