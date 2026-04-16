'use client'

import { useEffect, useState } from 'react'
import { Order } from '@/lib/supabase'
import { orderService } from '@/lib/orders'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { ShoppingBag, Eye, Search, Filter, Package, DollarSign, Clock, CheckCircle, XCircle, Truck } from 'lucide-react'

type FilterStatus = 'all' | Order['status']
type FilterPayment = 'all' | Order['payment_status']

export default function OrdersPage() {
  const { tr } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [paymentFilter, setPaymentFilter] = useState<FilterPayment>('all')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showPaymentMenu, setShowPaymentMenu] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await orderService.getAllOrders()
      setOrders(data)
    } catch (error) {
      console.error('Error loading orders:', error)
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
      month: 'short',
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
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
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
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getFilteredOrders = () => {
    let filtered = [...orders]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(o => o.payment_status === paymentFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(query) ||
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_email.toLowerCase().includes(query) ||
        o.customer_phone.includes(query)
      )
    }

    return filtered
  }

  const filteredOrders = getFilteredOrders()

  // Calculate stats
  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  // Orders yang sudah dibayar tapi belum dikirim (ready to ship)
  const readyToShip = orders.filter(o => 
    o.payment_status === 'paid' && 
    !['shipped', 'delivered', 'cancelled', 'refunded'].includes(o.status)
  ).length
  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + parseFloat(o.total.toString()), 0)

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">{tr('Loading orders...', 'Memuat pesanan...')}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-black">{tr('Order History', 'Riwayat Pesanan')}</h2>
        <p className="text-gray-600">{tr('View and manage all customer orders', 'Lihat dan kelola semua pesanan pelanggan')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Total Orders', 'Total Pesanan')}</p>
              <p className="text-3xl font-bold text-black">{totalOrders}</p>
            </div>
            <ShoppingBag className="w-12 h-12 text-blue-400" />
          </div>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200 cursor-pointer hover:shadow-lg transition-shadow"
             onClick={() => {
               setStatusFilter('all')
               setPaymentFilter('paid')
               setSearchQuery('')
             }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Ready to Ship', 'Siap Dikirim')}</p>
              <p className="text-3xl font-bold text-orange-700">{readyToShip}</p>
              <p className="text-xs text-orange-600 mt-1">{tr('Paid, not shipped yet', 'Sudah dibayar, belum dikirim')}</p>
            </div>
            <Truck className="w-12 h-12 text-orange-500" />
          </div>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Pending Payment', 'Menunggu Pembayaran')}</p>
              <p className="text-3xl font-bold text-yellow-700">{pendingOrders}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Revenue', 'Pendapatan')}</p>
              <p className="text-2xl font-bold text-purple-700">{formatPrice(totalRevenue)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setStatusFilter('all')
            setPaymentFilter('all')
            setSearchQuery('')
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            statusFilter === 'all' && paymentFilter === 'all'
              ? 'bg-black text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {tr('All Orders', 'Semua Pesanan')}
        </button>
        <button
          onClick={() => {
            setStatusFilter('all')
            setPaymentFilter('paid')
            setSearchQuery('')
          }}
          className="px-4 py-2 rounded-lg font-medium bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200 transition-all flex items-center gap-2"
        >
          <Truck className="w-4 h-4" />
          {tr('Ready to Ship', 'Siap Dikirim')} ({readyToShip})
        </button>
        <button
          onClick={() => {
            setStatusFilter('pending')
            setPaymentFilter('all')
            setSearchQuery('')
          }}
          className="px-4 py-2 rounded-lg font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 transition-all"
        >
          {tr('Pending Payment', 'Menunggu Pembayaran')}
        </button>
        <button
          onClick={() => {
            setStatusFilter('delivered')
            setPaymentFilter('all')
            setSearchQuery('')
          }}
          className="px-4 py-2 rounded-lg font-medium bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-all"
        >
          {tr('Delivered', 'Terkirim')}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={tr('Search by order number, customer name, email, or phone...', 'Cari berdasarkan nomor pesanan, nama pelanggan, email, atau telepon...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-600"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setShowStatusMenu(!showStatusMenu)
              setShowPaymentMenu(false)
            }}
            className="px-4 py-3 bg-white border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2 min-w-35"
          >
            <Filter className="w-5 h-5" />
            {tr('Status', 'Status')}: {statusFilter === 'all' ? tr('All', 'Semua') : statusFilter}
          </button>
          
          {showStatusMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-2">
                {(['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as FilterStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setShowStatusMenu(false) }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${statusFilter === status ? 'bg-gray-100 font-medium' : ''}`}
                  >
                    {status === 'all'
                      ? tr('All Status', 'Semua Status')
                      : tr(status.charAt(0).toUpperCase() + status.slice(1), status === 'pending' ? 'Menunggu' : status === 'confirmed' ? 'Dikonfirmasi' : status === 'processing' ? 'Diproses' : status === 'shipped' ? 'Dikirim' : status === 'delivered' ? 'Terkirim' : 'Dibatalkan')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPaymentMenu(!showPaymentMenu)
              setShowStatusMenu(false)
            }}
            className="px-4 py-3 bg-white border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2 min-w-35"
          >
            <DollarSign className="w-5 h-5" />
            {tr('Payment', 'Pembayaran')}: {paymentFilter === 'all' ? tr('All', 'Semua') : paymentFilter}
          </button>
          
          {showPaymentMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-2">
                {(['all', 'unpaid', 'pending', 'paid', 'failed'] as FilterPayment[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => { setPaymentFilter(status); setShowPaymentMenu(false) }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${paymentFilter === status ? 'bg-gray-100 font-medium' : ''}`}
                  >
                    {status === 'all'
                      ? tr('All Payments', 'Semua Pembayaran')
                      : tr(status.charAt(0).toUpperCase() + status.slice(1), status === 'unpaid' ? 'Belum Dibayar' : status === 'pending' ? 'Menunggu' : status === 'paid' ? 'Lunas' : 'Gagal')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{tr('Order Number', 'Nomor Pesanan')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{tr('Customer', 'Pelanggan')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{tr('Date', 'Tanggal')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{tr('Total', 'Total')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{tr('Payment', 'Pembayaran')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{tr('Status', 'Status')}</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">{tr('Action', 'Aksi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{tr('No orders found', 'Tidak ada pesanan')}</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  // Highlight orders yang sudah dibayar tapi belum dikirim
                  const isReadyToShip = order.payment_status === 'paid' && 
                    !['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)
                  
                  return (
                    <tr 
                      key={order.id} 
                      className={`transition-colors ${
                        isReadyToShip 
                          ? 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isReadyToShip && (
                            <div title={tr('Ready to Ship', 'Siap Dikirim')}>
                              <Truck className="w-4 h-4 text-orange-600" />
                            </div>
                          )}
                          <span className="font-mono text-sm font-medium text-black">{order.order_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-black">{order.customer_name}</p>
                          <p className="text-sm text-gray-600">{order.customer_phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-black">{formatPrice(parseFloat(order.total.toString()))}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getPaymentBadge(order.payment_status)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/admin/dashboard/orders/${order.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                            isReadyToShip
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-black text-white hover:bg-gray-800'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          {tr('View', 'Lihat')}
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        {tr('Showing {shown} of {total} orders', 'Menampilkan {shown} dari {total} pesanan', {
          shown: filteredOrders.length,
          total: totalOrders,
        })}
      </div>
    </div>
  )
}
