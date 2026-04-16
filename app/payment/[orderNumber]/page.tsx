'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, CreditCard, FileUp, Image as ImageIcon, ReceiptText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { orderService } from '@/lib/orders'
import { paymentService } from '@/lib/payments'
import { useLanguage } from '@/lib/i18n'
import type { Order, Payment } from '@/lib/supabase'

const BANK_TRANSFER_INFO = {
  bankName: 'Bank Mandiri',
  accountName: 'BENEDICTUS RIVOLLY A',
  accountNumber: '1360037247548',
}

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const { tr } = useLanguage()

  const orderNumber = params.orderNumber as string

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [pageError, setPageError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    void loadPaymentData()
  }, [orderNumber])

  const loadPaymentData = async () => {
    try {
      setLoading(true)
      setPageError('')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push(`/login?redirect=/payment/${orderNumber}`)
        return
      }

      const orderData = await orderService.getOrderByNumber(orderNumber)

      if (!orderData || orderData.user_id !== user.id) {
        setPageError(tr('Order not found or inaccessible', 'Pesanan tidak ditemukan atau tidak dapat diakses'))
        return
      }

      const paymentData = await paymentService.getPaymentByOrderId(orderData.id)

      if (!paymentData) {
        setPageError(tr('Payment data not found for this order', 'Data pembayaran untuk pesanan ini tidak ditemukan'))
        return
      }

      setOrder(orderData)
      setPayment(paymentData)
    } catch (error) {
      console.error('Error loading payment page:', error)
      setPageError(tr('Failed to load payment page', 'Gagal memuat halaman pembayaran'))
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleSelectFile = (file: File | null) => {
    setFileError('')
    setSuccessMessage('')

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError(
        tr(
          'Invalid file type. Use JPG, PNG, WEBP, or PDF.',
          'Tipe file tidak valid. Gunakan JPG, PNG, WEBP, atau PDF.'
        )
      )
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(tr('File size exceeds 2MB', 'Ukuran file melebihi 2MB'))
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleUploadProof = async () => {
    if (!order || !payment || !selectedFile) return

    try {
      setUploading(true)
      setFileError('')
      setSuccessMessage('')

      const updatedPayment = await paymentService.submitPaymentProof(order.id, selectedFile)
      setPayment(updatedPayment)
      setSelectedFile(null)
      setSuccessMessage(
        tr(
          'Payment proof uploaded. Your order is waiting for admin verification.',
          'Bukti pembayaran berhasil diupload. Pesanan Anda sedang menunggu verifikasi admin.'
        )
      )

      await loadPaymentData()
    } catch (error) {
      console.error('Error uploading payment proof:', error)
      const message = error instanceof Error ? error.message : ''
      if (message.includes('INVALID_PAYMENT_PROOF_TYPE')) {
        setFileError(
          tr(
            'Invalid file type. Use JPG, PNG, WEBP, or PDF.',
            'Tipe file tidak valid. Gunakan JPG, PNG, WEBP, atau PDF.'
          )
        )
      } else if (message.includes('PAYMENT_PROOF_TOO_LARGE')) {
        setFileError(tr('File size exceeds 2MB', 'Ukuran file melebihi 2MB'))
      } else {
        setFileError(tr('Failed to upload payment proof', 'Gagal mengupload bukti pembayaran'))
      }
    } finally {
      setUploading(false)
    }
  }

  const isProofImage = useMemo(() => {
    if (!payment?.payment_proof_url) return false
    return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(payment.payment_proof_url)
  }, [payment?.payment_proof_url])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black">
        <div className="container mx-auto px-4 pt-28 lg:pt-32 pb-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <p className="mt-4 text-gray-600">{tr('Loading payment page...', 'Memuat halaman pembayaran...')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (pageError || !order || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 text-black">
        <div className="container mx-auto px-4 pt-24 lg:pt-28 pb-12">
          <div className="max-w-xl mx-auto bg-white rounded-xl border border-red-200 p-6">
            <p className="text-red-700">{pageError || tr('Payment data unavailable', 'Data pembayaran tidak tersedia')}</p>
            <Link href="/cart" className="inline-flex mt-4 text-sm text-black hover:underline">
              {tr('Back to cart', 'Kembali ke keranjang')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalAmount = Number(order.total || 0)

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="container mx-auto px-4 pt-24 lg:pt-28 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/cart" className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition">
            <ArrowLeft className="w-5 h-5" />
            {tr('Back to Cart', 'Kembali ke Keranjang')}
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-black">{tr('Complete Payment', 'Selesaikan Pembayaran')}</h1>
            <p className="text-gray-600 mt-2">
              {tr('Order Number', 'Nomor Pesanan')}: <span className="font-mono font-medium text-black">{order.order_number}</span>
            </p>
            <p className="text-gray-600">
              {tr('Total Amount', 'Total Pembayaran')}: <span className="font-semibold text-black">{formatPrice(totalAmount)}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" />
                {tr('Transfer Destination', 'Tujuan Transfer')}
              </h2>

              <div className="space-y-3 rounded-lg border border-gray-300 bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-500">{tr('Bank', 'Bank')}</p>
                  <p className="font-semibold text-black">{BANK_TRANSFER_INFO.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tr('Account Name', 'Nama Rekening')}</p>
                  <p className="font-semibold text-black">{BANK_TRANSFER_INFO.accountName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tr('Account Number', 'Nomor Rekening')}</p>
                  <p className="text-xl font-bold tracking-wide text-black">{BANK_TRANSFER_INFO.accountNumber}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                {tr(
                  'Transfer first, then upload your proof below so the order can be processed by admin.',
                  'Silakan transfer terlebih dahulu, lalu upload bukti agar pesanan dapat diproses admin.'
                )}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FileUp className="w-5 h-5" />
                {tr('Upload Payment Proof', 'Upload Bukti Pembayaran')}
              </h2>

              <div className="space-y-3">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
                />
                <p className="text-xs text-gray-500">
                  {tr('Accepted: JPG, PNG, WEBP, PDF. Max size: 2MB.', 'Format: JPG, PNG, WEBP, PDF. Maksimal ukuran: 2MB.')}
                </p>

                {selectedFile && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {selectedFile.name}
                  </div>
                )}

                {fileError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
                    {fileError}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-lg border border-green-300 bg-green-50 text-green-700 px-3 py-2 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {successMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUploadProof}
                  disabled={!selectedFile || uploading}
                  className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {uploading
                    ? tr('Uploading...', 'Mengupload...')
                    : tr('Upload Proof', 'Upload Bukti')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-3">{tr('Latest Uploaded Proof', 'Bukti Terupload Terakhir')}</h2>

            {payment.payment_proof_url ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  {isProofImage ? (
                    <img
                      src={payment.payment_proof_url}
                      alt={tr('Payment proof preview', 'Preview bukti pembayaran')}
                      className="max-h-80 w-auto rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="flex items-center gap-3 text-gray-700">
                      <ReceiptText className="w-5 h-5" />
                      <span>{tr('PDF proof uploaded', 'Bukti PDF sudah diupload')}</span>
                    </div>
                  )}
                </div>

                <a
                  href={payment.payment_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-black hover:underline"
                >
                  <ImageIcon className="w-4 h-4" />
                  {tr('Open uploaded proof', 'Buka bukti yang diupload')}
                </a>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">
                {tr('No proof uploaded yet.', 'Belum ada bukti yang diupload.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
