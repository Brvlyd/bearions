'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Truck, CheckCircle, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cartService } from '@/lib/cart'
import { orderService } from '@/lib/orders'
import { shippingService } from '@/lib/shipping'
import { paymentService } from '@/lib/payments'
import { loadActivePaymentMethods } from '@/lib/payment-methods'
import {
  findRegionByName,
  getDisplayRegionName,
  wilayahService,
  type WilayahOption,
} from '@/lib/wilayah'
import { useLanguage } from '@/lib/i18n'
import type { CartItem, ShippingAddress, PaymentMethodConfig } from '@/lib/supabase'

type Step = 'shipping' | 'payment' | 'review'

const EMPTY_ADDRESS_FORM = {
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
}

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
  const [newAddress, setNewAddress] = useState({ ...EMPTY_ADDRESS_FORM })
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressFormError, setAddressFormError] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [provinceOptions, setProvinceOptions] = useState<WilayahOption[]>([])
  const [regencyOptions, setRegencyOptions] = useState<WilayahOption[]>([])
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('')
  const [selectedRegencyCode, setSelectedRegencyCode] = useState('')
  const [regionError, setRegionError] = useState('')
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingRegencies, setLoadingRegencies] = useState(false)
  
  // Payment
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [paymentMethodError, setPaymentMethodError] = useState('')
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [copiedValue, setCopiedValue] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  
  // Processing
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    void loadProvinces()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?redirect=/checkout')
      return
    }

    setUserId(user.id)
    setUserEmail(user.email || '')
    await Promise.all([
      loadData(user.id),
      loadPaymentMethods(),
    ])
  }

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true)
      setPaymentMethodError('')

      const result = await loadActivePaymentMethods()
      setPaymentMethods(result.methods)

      if (result.methods.length > 0) {
        setPaymentMethod((prev) => prev || result.methods[0].code)
      }

      if (result.tableMissing) {
        setPaymentMethodError(
          tr(
            'Payment methods table not found. Using default payment method.',
            'Tabel metode pembayaran tidak ditemukan. Menggunakan metode pembayaran default.'
          )
        )
      } else if (result.error) {
        setPaymentMethodError(
          tr(
            'Failed to load payment methods. Using fallback.',
            'Gagal memuat metode pembayaran. Menggunakan fallback.'
          )
        )
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
      setPaymentMethodError(
        tr(
          'Failed to load payment methods. Using fallback.',
          'Gagal memuat metode pembayaran. Menggunakan fallback.'
        )
      )
    } finally {
      setLoadingPaymentMethods(false)
    }
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

  const loadProvinces = async (): Promise<WilayahOption[]> => {
    try {
      setLoadingProvinces(true)
      setRegionError('')
      const provinces = await wilayahService.getProvinces()
      setProvinceOptions(provinces)
      return provinces
    } catch (error) {
      console.error('Error loading provinces:', error)
      setRegionError(tr('Failed to load province data', 'Gagal memuat data provinsi'))
      return []
    } finally {
      setLoadingProvinces(false)
    }
  }

  const loadRegencies = async (provinceCode: string): Promise<WilayahOption[]> => {
    try {
      setLoadingRegencies(true)
      setRegionError('')
      const regencies = await wilayahService.getRegencies(provinceCode)
      setRegencyOptions(regencies)
      return regencies
    } catch (error) {
      console.error('Error loading regencies:', error)
      setRegionError(tr('Failed to load city data', 'Gagal memuat data kota/kabupaten'))
      setRegencyOptions([])
      return []
    } finally {
      setLoadingRegencies(false)
    }
  }

  const resetAddressForm = () => {
    setNewAddress({ ...EMPTY_ADDRESS_FORM })
    setEditingAddressId(null)
    setAddressFormError('')
    setRegionError('')
    setSelectedProvinceCode('')
    setSelectedRegencyCode('')
    setRegencyOptions([])
  }

  const handleStartAddAddress = async () => {
    if (addresses.length >= 3) {
      setAddressFormError(tr('Maximum 3 addresses per user', 'Maksimal 3 alamat per user'))
      return
    }

    if (provinceOptions.length === 0) {
      await loadProvinces()
    }

    resetAddressForm()
    setShowAddressForm(true)
  }

  const handleStartEditAddress = async (address: ShippingAddress) => {
    const provinces = provinceOptions.length > 0 ? provinceOptions : await loadProvinces()
    const matchedProvince = findRegionByName(provinces, address.province)

    setEditingAddressId(address.id)
    setAddressFormError('')
    setRegionError('')
    setNewAddress({
      recipient_name: address.recipient_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      province: address.province,
      postal_code: address.postal_code,
      country: address.country,
      label: address.label || 'Home',
      is_default: address.is_default,
    })

    if (matchedProvince) {
      setSelectedProvinceCode(matchedProvince.code)
      const regencies = await loadRegencies(matchedProvince.code)
      const matchedRegency = findRegionByName(regencies, address.city)
      setSelectedRegencyCode(matchedRegency?.code || '')
    } else {
      setSelectedProvinceCode('')
      setSelectedRegencyCode('')
      setRegencyOptions([])
    }

    setShowAddressForm(true)
  }

  const handleProvinceChange = async (provinceCode: string) => {
    const selectedProvince = provinceOptions.find((province) => province.code === provinceCode)

    setSelectedProvinceCode(provinceCode)
    setSelectedRegencyCode('')
    setRegencyOptions([])
    setNewAddress((prev) => ({
      ...prev,
      province: selectedProvince?.name || '',
      city: '',
      postal_code: '',
    }))

    if (provinceCode) {
      await loadRegencies(provinceCode)
    }
  }

  const handleRegencyChange = (regencyCode: string) => {
    const selectedRegency = regencyOptions.find((regency) => regency.code === regencyCode)

    setSelectedRegencyCode(regencyCode)
    setNewAddress((prev) => ({
      ...prev,
      city: selectedRegency ? getDisplayRegionName(selectedRegency.name) : '',
      postal_code: '',
    }))
  }

  const handleSaveAddress = async () => {
    if (!userId) return

    if (
      !newAddress.recipient_name.trim() ||
      !newAddress.phone.trim() ||
      !newAddress.address_line1.trim() ||
      !newAddress.address_line2.trim() ||
      !newAddress.city.trim() ||
      !newAddress.province.trim() ||
      !newAddress.postal_code.trim()
    ) {
      setAddressFormError(tr('Please fill all address fields', 'Mohon isi semua field alamat'))
      return
    }

    if (!/^\d{5}$/.test(newAddress.postal_code.trim())) {
      setAddressFormError(tr('Postal code must be 5 digits', 'Kode pos harus 5 digit'))
      return
    }

    if (addresses.length >= 3 && !editingAddressId) {
      setAddressFormError(tr('Maximum 3 addresses per user', 'Maksimal 3 alamat per user'))
      return
    }

    try {
      setSavingAddress(true)
      setAddressFormError('')
      let targetAddressId = editingAddressId

      if (editingAddressId) {
        await shippingService.updateAddress(editingAddressId, userId, newAddress)
      } else {
        const createdAddress = await shippingService.createAddress(userId, newAddress)
        targetAddressId = createdAddress.id
      }

      const refreshedAddresses = await shippingService.getUserAddresses(userId)
      const nextSelectedAddress = targetAddressId
        ? refreshedAddresses.find((address) => address.id === targetAddressId)
        : refreshedAddresses.find((address) => address.is_default) || refreshedAddresses[0]

      setAddresses(refreshedAddresses)
      setSelectedAddress(nextSelectedAddress || null)
      setShowAddressForm(false)
      resetAddressForm()
    } catch (error) {
      console.error('Error saving address:', error)

      const message = error instanceof Error ? error.message : ''
      if (message.includes('MAX_ADDRESSES_REACHED')) {
        setAddressFormError(tr('Maximum 3 addresses per user', 'Maksimal 3 alamat per user'))
      } else {
        setAddressFormError(tr('Failed to save address', 'Gagal menyimpan alamat'))
      }
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!userId) return

    const confirmed = window.confirm(
      tr('Delete this address?', 'Hapus alamat ini?')
    )

    if (!confirmed) return

    try {
      await shippingService.deleteAddress(addressId, userId)

      const refreshedAddresses = await shippingService.getUserAddresses(userId)
      setAddresses(refreshedAddresses)

      if (selectedAddress?.id === addressId) {
        const defaultAddr = refreshedAddresses.find((address) => address.is_default) || refreshedAddresses[0]
        setSelectedAddress(defaultAddr || null)
      }

      if (editingAddressId === addressId) {
        setShowAddressForm(false)
        resetAddressForm()
      }
    } catch (error) {
      console.error('Error deleting address:', error)
      const message = error instanceof Error ? error.message : ''

      if (message.includes('ADDRESS_DELETE_NOT_ALLOWED')) {
        alert(
          tr(
            'You do not have permission to delete this address.',
            'Anda tidak memiliki izin untuk menghapus alamat ini.'
          )
        )
      } else if (message.includes('ADDRESS_DELETE_REQUIRES_DB_MIGRATION')) {
        alert(
          tr(
            'Address deletion for previous orders needs database migration. Run allow-delete-used-shipping-address.sql in Supabase SQL Editor.',
            'Penghapusan alamat yang pernah dipakai order memerlukan migration database. Jalankan allow-delete-used-shipping-address.sql di Supabase SQL Editor.'
          )
        )
      } else {
        alert(tr('Failed to delete address', 'Gagal menghapus alamat'))
      }
    }
  }

  const handleCopyAccountNumber = async (value: string) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
      setTimeout(() => setCopiedValue(''), 2000)
    } catch (error) {
      console.error('Failed to copy account number:', error)
      alert(tr('Failed to copy account number', 'Gagal menyalin nomor rekening'))
    }
  }

  const handlePlaceOrder = async () => {
    if (!userId || !selectedAddress) return

    if (!paymentMethod) {
      alert(tr('Please select a payment method', 'Silakan pilih metode pembayaran'))
      return
    }

    const selectedMethod = paymentMethods.find((method) => method.code === paymentMethod)

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
        paymentGateway: selectedMethod?.requires_proof ? 'manual' : 'custom',
      })

      // Clear cart
      await cartService.clearCart(userId)

      if (selectedMethod?.requires_proof) {
        router.push(`/payment/${order.order_number}`)
      } else {
        router.push('/cart?checkout=success')
      }
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

  const postalCodeSuggestions = Array.from(
    new Set(
      addresses
        .filter((address) =>
          address.city.toLowerCase() === newAddress.city.toLowerCase() &&
          address.province.toLowerCase() === newAddress.province.toLowerCase()
        )
        .map((address) => address.postal_code)
        .filter(Boolean)
    )
  )
  const isAddressLimitReached = addresses.length >= 3 && !editingAddressId
  const selectedPaymentMethod = paymentMethods.find((method) => method.code === paymentMethod) || null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black">
        <div className="container mx-auto px-4 pt-28 lg:pt-32 pb-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <p className="mt-4 text-gray-600">{tr('Loading checkout...', 'Memuat checkout...')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="container mx-auto px-4 pt-24 lg:pt-28 pb-10">
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
            <span className="font-medium text-sm lg:text-base hidden sm:inline text-black">{tr('Shipping', 'Pengiriman')}</span>
          </div>
          <div className="w-6 lg:w-12 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-1 lg:gap-2">
            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-sm ${currentStep === 'payment' ? 'bg-black text-white' : currentStep === 'review' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {currentStep === 'review' ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" /> : '2'}
            </div>
            <span className={`font-medium text-sm lg:text-base hidden sm:inline ${currentStep === 'payment' || currentStep === 'review' ? 'text-black' : 'text-gray-500'}`}>
              {tr('Payment', 'Pembayaran')}
            </span>
          </div>
          <div className="w-6 lg:w-12 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-1 lg:gap-2">
            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-sm ${currentStep === 'review' ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>
              3
            </div>
            <span className={`font-medium text-sm lg:text-base hidden sm:inline ${currentStep === 'review' ? 'text-black' : 'text-gray-500'}`}>
              {tr('Review', 'Tinjau')}
            </span>
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
                  {addresses.length === 0 && (
                    <p className="text-sm text-gray-600">
                      {tr('No address saved yet. Please add one first.', 'Belum ada alamat tersimpan. Silakan tambahkan terlebih dahulu.')}
                    </p>
                  )}

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
                        <div className="flex items-start gap-2">
                          {address.is_default && (
                            <span className="text-xs bg-black text-white px-2 py-1 rounded">
                              {tr('Default', 'Utama')}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleStartEditAddress(address)
                            }}
                            className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                          >
                            {tr('Edit', 'Ubah')}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteAddress(address.id)
                            }}
                            className="text-xs px-2 py-1 border border-red-300 rounded text-red-600 hover:bg-red-50"
                          >
                            {tr('Delete', 'Hapus')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Address Form */}
                {showAddressForm ? (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-sm lg:text-base text-black">
                      {editingAddressId
                        ? tr('Edit Address', 'Ubah Alamat')
                        : tr('Add New Address', 'Tambah Alamat Baru')}
                    </h3>

                    {addressFormError && (
                      <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">
                        {addressFormError}
                      </div>
                    )}

                    {regionError && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm px-3 py-2">
                        {regionError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                      <input
                        type="text"
                        placeholder={tr('Recipient Name', 'Nama Penerima')}
                        value={newAddress.recipient_name}
                        onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="tel"
                        placeholder={tr('Phone', 'Telepon')}
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder={tr('Address Line 1', 'Alamat Baris 1')}
                        value={newAddress.address_line1}
                        onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder={tr('Address Line 2', 'Alamat Baris 2')}
                        value={newAddress.address_line2}
                        onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                        className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black"
                      />

                      <select
                        value={selectedProvinceCode}
                        onChange={(e) => {
                          void handleProvinceChange(e.target.value)
                        }}
                        disabled={loadingProvinces}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">
                          {newAddress.province && selectedProvinceCode === ''
                            ? `${tr('Current Province', 'Provinsi Saat Ini')}: ${newAddress.province}`
                            : tr('Select Province', 'Pilih Provinsi')}
                        </option>
                        {provinceOptions.map((province) => (
                          <option key={province.code} value={province.code}>
                            {province.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedRegencyCode}
                        onChange={(e) => {
                          handleRegencyChange(e.target.value)
                        }}
                        disabled={!selectedProvinceCode || loadingRegencies}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">
                          {newAddress.city && selectedRegencyCode === ''
                            ? `${tr('Current City', 'Kota Saat Ini')}: ${newAddress.city}`
                            : tr('Select City', 'Pilih Kota')}
                        </option>
                        {regencyOptions.map((regency) => (
                          <option key={regency.code} value={regency.code}>
                            {getDisplayRegionName(regency.name)}
                          </option>
                        ))}
                      </select>

                      <input
                        list="postal-code-suggestions"
                        inputMode="numeric"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        value={newAddress.postal_code}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 5)
                          setNewAddress({ ...newAddress, postal_code: digitsOnly })
                        }}
                        placeholder={tr('Postal Code (5 digits)', 'Kode Pos (5 digit)')}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <datalist id="postal-code-suggestions">
                        {postalCodeSuggestions.map((postalCode) => (
                          <option key={postalCode} value={postalCode} />
                        ))}
                      </datalist>

                      <label className="col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={newAddress.is_default}
                          onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                          className="w-4 h-4"
                        />
                        {tr('Set as default address', 'Jadikan sebagai alamat utama')}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      {tr(
                        'Province and city are loaded from wilayah.id API. Postal code is entered manually because the API does not provide postal code data.',
                        'Provinsi dan kota dimuat dari API wilayah.id. Kode pos diisi manual karena API tidak menyediakan data kode pos.'
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveAddress}
                        disabled={savingAddress}
                        className="btn-primary-animated px-4 py-2"
                      >
                        {savingAddress
                          ? tr('Saving...', 'Menyimpan...')
                          : editingAddressId
                          ? tr('Update Address', 'Perbarui Alamat')
                          : tr('Save Address', 'Simpan Alamat')}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddressForm(false)
                          resetAddressForm()
                        }}
                        className="btn-secondary-animated px-4 py-2"
                      >
                        {tr('Cancel', 'Batal')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          void handleStartAddAddress()
                        }}
                        disabled={isAddressLimitReached}
                        className="text-black hover:underline font-medium btn-animate disabled:text-gray-400 disabled:no-underline"
                      >
                        + {tr('Add New Address', 'Tambah Alamat Baru')}
                      </button>
                      <span className="text-xs text-gray-500">
                        {addresses.length}/3 {tr('addresses saved', 'alamat tersimpan')}
                      </span>
                    </div>
                    {isAddressLimitReached && (
                      <p className="text-sm text-red-600">
                        {tr('Maximum 3 addresses per user', 'Maksimal 3 alamat per user')}
                      </p>
                    )}
                  </div>
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

                {paymentMethodError && (
                  <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm px-3 py-2">
                    {paymentMethodError}
                  </div>
                )}

                {loadingPaymentMethods ? (
                  <div className="mb-6 text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    <p className="mt-2 text-sm text-gray-600">
                      {tr('Loading payment methods...', 'Memuat metode pembayaran...')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.code}
                        type="button"
                        onClick={() => setPaymentMethod(method.code)}
                        className={`w-full text-left border-2 rounded-lg p-4 transition ${
                          paymentMethod === method.code
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-black">{method.display_name}</p>
                            {method.description && (
                              <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                            )}
                          </div>
                          {paymentMethod === method.code && (
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-black text-white">
                              {tr('Selected', 'Dipilih')}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPaymentMethod && (
                  <div className="mb-6 rounded-xl border border-gray-200 bg-linear-to-br from-gray-50 to-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                          {tr('Selected Payment', 'Pembayaran Terpilih')}
                        </p>
                        <p className="text-lg font-bold text-black mt-1">
                          {selectedPaymentMethod.display_name}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black text-white">
                        {tr('Active', 'Aktif')}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-300 bg-white p-4 space-y-3">
                      {selectedPaymentMethod.provider_name && (
                        <div>
                          <p className="text-xs text-gray-500">{tr('Provider/Bank', 'Provider/Bank')}</p>
                          <p className="font-semibold text-black">{selectedPaymentMethod.provider_name}</p>
                        </div>
                      )}

                      {selectedPaymentMethod.account_name && (
                        <div>
                          <p className="text-xs text-gray-500">{tr('Account Name', 'Nama Rekening')}</p>
                          <p className="font-semibold text-black">{selectedPaymentMethod.account_name}</p>
                        </div>
                      )}

                      {selectedPaymentMethod.account_number && (
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-gray-500">{tr('Account Number', 'Nomor Rekening')}</p>
                            <p className="text-xl font-bold tracking-wider text-black">{selectedPaymentMethod.account_number}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyAccountNumber(selectedPaymentMethod.account_number || '')}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                          >
                            {copiedValue === selectedPaymentMethod.account_number ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedValue === selectedPaymentMethod.account_number
                              ? tr('Copied', 'Tersalin')
                              : tr('Copy Number', 'Salin Nomor')}
                          </button>
                        </div>
                      )}

                      {selectedPaymentMethod.instructions && (
                        <p className="text-sm text-gray-700 whitespace-pre-line">{selectedPaymentMethod.instructions}</p>
                      )}
                    </div>

                    <div className="mt-4 text-sm text-gray-600 rounded-lg bg-gray-100 px-3 py-2">
                      {selectedPaymentMethod.requires_proof
                        ? tr(
                            'This method requires payment proof upload after order placement.',
                            'Metode ini mewajibkan upload bukti pembayaran setelah membuat pesanan.'
                          )
                        : tr(
                            'You can complete this method without payment proof upload.',
                            'Metode ini bisa diselesaikan tanpa upload bukti pembayaran.'
                          )}
                    </div>
                  </div>
                )}

                {!selectedPaymentMethod && (
                  <div className="mb-6 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">
                    {tr('No payment method available. Contact admin.', 'Tidak ada metode pembayaran tersedia. Hubungi admin.')}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep('shipping')}
                    className="btn-secondary-animated px-6 py-3"
                  >
                    {tr('Back', 'Kembali')}
                  </button>
                  <button
                    onClick={() => setCurrentStep('review')}
                    disabled={!selectedPaymentMethod}
                    className="flex-1 btn-primary-animated py-3 disabled:opacity-50"
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
                  {selectedPaymentMethod ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                      <p className="text-sm text-gray-600">{tr('Method', 'Metode')}</p>
                      <p className="font-semibold text-black">{selectedPaymentMethod.display_name}</p>
                      {selectedPaymentMethod.provider_name && (
                        <p className="text-sm text-gray-700">{selectedPaymentMethod.provider_name}</p>
                      )}
                      {selectedPaymentMethod.account_name && (
                        <p className="text-sm text-gray-700">{selectedPaymentMethod.account_name}</p>
                      )}
                      {selectedPaymentMethod.account_number && (
                        <p className="text-lg font-bold tracking-wide text-black">{selectedPaymentMethod.account_number}</p>
                      )}
                      {selectedPaymentMethod.instructions && (
                        <p className="text-sm text-gray-700 whitespace-pre-line">{selectedPaymentMethod.instructions}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">
                      {tr('No payment method selected', 'Belum ada metode pembayaran terpilih')}
                    </p>
                  )}
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
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24 lg:top-28">
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
    </div>
  )
}
