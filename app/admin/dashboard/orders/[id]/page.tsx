'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Order, OrderItem, ShippingAddress } from '@/lib/supabase'
import { orderService } from '@/lib/orders'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import Image from 'next/image'
import Link from 'next/link'
import { 
  ArrowLeft, User, Mail, Phone, MapPin, Package, DollarSign, 
  Clock, CheckCircle, XCircle, Truck, CreditCard, Calendar,
  Edit, Save, AlertCircle, Copy, Check
} from 'lucide-react'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { tr } = useLanguage()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editStatus, setEditStatus] = useState<Order['status']>('pending')
  const [editPaymentStatus, setEditPaymentStatus] = useState<Order['payment_status']>('unpaid')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [courier, setCourier] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      
      // Load order
      const orderData = await orderService.getOrderById(orderId)
      if (!orderData) {
        alert(tr('Order not found', 'Pesanan tidak ditemukan'))
        router.push('/admin/dashboard/orders')
        return
      }
      setOrder(orderData)
      setEditStatus(orderData.status)
      setEditPaymentStatus(orderData.payment_status)
      setTrackingNumber(orderData.tracking_number || '')
      setCourier(orderData.courier || '')

      // Load order items
      const items = await orderService.getOrderItems(orderId)
      setOrderItems(items)

      // Load shipping address if exists
      if (orderData.shipping_address_id) {
        const { data: address } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('id', orderData.shipping_address_id)
          .single()
        
        if (address) {
          setShippingAddress(address)
        }
      }
    } catch (error) {
      console.error('Error loading order details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!order) return

    try {
      setSaving(true)

      // Update status if changed
      if (editStatus !== order.status) {
        await orderService.updateOrderStatus(orderId, editStatus)
      }

      // Update payment status if changed
      if (editPaymentStatus !== order.payment_status) {
        await orderService.updatePaymentStatus(orderId, editPaymentStatus)
      }

      // Update tracking info if provided
      if (trackingNumber && courier) {
        await orderService.updateTrackingInfo(orderId, trackingNumber, courier)
      }

      alert(tr('Order updated successfully!', 'Pesanan berhasil diperbarui!'))
      setEditMode(false)
      await loadOrderDetails()
    } catch (error) {
      console.error('Error updating order:', error)
      alert(tr('Failed to update order', 'Gagal memperbarui pesanan'))
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'email' | 'phone' | 'address') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'email') {
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      } else if (type === 'phone') {
        setCopiedPhone(true)
        setTimeout(() => setCopiedPhone(false), 2000)
      } else if (type === 'address') {
        setCopiedAddress(true)
        setTimeout(() => setCopiedAddress(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
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
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { label: tr('Pending', 'Menunggu'), color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: tr('Confirmed', 'Dikonfirmasi'), color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      processing: { label: tr('Processing', 'Diproses'), color: 'bg-purple-100 text-purple-800', icon: Package },
      shipped: { label: tr('Shipped', 'Dikirim'), color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      delivered: { label: tr('Delivered', 'Terkirim'), color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: tr('Cancelled', 'Dibatalkan'), color: 'bg-red-100 text-red-800', icon: XCircle },
      refunded: { label: tr('Refunded', 'Dikembalikan'), color: 'bg-gray-100 text-gray-800', icon: DollarSign }
    }
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  const getPaymentBadge = (status: Order['payment_status']) => {
    const statusConfig = {
      unpaid: { label: tr('Unpaid', 'Belum Dibayar'), color: 'bg-gray-100 text-gray-800' },
      pending: { label: tr('Pending', 'Menunggu'), color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: tr('Paid', 'Lunas'), color: 'bg-green-100 text-green-800' },
      failed: { label: tr('Failed', 'Gagal'), color: 'bg-red-100 text-red-800' },
      refunded: { label: tr('Refunded', 'Dikembalikan'), color: 'bg-purple-100 text-purple-800' }
    }
    const config = statusConfig[status] || statusConfig.unpaid
    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">{tr('Loading order details...', 'Memuat detail pesanan...')}</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <p className="text-xl text-gray-700 mb-4">{tr('Order not found', 'Pesanan tidak ditemukan')}</p>
        <Link href="/admin/dashboard/orders" className="text-blue-600 hover:underline">
          {tr('Back to Orders', 'Kembali ke Pesanan')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-black">{tr('Order Details', 'Detail Pesanan')}</h2>
            <p className="text-gray-600 font-mono">{order.order_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Edit className="w-4 h-4" />
              {tr('Edit Order', 'Ubah Pesanan')}
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {tr('Cancel', 'Batal')}
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? tr('Saving...', 'Menyimpan...') : tr('Save Changes', 'Simpan Perubahan')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alert untuk order yang sudah dibayar tapi belum dikirim */}
      {order.payment_status === 'paid' && !['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status) && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-lg mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">{tr('Ready to Ship', 'Siap Dikirim')}</h3>
              <p className="text-orange-800 mb-3">
                {tr('This order has been paid and is waiting to be shipped. Please process the shipment and update the tracking information below.', 'Pesanan ini sudah dibayar dan menunggu pengiriman. Silakan proses pengiriman dan perbarui informasi pelacakan di bawah.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditMode(true)
                    setEditStatus('processing')
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  {tr('Mark as Processing', 'Tandai Sedang Diproses')}
                </button>
                <button
                  onClick={() => {
                    setEditMode(true)
                    setEditStatus('shipped')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {tr('Mark as Shipped', 'Tandai Sudah Dikirim')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">{tr('Order Status', 'Status Pesanan')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">{tr('Order Status', 'Status Pesanan')}</label>
                {editMode ? (
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Order['status'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  >
                    <option value="pending">{tr('Pending', 'Menunggu')}</option>
                    <option value="confirmed">{tr('Confirmed', 'Dikonfirmasi')}</option>
                    <option value="processing">{tr('Processing', 'Diproses')}</option>
                    <option value="shipped">{tr('Shipped', 'Dikirim')}</option>
                    <option value="delivered">{tr('Delivered', 'Terkirim')}</option>
                    <option value="cancelled">{tr('Cancelled', 'Dibatalkan')}</option>
                    <option value="refunded">{tr('Refunded', 'Dikembalikan')}</option>
                  </select>
                ) : (
                  <div>{getStatusBadge(order.status)}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">{tr('Payment Status', 'Status Pembayaran')}</label>
                {editMode ? (
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as Order['payment_status'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  >
                    <option value="unpaid">{tr('Unpaid', 'Belum Dibayar')}</option>
                    <option value="pending">{tr('Pending', 'Menunggu')}</option>
                    <option value="paid">{tr('Paid', 'Lunas')}</option>
                    <option value="failed">{tr('Failed', 'Gagal')}</option>
                    <option value="refunded">{tr('Refunded', 'Dikembalikan')}</option>
                  </select>
                ) : (
                  <div>{getPaymentBadge(order.payment_status)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className={`bg-white rounded-lg p-6 ${
            order.payment_status === 'paid' && !['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)
              ? 'border-2 border-orange-300 shadow-lg'
              : 'border border-gray-200'
          }`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black">
              <User className="w-5 h-5" />
              {tr('Customer Information', 'Informasi Pelanggan')}
              {order.payment_status === 'paid' && !['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status) && (
                <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                  {tr('Ready to Process', 'Siap Diproses')}
                </span>
              )}
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{tr('Name', 'Nama')}</p>
                  <p className="font-medium text-black">{order.customer_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{tr('Email', 'Email')}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-black">{order.customer_email}</p>
                    <button
                      onClick={() => copyToClipboard(order.customer_email, 'email')}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title={tr('Copy email', 'Salin email')}
                    >
                      {copiedEmail ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{tr('Phone', 'Telepon')}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-black">{order.customer_phone}</p>
                    <button
                      onClick={() => copyToClipboard(order.customer_phone, 'phone')}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title={tr('Copy phone', 'Salin telepon')}
                    >
                      {copiedPhone ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {shippingAddress && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center justify-between text-black">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {tr('Shipping Address', 'Alamat Pengiriman')}
                </div>
                <button
                  onClick={() => {
                    const fullAddress = `${shippingAddress.recipient_name}\n${shippingAddress.phone}\n${shippingAddress.address_line1}${shippingAddress.address_line2 ? '\n' + shippingAddress.address_line2 : ''}\n${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.postal_code}\n${shippingAddress.country}`
                    copyToClipboard(fullAddress, 'address')
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title={tr('Copy full address', 'Salin alamat lengkap')}
                >
                  {copiedAddress ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">{tr('Copied!', 'Tersalin!')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{tr('Copy', 'Salin')}</span>
                    </>
                  )}
                </button>
              </h3>
              <div className="space-y-2 text-gray-700">
                <p className="font-medium text-black">{shippingAddress.recipient_name}</p>
                <p>{shippingAddress.phone}</p>
                <p>{shippingAddress.address_line1}</p>
                {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                <p>{shippingAddress.city}, {shippingAddress.province} {shippingAddress.postal_code}</p>
                <p>{shippingAddress.country}</p>
                {shippingAddress.label && (
                  <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {shippingAddress.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tracking Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black">
              <Truck className="w-5 h-5" />
              {tr('Shipping & Tracking', 'Pengiriman & Pelacakan')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">{tr('Courier', 'Kurir')}</label>
                {editMode ? (
                  <input
                    type="text"
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    placeholder={tr('e.g., JNE, J&T, SiCepat', 'contoh: JNE, J&T, SiCepat')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                ) : (
                  <p className="text-black">{order.courier || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">{tr('Tracking Number', 'Nomor Resi')}</label>
                {editMode ? (
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder={tr('Enter tracking number', 'Masukkan nomor resi')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                ) : (
                  <p className="font-mono text-black">{order.tracking_number || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black">
              <Package className="w-5 h-5" />
              {tr('Order Items', 'Item Pesanan')}
            </h3>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {item.product_image_url ? (
                      <Image
                        src={item.product_image_url}
                        alt={item.product_name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-black">{item.product_name}</h4>
                    {item.product_sku && (
                      <p className="text-sm text-gray-600">SKU: {item.product_sku}</p>
                    )}
                    <div className="flex gap-4 mt-1 text-sm text-gray-600">
                      {item.size && <span>{tr('Size', 'Ukuran')}: {item.size}</span>}
                      {item.color && <span>{tr('Color', 'Warna')}: {item.color}</span>}
                      <span>{tr('Qty', 'Jumlah')}: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-black">{formatPrice(parseFloat(item.subtotal.toString()))}</p>
                    <p className="text-sm text-gray-600">{formatPrice(parseFloat(item.price.toString()))} {tr('each', 'per item')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.customer_notes && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold mb-2 text-black">{tr('Customer Notes', 'Catatan Pelanggan')}</h3>
              <p className="text-gray-700">{order.customer_notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">{tr('Order Summary', 'Ringkasan Pesanan')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>{tr('Subtotal', 'Subtotal')}</span>
                <span>{formatPrice(parseFloat(order.subtotal.toString()))}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>{tr('Shipping Cost', 'Biaya Pengiriman')}</span>
                <span>{formatPrice(parseFloat(order.shipping_cost.toString()))}</span>
              </div>
              {parseFloat(order.tax.toString()) > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>{tr('Tax', 'Pajak')}</span>
                  <span>{formatPrice(parseFloat(order.tax.toString()))}</span>
                </div>
              )}
              {parseFloat(order.discount.toString()) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{tr('Discount', 'Diskon')}</span>
                  <span>-{formatPrice(parseFloat(order.discount.toString()))}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg text-black">
                <span>{tr('Total', 'Total')}</span>
                <span>{formatPrice(parseFloat(order.total.toString()))}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black">
              <CreditCard className="w-5 h-5" />
              {tr('Payment Info', 'Info Pembayaran')}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">{tr('Payment Method', 'Metode Pembayaran')}</p>
                <p className="font-medium text-black capitalize">{order.payment_method?.replace('_', ' ') || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{tr('Payment Status', 'Status Pembayaran')}</p>
                <div className="mt-1">{getPaymentBadge(order.payment_status)}</div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black">
              <Calendar className="w-5 h-5" />
              {tr('Timeline', 'Linimasa')}
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">{tr('Created', 'Dibuat')}</p>
                <p className="font-medium text-black">{formatDate(order.created_at)}</p>
              </div>
              {order.confirmed_at && (
                <div>
                  <p className="text-gray-600">{tr('Confirmed', 'Dikonfirmasi')}</p>
                  <p className="font-medium text-black">{formatDate(order.confirmed_at)}</p>
                </div>
              )}
              {order.shipped_at && (
                <div>
                  <p className="text-gray-600">{tr('Shipped', 'Dikirim')}</p>
                  <p className="font-medium text-black">{formatDate(order.shipped_at)}</p>
                </div>
              )}
              {order.delivered_at && (
                <div>
                  <p className="text-gray-600">{tr('Delivered', 'Terkirim')}</p>
                  <p className="font-medium text-black">{formatDate(order.delivered_at)}</p>
                </div>
              )}
              {order.cancelled_at && (
                <div>
                  <p className="text-red-600">{tr('Cancelled', 'Dibatalkan')}</p>
                  <p className="font-medium text-black">{formatDate(order.cancelled_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
