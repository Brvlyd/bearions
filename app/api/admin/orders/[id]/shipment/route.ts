import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAdminUser, getServiceClient } from '@/lib/api-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createBiteshipOrder, getBiteshipOrder, type BiteshipFailureReason } from '@/lib/biteship'

// POST /api/admin/orders/[id]/shipment
// GET  /api/admin/orders/[id]/shipment
//
// Books a real Biteship shipment for a paid order ("Buat Pengiriman & Cetak
// Resi" in the admin order page) and returns the waybill number. The actual
// printable resi is rendered client-side from this plus the order's existing
// shipping snapshot — Biteship has no label/PDF API to call here.
//
// Only orders quoted through Biteship at checkout are eligible: a zone-table
// quote's courier/service codes are this store's own vocabulary, not
// Biteship's, and would get rejected (or worse, silently mis-booked) by
// Biteship's Create Order endpoint.

const FAILURE_MESSAGES: Record<BiteshipFailureReason, string> = {
  unconfigured: 'Biteship belum dikonfigurasi (BITESHIP_API_KEY belum diisi).',
  unauthorized: 'API key Biteship ditolak. Cek kembali di Admin > Pengiriman.',
  insufficient_balance: 'Saldo Biteship tidak cukup untuk membuat pengiriman ini. Isi saldo lalu coba lagi.',
  error: 'Biteship gagal memproses permintaan ini. Coba lagi sebentar lagi.',
}

async function loadOrder(serviceClient: ReturnType<typeof getServiceClient>, orderId: string) {
  const { data: order } = await serviceClient
    .from('orders')
    .select('id, order_number, total, payment_status, shipping_provider, shipping_courier_code, shipping_service_code, shipping_weight_grams, shipping_address_id, biteship_order_id, biteship_status')
    .eq('id', orderId)
    .maybeSingle()

  return order
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!(await isAdminUser(caller))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const limit = checkRateLimit({
      key: `create-shipment:${caller.userId}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Terlalu sering. Tunggu sebentar lalu coba lagi.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const serviceClient = getServiceClient()
    const order = await loadOrder(serviceClient, orderId)

    if (!order) {
      return NextResponse.json({ message: 'Order tidak ditemukan' }, { status: 404 })
    }

    // Already booked — never double-book (Biteship bills each call separately).
    if (order.biteship_order_id) {
      return NextResponse.json(
        {
          message: 'Pengiriman untuk order ini sudah dibuat sebelumnya.',
          biteshipOrderId: order.biteship_order_id,
          biteshipStatus: order.biteship_status,
        },
        { status: 409 }
      )
    }

    if (order.payment_status !== 'paid') {
      return NextResponse.json(
        { message: 'Order belum lunas. Konfirmasi pembayaran dulu sebelum membuat pengiriman.' },
        { status: 409 }
      )
    }

    if (order.shipping_provider !== 'biteship' || !order.shipping_courier_code || !order.shipping_service_code) {
      return NextResponse.json(
        {
          message:
            'Order ini tidak dikutip lewat Biteship saat checkout, jadi kode kurirnya tidak bisa dipakai untuk membuat pengiriman otomatis. Isi kurir & nomor resi secara manual.',
        },
        { status: 409 }
      )
    }

    if (!order.shipping_address_id) {
      return NextResponse.json({ message: 'Order ini tidak punya alamat pengiriman.' }, { status: 409 })
    }

    const [{ data: address }, { data: settings }] = await Promise.all([
      serviceClient
        .from('shipping_addresses')
        .select('recipient_name, phone, address_line1, address_line2, area_id, postal_code')
        .eq('id', order.shipping_address_id)
        .maybeSingle(),
      serviceClient
        .from('site_settings')
        .select('shipping_origin_address, shipping_origin_area_id, shipping_origin_postal_code, shipping_origin_contact_name, shipping_origin_contact_phone, shipping_origin_collection_method')
        .eq('id', 1)
        .maybeSingle(),
    ])

    if (!address) {
      return NextResponse.json({ message: 'Alamat pengiriman order ini tidak ditemukan.' }, { status: 404 })
    }

    if (!settings?.shipping_origin_contact_name || !settings?.shipping_origin_contact_phone) {
      return NextResponse.json(
        {
          message:
            'Nama & nomor telepon pengirim belum diisi di Admin > Pengiriman. Lengkapi dulu sebelum membuat pengiriman.',
        },
        { status: 409 }
      )
    }

    if (!settings.shipping_origin_address) {
      return NextResponse.json(
        { message: 'Alamat asal (gudang/toko) belum diisi di Admin > Pengiriman.' },
        { status: 409 }
      )
    }

    const result = await createBiteshipOrder({
      origin: {
        name: settings.shipping_origin_contact_name,
        phone: settings.shipping_origin_contact_phone,
        address: settings.shipping_origin_address,
        areaId: settings.shipping_origin_area_id,
        postalCode: settings.shipping_origin_postal_code,
        collectionMethod: settings.shipping_origin_collection_method || 'pickup',
      },
      destination: {
        name: address.recipient_name,
        phone: address.phone,
        address: [address.address_line1, address.address_line2].filter(Boolean).join(', '),
        areaId: address.area_id,
        postalCode: address.postal_code,
      },
      courierCompany: order.shipping_courier_code,
      courierType: order.shipping_service_code,
      referenceId: order.order_number,
      itemName: `Order ${order.order_number}`,
      valueIdr: Number(order.total || 0),
      weightGrams: Number(order.shipping_weight_grams || 1000),
    })

    if (!result.ok) {
      const status = result.reason === 'insufficient_balance' || result.reason === 'unconfigured' ? 503 : 502
      return NextResponse.json({ message: FAILURE_MESSAGES[result.reason], reason: result.reason }, { status })
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('orders')
      .update({
        biteship_order_id: result.data.biteshipOrderId,
        biteship_status: result.data.status,
        tracking_number: result.data.waybillId || result.data.biteshipOrderId,
      })
      .eq('id', orderId)
      .select('tracking_number, biteship_order_id, biteship_status')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ ok: true, order: updated })
  } catch (error) {
    console.error('Error creating Biteship shipment:', error)
    return NextResponse.json({ message: 'Gagal membuat pengiriman' }, { status: 500 })
  }
}

// Refreshes biteship_status without booking again — used before printing so
// the resi shows the latest state (e.g. courier already picked it up).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!(await isAdminUser(caller))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = getServiceClient()
    const order = await loadOrder(serviceClient, orderId)

    if (!order?.biteship_order_id) {
      return NextResponse.json({ message: 'Order ini belum punya pengiriman Biteship.' }, { status: 404 })
    }

    const result = await getBiteshipOrder(order.biteship_order_id)

    if (!result.ok) {
      return NextResponse.json({ message: FAILURE_MESSAGES[result.reason], reason: result.reason }, { status: 502 })
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('orders')
      .update({ biteship_status: result.data.status })
      .eq('id', orderId)
      .select('tracking_number, biteship_order_id, biteship_status')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ ok: true, order: updated })
  } catch (error) {
    console.error('Error refreshing Biteship shipment:', error)
    return NextResponse.json({ message: 'Gagal memuat status pengiriman' }, { status: 500 })
  }
}
