'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Truck, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cartService } from '@/lib/cart'
import { orderService } from '@/lib/orders'
import { shippingService } from '@/lib/shipping'
import { paymentService } from '@/lib/payments'
import { useLanguage } from '@/lib/i18n'
import type { CartItem, ShippingAddress } from '@/lib/supabase'

type Step = 'shipping' | 'payment' | 'review'

export default function CheckoutPage() {
  const router = useRouter()
  const { tr } = useLanguage()
  const [currentStep, setCurrentStep] = useState<Step>('shipping')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  
  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Shipping
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Indonesia',
    label: 'Home',
    is_default: false,
  })
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer')
  const [customerNotes, setCustomerNotes] = useState('')
  
  // Processing
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?redirect=/checkout')
      return
    }

    setUserId(user.id)
    setUserEmail(user.email || '')
    loadData(user.id)
  }

  const loadData = async (uid: string) => {
    try {
      setLoading(true)
      const [items, userAddresses] = await Promise.all([
        cartService.getCartItems(uid),
        shippingService.getUserAddresses(uid),
      ])

      if (items.length === 0) {
        router.push('/cart')
        return
      }

      setCartItems(items)
      setAddresses(userAddresses)

      // Select default address or first address
      const defaultAddr = userAddresses.find((a) => a.is_default) || userAddresses[0]
      setSelectedAddress(defaultAddr || null)
    } catch (error) {
      console.error('Error loading checkout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAddress = async () => {
    if (!userId) return

    try {
      const address = await shippingService.createAddress(userId, newAddress)
      setAddresses([...addresses, address])
      setSelectedAddress(address)
      setShowAddressForm(false)
      setNewAddress({
        recipient_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'Indonesia',
        label: 'Home',
        is_default: false,
      })
    } catch (error) {
      console.error('Error adding address:', error)
      alert(tr('Failed to add address', 'Gagal menambahkan alamat'))
    }
  }

  const handlePlaceOrder = async () => {
    if (!userId || !selectedAddress) return

    try {
      setProcessing(true)

      const subtotal = cartItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0
      )
      const shippingCost = 15000
      const tax = subtotal * 0.11

      // Create order
      const order = await orderService.createOrder({
        userId,
        customerName: selectedAddress.recipient_name,
        customerEmail: userEmail,
        customerPhone: selectedAddress.phone,
        items: cartItems.map((item) => ({
          productId: item.product_id,
          productName: item.product?.name || '',
          productImageUrl: item.product?.image_url || null,
          quantity: item.quantity,
          size: item.size || undefined,
          color: item.color || undefined,
          price: item.product?.price || 0,
        })),
        shippingAddressId: selectedAddress.id,
        shippingCost,
        tax,
        discount: 0,
        paymentMethod,
        customerNotes,
      })

      // Create payment record
      await paymentService.createPayment({
        orderId: order.id,
        paymentMethod,
        amount: order.total,
        paymentGateway: 'manual',
      })

      // Clear cart
      await cartService.clearCart(userId)

      // My Orders page is removed, return users to cart with success state.
      router.push('/cart?checkout=success')
    } catch (error) {
      console.error('Error placing order:', error)
      alert(tr('Failed to place order. Please try again.', 'Gagal membuat pesanan. Silakan coba lagi.'))
    } finally {
      setProcessing(false)
    }
  }

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  )
  const shippingCost = 15000
  const tax = subtotal * 0.11
  const total = subtotal + shippingCost + tax

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 pt-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">{tr('Loading checkout...', 'Memuat checkout...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20 lg:pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition mb-4 lg:mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {tr('Back to Cart', 'Kembali ke Keranjang')}
        </Link>

        <h1 className="text-2xl lg:text-3xl font-bold text-black mb-6 lg:mb-8">{tr('Checkout', 'Checkout')}</h1>

        {/* Progress Steps */}
        <div className="mb-6 lg:mb-8 flex items-center justify-center gap-2 lg:gap-4">
          <div className="flex items-center gap-1 lg:gap-2">
            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-sm ${currentStep === 'shipping' ? 'bg-black text-white' : 'bg-green-500 text-white'}`}>
              {currentStep !== 'shipping' ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" /> : '1'}
            </div>
            <span className="font-medium text-sm lg:text-base hidden sm:inline">{tr('Shipping', 'Pengiriman')}</span>
          </div>
          <div className="w-6 lg:w-12 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-1 lg:gap-2">
            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-sm ${currentStep === 'payment' ? 'bg-black text-white' : currentStep === 'review' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {currentStep === 'review' ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" /> : '2'}
            </div>
            <span className="font-medium text-sm lg:text-base hidden sm:inline">{tr('Payment', 'Pembayaran')}</span>
          </div>
          <div className="w-6 lg:w-12 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-1 lg:gap-2">
            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-sm ${currentStep === 'review' ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>
              3
            </div>
            <span className="font-medium text-sm lg:text-base hidden sm:inline">{tr('Review', 'Tinjau')}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Shipping Step */}
            {currentStep === 'shipping' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
                <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
                  <Truck className="w-6 h-6" />
                  {tr('Shipping Address', 'Alamat Pengiriman')}
                </h2>

                {/* Address List */}
                <div className="space-y-3 mb-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => setSelectedAddress(address)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedAddress?.id === address.id
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-black">{address.recipient_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                          <p className="text-sm text-gray-600 mt-2">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.province} {address.postal_code}
                          </p>
                        </div>
                        {address.is_default && (
                          <span className="text-xs bg-black text-white px-2 py-1 rounded">
                            {tr('Default', 'Utama')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Address Form */}
                {showAddressForm ? (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-sm lg:text-base">{tr('Add New Address', 'Tambah Alamat Baru')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                      <input
                        type="text"
                        placeholder={tr('Recipient Name', 'Nama Penerima')}
                        value={newAddress.recipient_name}
                        onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="tel"
                        placeholder={tr('Phone', 'Telepon')}
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder={tr('Address Line 1', 'Alamat Baris 1')}
                        value={newAddress.address_line1}
                        onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder={tr('Address Line 2 (Optional)', 'Alamat Baris 2 (Opsional)')}
                        value={newAddress.address_line2}
                        onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder={tr('City', 'Kota')}
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder={tr('Province', 'Provinsi')}
                        value={newAddress.province}
                        onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder={tr('Postal Code', 'Kode Pos')}
                        value={newAddress.postal_code}
                        onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddAddress}
                        className="btn-primary-animated px-4 py-2"
                      >
                        {tr('Save Address', 'Simpan Alamat')}
                      </button>
                      <button
                        onClick={() => setShowAddressForm(false)}
                        className="btn-secondary-animated px-4 py-2"
                      >
                        {tr('Cancel', 'Batal')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="text-black hover:underline font-medium btn-animate"
                  >
                    + {tr('Add New Address', 'Tambah Alamat Baru')}
                  </button>
                )}

                <button
                  onClick={() => setCurrentStep('payment')}
                  disabled={!selectedAddress}
                  className="w-full mt-6 py-3 btn-primary-animated"
                >
                  {tr('Continue to Payment', 'Lanjut ke Pembayaran')}
                </button>
              </div>
            )}

            {/* Payment Step */}
            {currentStep === 'payment' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  {tr('Payment Method', 'Metode Pembayaran')}
                </h2>

                <div className="space-y-3 mb-6">
                  <div
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold">{tr('Bank Transfer', 'Transfer Bank')}</p>
                    <p className="text-sm text-gray-600">{tr('Pay via bank transfer', 'Bayar melalui transfer bank')}</p>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('e_wallet')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      paymentMethod === 'e_wallet'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold">{tr('E-Wallet', 'E-Wallet')}</p>
                    <p className="text-sm text-gray-600">{tr('GoPay, OVO, DANA, etc.', 'GoPay, OVO, DANA, dll.')}</p>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      paymentMethod === 'cod'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold">{tr('Cash on Delivery', 'Bayar di Tempat')}</p>
                    <p className="text-sm text-gray-600">{tr('Pay when you receive', 'Bayar saat barang diterima')}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep('shipping')}
                    className="btn-secondary-animated px-6 py-3"
                  >
                    {tr('Back', 'Kembali')}
                  </button>
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="flex-1 btn-primary-animated py-3"
                  >
                    {tr('Review Order', 'Tinjau Pesanan')}
                  </button>
                </div>
              </div>
            )}

            {/* Review Step */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                {/* Shipping Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold">{tr('Shipping Address', 'Alamat Pengiriman')}</h3>
                    <button
                      onClick={() => setCurrentStep('shipping')}
                      className="text-sm text-gray-600 hover:text-black btn-animate"
                    >
                      {tr('Edit', 'Ubah')}
                    </button>
                  </div>
                  {selectedAddress && (
                    <div>
                      <p className="font-medium">{selectedAddress.recipient_name}</p>
                      <p className="text-sm text-gray-600">{selectedAddress.phone}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedAddress.address_line1}
                        {selectedAddress.address_line2 && `, ${selectedAddress.address_line2}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedAddress.city}, {selectedAddress.province} {selectedAddress.postal_code}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold">{tr('Payment Method', 'Metode Pembayaran')}</h3>
                    <button
                      onClick={() => setCurrentStep('payment')}
                      className="text-sm text-gray-600 hover:text-black btn-animate"
                    >
                      {tr('Edit', 'Ubah')}
                    </button>
                  </div>
                  <p className="text-gray-600 capitalize">
                    {paymentMethod.replace('_', ' ')}
                  </p>
                </div>

                {/* Customer Notes */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold mb-3">{tr('Order Notes (Optional)', 'Catatan Pesanan (Opsional)')}</h3>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder={tr('Special instructions for your order...', 'Instruksi khusus untuk pesanan Anda...')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    rows={4}
                  />
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={processing}
                  className="w-full py-4 btn-primary-animated"
                >
                  {processing ? tr('Processing...', 'Memproses...') : tr('Place Order', 'Buat Pesanan')}
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-black mb-4">
                {tr('Order Summary', 'Ringkasan Pesanan')}
              </h2>

              {/* Items */}
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="text-sm">
                      <p className="font-medium text-black">{item.product?.name}</p>
                      <p className="text-gray-600">{tr('Qty', 'Jumlah')}: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>{tr('Subtotal', 'Subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{tr('Shipping', 'Pengiriman')}</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{tr('Tax (VAT 11%)', 'Pajak (PPN 11%)')}</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-black">
                    <span>{tr('Total', 'Total')}</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
