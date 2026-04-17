'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { orderService } from '@/lib/orders'
import { shippingService } from '@/lib/shipping'
import type { Order, ShippingAddress } from '@/lib/supabase'
import {
  ArrowRight,
  Check,
  ClipboardList,
  Edit3,
  Home,
  KeyRound,
  LogOut,
  MapPin,
  PlusCircle,
  Save,
  ShieldCheck,
  Trash2,
  User,
  UserCircle2,
} from 'lucide-react'

type UserProfile = {
  id: string
  email: string
  full_name?: string | null
  phone?: string | null
  address?: string | null
}

type AddressFormState = {
  recipient_name: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  province: string
  postal_code: string
  country: string
  label: string
  is_default: boolean
}

const EMPTY_ADDRESS_FORM: AddressFormState = {
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

export default function UserProfilePage() {
  const router = useRouter()
  const { t, tr } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    address: '',
  })

  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressForm, setAddressForm] = useState<AddressFormState>({ ...EMPTY_ADDRESS_FORM })

  const [orders, setOrders] = useState<Order[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadProfilePageData()
  }, [])

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: Order['status']) => {
    const map: Record<Order['status'], string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-cyan-100 text-cyan-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-200 text-gray-700',
    }

    return map[status] || 'bg-gray-200 text-gray-700'
  }

  const getStatusLabel = (status: Order['status']) => {
    const labels: Record<Order['status'], string> = {
      pending: tr('Pending', 'Menunggu'),
      confirmed: tr('Confirmed', 'Dikonfirmasi'),
      processing: tr('Processing', 'Diproses'),
      shipped: tr('Shipped', 'Dikirim'),
      delivered: tr('Delivered', 'Terkirim'),
      cancelled: tr('Cancelled', 'Dibatalkan'),
      refunded: tr('Refunded', 'Dikembalikan'),
    }

    return labels[status] || status
  }

  const loadProfilePageData = async () => {
    try {
      setLoading(true)
      setError('')

      const current = await authService.getCurrentUser()
      if (!current || current.role !== 'user') {
        router.push('/login?redirect=/profile')
        return
      }

      const profileData = current.profile as UserProfile
      setProfile(profileData)
      setProfileForm({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
      })

      const [addressList, orderList] = await Promise.all([
        shippingService.getUserAddresses(current.user.id),
        orderService.getUserOrders(current.user.id),
      ])

      setAddresses(addressList)
      setOrders(orderList)
    } catch (loadError) {
      console.error('Error loading profile page:', loadError)
      setError(tr('Failed to load your profile data.', 'Gagal memuat data profil Anda.'))
    } finally {
      setLoading(false)
    }
  }

  const resetAddressEditor = () => {
    setAddressForm({ ...EMPTY_ADDRESS_FORM })
    setEditingAddressId(null)
  }

  const handleStartCreateAddress = () => {
    setShowAddressForm(true)
    resetAddressEditor()
  }

  const handleStartEditAddress = (address: ShippingAddress) => {
    setShowAddressForm(true)
    setEditingAddressId(address.id)
    setAddressForm({
      recipient_name: address.recipient_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      province: address.province,
      postal_code: address.postal_code,
      country: address.country || 'Indonesia',
      label: address.label || 'Home',
      is_default: address.is_default,
    })
  }

  const handleProfileSave = async () => {
    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      await authService.updateUserProfile({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
      })

      setMessage(tr('Profile updated successfully.', 'Profil berhasil diperbarui.'))
      await loadProfilePageData()
    } catch (saveError) {
      console.error('Error updating profile:', saveError)
      setError(tr('Failed to update profile.', 'Gagal memperbarui profil.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveAddress = async () => {
    if (!profile?.id) return

    if (
      !addressForm.recipient_name.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.address_line1.trim() ||
      !addressForm.city.trim() ||
      !addressForm.province.trim() ||
      !addressForm.postal_code.trim()
    ) {
      setError(tr('Please fill all required address fields.', 'Mohon isi semua field alamat wajib.'))
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      if (editingAddressId) {
        await shippingService.updateAddress(editingAddressId, profile.id, {
          ...addressForm,
        })
      } else {
        await shippingService.createAddress(profile.id, {
          ...addressForm,
        })
      }

      const refreshedAddresses = await shippingService.getUserAddresses(profile.id)
      setAddresses(refreshedAddresses)

      setShowAddressForm(false)
      resetAddressEditor()
      setMessage(tr('Address saved successfully.', 'Alamat berhasil disimpan.'))
    } catch (saveError) {
      console.error('Error saving address:', saveError)
      const messageText = saveError instanceof Error ? saveError.message : ''

      if (messageText.includes('MAX_ADDRESSES_REACHED')) {
        setError(tr('Maximum 3 addresses per user.', 'Maksimal 3 alamat per pengguna.'))
      } else {
        setError(tr('Failed to save address.', 'Gagal menyimpan alamat.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!profile?.id) return
    if (!window.confirm(tr('Delete this address?', 'Hapus alamat ini?'))) return

    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      await shippingService.deleteAddress(addressId, profile.id)

      const refreshedAddresses = await shippingService.getUserAddresses(profile.id)
      setAddresses(refreshedAddresses)
      setMessage(tr('Address deleted successfully.', 'Alamat berhasil dihapus.'))
    } catch (deleteError) {
      console.error('Error deleting address:', deleteError)
      const messageText = deleteError instanceof Error ? deleteError.message : ''

      if (messageText.includes('ADDRESS_DELETE_NOT_ALLOWED')) {
        setError(tr('You do not have permission to delete this address.', 'Anda tidak memiliki izin menghapus alamat ini.'))
      } else if (messageText.includes('ADDRESS_DELETE_REQUIRES_DB_MIGRATION')) {
        setError(
          tr(
            'Address deletion requires database migration. Run allow-delete-used-shipping-address.sql in Supabase SQL Editor.',
            'Penghapusan alamat perlu migration database. Jalankan allow-delete-used-shipping-address.sql di Supabase SQL Editor.'
          )
        )
      } else {
        setError(tr('Failed to delete address.', 'Gagal menghapus alamat.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!profile?.id) return

    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      await shippingService.setDefaultAddress(addressId, profile.id)
      const refreshedAddresses = await shippingService.getUserAddresses(profile.id)
      setAddresses(refreshedAddresses)
      setMessage(tr('Default address updated.', 'Alamat utama berhasil diperbarui.'))
    } catch (setDefaultError) {
      console.error('Error setting default address:', setDefaultError)
      setError(tr('Failed to set default address.', 'Gagal mengatur alamat utama.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendResetPassword = async () => {
    if (!profile?.email) return

    try {
      setSendingReset(true)
      setError('')
      setMessage('')
      await authService.sendPasswordResetEmail(profile.email)
      setMessage(
        tr(
          'Password reset link has been sent to your email.',
          'Link reset password sudah dikirim ke email Anda.'
        )
      )
    } catch (sendError) {
      console.error('Error sending reset password email:', sendError)
      setError(tr('Failed to send reset password email.', 'Gagal mengirim email reset password.'))
    } finally {
      setSendingReset(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm(t('nav.logout') + '?')) return
    
    setIsSubmitting(true)
    try {
      await authService.logout()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to logout')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 lg:p-8 shadow-sm card-hover">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-black text-white inline-flex items-center justify-center shrink-0">
                <UserCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{tr('Welcome back', 'Selamat datang kembali')}</p>
                <h1 className="text-2xl lg:text-3xl font-bold text-black mt-1">{profile?.full_name || t('profile.title')}</h1>
                <p className="text-gray-600 mt-1">{profile?.email}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {tr(
                    'Manage account details, password access, delivery addresses, and your order journey.',
                    'Kelola detail akun, akses password, alamat pengiriman, dan perjalanan pesanan Anda.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/catalog"
                className="btn-primary-animated"
              >
                {t('nav.catalog')}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="btn-secondary-animated inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t('nav.logout')}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">
              {tr(
                'Your account is ready. You can update profile details, manage addresses, and open each order for full details below.',
                'Akun Anda siap digunakan. Anda dapat memperbarui profil, mengelola alamat, dan membuka detail tiap pesanan di bawah.'
              )}
            </p>
          </div>
        </section>

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm card-hover">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-black" />
              <h2 className="text-lg font-semibold text-black">
                {tr('Security Access', 'Akses Keamanan')}
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {tr(
                'Need to update your password? We will send a secure reset link to your email.',
                'Perlu memperbarui password? Kami akan mengirimkan link reset yang aman ke email Anda.'
              )}
            </p>
            <button
              type="button"
              onClick={handleSendResetPassword}
              disabled={sendingReset}
              className="btn-secondary-animated inline-flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {sendingReset
                ? tr('Sending...', 'Mengirim...')
                : tr('Request Forgot Password Link', 'Minta Link Lupa Password')}
            </button>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm card-hover">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-black" />
                <h2 className="text-lg font-semibold text-black">
                  {tr('Account Information', 'Informasi Akun')}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {tr('Full Name', 'Nama Lengkap')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Enter your full name', 'Masukkan nama lengkap')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {tr('Email', 'Email')}
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-500 bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {tr('Phone Number', 'Nomor Telepon')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('08xxxxxxxxxx', '08xxxxxxxxxx')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    {tr('Primary Address', 'Alamat Utama')}
                  </label>
                  <textarea
                    rows={3}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Street, district, city', 'Jalan, kecamatan, kota')}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={isSubmitting}
                  className="btn-primary-animated inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {tr('Save Profile', 'Simpan Profil')}
                </button>
              </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-black" />
                  <h2 className="text-lg font-semibold text-black">
                    {tr('Shipping Addresses', 'Alamat Pengiriman')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleStartCreateAddress}
                  className="btn-secondary-animated inline-flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  {tr('Add Address', 'Tambah Alamat')}
                </button>
              </div>

              {addresses.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {tr('No saved addresses yet.', 'Belum ada alamat tersimpan.')}
                </p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div key={address.id} className="rounded-lg border border-gray-200 p-4 hover:border-black transition">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-black">
                            {address.recipient_name}
                            {address.label ? ` (${address.label})` : ''}
                          </p>
                          <p className="text-sm text-gray-600">{address.phone}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {address.address_line1}
                            {address.address_line2 ? `, ${address.address_line2}` : ''}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.province} {address.postal_code}
                          </p>
                          {address.is_default && (
                            <span className="inline-flex mt-2 px-2 py-1 rounded bg-black text-white text-xs font-semibold">
                              {tr('Default Address', 'Alamat Utama')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          {!address.is_default && (
                            <button
                              type="button"
                              onClick={() => {
                                void handleSetDefaultAddress(address.id)
                              }}
                              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                {tr('Set Default', 'Jadikan Utama')}
                              </span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEditAddress(address)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                          >
                            <Edit3 className="w-3 h-3" />
                            {tr('Edit', 'Ubah')}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteAddress(address.id)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            {tr('Delete', 'Hapus')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          {showAddressForm && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm card-hover">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="w-5 h-5 text-black" />
                  <h3 className="text-base font-semibold text-black">
                    {editingAddressId
                      ? tr('Edit Address', 'Ubah Alamat')
                      : tr('Create New Address', 'Buat Alamat Baru')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={addressForm.recipient_name}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, recipient_name: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Recipient name', 'Nama penerima')}
                  />
                  <input
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Phone number', 'Nomor telepon')}
                  />
                  <input
                    value={addressForm.address_line1}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, address_line1: e.target.value }))}
                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Address line 1', 'Alamat baris 1')}
                  />
                  <input
                    value={addressForm.address_line2}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, address_line2: e.target.value }))}
                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Address line 2 (optional)', 'Alamat baris 2 (opsional)')}
                  />
                  <input
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('City', 'Kota')}
                  />
                  <input
                    value={addressForm.province}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, province: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Province', 'Provinsi')}
                  />
                  <input
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Postal code', 'Kode pos')}
                  />
                  <input
                    value={addressForm.label}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder={tr('Label (Home, Office)', 'Label (Rumah, Kantor)')}
                  />

                  <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                    />
                    {tr('Set as default address', 'Jadikan alamat utama')}
                  </label>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSaveAddress()
                    }}
                    disabled={isSubmitting}
                    className="btn-primary-animated"
                  >
                    {tr('Save Address', 'Simpan Alamat')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false)
                      resetAddressEditor()
                    }}
                    className="btn-secondary-animated"
                  >
                    {tr('Cancel', 'Batal')}
                  </button>
                </div>
            </section>
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm card-hover">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-black" />
                <h2 className="text-lg font-semibold text-black">
                  {tr('Recent Order History', 'Riwayat Pesanan Terbaru')}
                </h2>
              </div>

              {orders.length === 0 ? (
                <p className="text-sm text-gray-600 mb-4">
                  {tr('You do not have any orders yet.', 'Anda belum memiliki pesanan.')}
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 6).map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.order_number}`}
                      className="block rounded-lg border border-gray-200 p-3 hover:border-black hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-500">{tr('Order Number', 'Nomor Pesanan')}</p>
                          <p className="font-semibold text-black">{order.order_number}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()} • {formatPrice(Number(order.total || 0))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {tr('Payment', 'Pembayaran')}: {order.payment_status} • {order.payment_method || '-'}
                      </p>
                      <p className="text-sm font-medium text-black mt-2 inline-flex items-center gap-1">
                        {tr('View details', 'Lihat detail')}
                        <ArrowRight className="w-4 h-4" />
                      </p>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  {tr('Click each order to open full detail page.', 'Klik setiap pesanan untuk membuka halaman detail lengkap.')}
                </p>
                <Link
                  href="/catalog"
                  className="text-sm font-medium text-black hover:underline"
                >
                  {tr('Shop again', 'Belanja lagi')}
                </Link>
              </div>
          </section>
        </div>
      </div>
    </div>
  )
}
