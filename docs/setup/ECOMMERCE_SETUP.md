# E-Commerce System Setup Guide - Bearion

## 📦 Sistem Keranjang dan Pembayaran Lengkap

Sistem e-commerce yang telah dibuat mencakup semua fitur yang diperlukan untuk website tata busana komersial yang siap pakai.

---

## 🗄️ Database Schema

### 1. **Setup Database**

Jalankan SQL schema untuk membuat semua tabel yang diperlukan:

```bash
# Buka Supabase Dashboard > SQL Editor
# Copy paste isi file: cart-orders-schema.sql
# Execute SQL
```

### Tabel yang Dibuat:

#### **Cart Tables**
- `carts` - Keranjang belanja user
- `cart_items` - Item dalam keranjang

#### **Order Tables**
- `orders` - Data pesanan lengkap
- `order_items` - Item dalam pesanan

#### **Shipping Tables**
- `shipping_addresses` - Alamat pengiriman user

#### **Payment Tables**
- `payments` - Transaksi pembayaran

#### **Additional Tables**
- `wishlists` - Wishlist produk
- `product_reviews` - Review dan rating produk

### Features dalam Database:
- ✅ Row Level Security (RLS) untuk keamanan
- ✅ Auto-generate order number
- ✅ Automatic stock update after order
- ✅ Timestamp triggers
- ✅ Views untuk summary data
- ✅ Indexes untuk performa optimal

---

## 📁 File Structure

```
lib/
├── cart.ts           # Cart service functions
├── orders.ts         # Order management
├── shipping.ts       # Shipping address management
├── payments.ts       # Payment processing
└── supabase.ts       # Types & Supabase client

components/
├── CartItem.tsx      # Cart item component
└── CartButton.tsx    # Cart button with counter

app/
├── cart/
│   └── page.tsx      # Shopping cart page
├── checkout/
│   └── page.tsx      # Checkout flow
└── orders/
    ├── page.tsx      # Order history
    └── [orderNumber]/
        └── page.tsx  # Order detail & tracking
```

---

## 🎯 Fitur Utama

### 1. **Shopping Cart (Keranjang Belanja)**
- ✅ Add to cart dengan quantity
- ✅ Update quantity
- ✅ Remove items
- ✅ Clear cart
- ✅ Cart counter di navbar
- ✅ Size & color variants
- ✅ Stock validation
- ✅ Price calculation
- ✅ Persistent cart (tersimpan di database)

### 2. **Checkout System**
- ✅ Multi-step checkout process:
  - **Step 1:** Shipping address
  - **Step 2:** Payment method
  - **Step 3:** Order review
- ✅ Shipping address management
- ✅ Add/edit/delete addresses
- ✅ Default address selection
- ✅ Order notes
- ✅ Real-time total calculation

### 3. **Payment Integration**
Mendukung multiple payment methods:
- ✅ Bank Transfer
- ✅ E-Wallet (GoPay, OVO, DANA)
- ✅ Cash on Delivery (COD)
- ✅ Payment proof upload
- ✅ Payment verification system
- ✅ Payment status tracking

### 4. **Order Management**
- ✅ Order history
- ✅ Order tracking with status timeline
- ✅ Order details dengan items
- ✅ Tracking number integration
- ✅ Order status updates:
  - Pending
  - Confirmed
  - Processing
  - Shipped
  - Delivered
  - Cancelled
  - Refunded

### 5. **Additional Features**
- ✅ Wishlist system
- ✅ Product reviews & ratings
- ✅ Email notifications (ready for integration)
- ✅ Invoice generation (ready for integration)
- ✅ Admin order management

---

## 🚀 Cara Menggunakan

### 1. **Setup Database**
```bash
# 1. Buka Supabase Dashboard
# 2. SQL Editor > New Query
# 3. Copy paste cart-orders-schema.sql
# 4. Run query
```

### 2. **Install Dependencies** (jika belum)
```bash
npm install @supabase/supabase-js lucide-react
```

### 3. **Update Header Component**
Tambahkan CartButton ke Header:

```tsx
// components/Header.tsx
import CartButton from './CartButton'

// Tambahkan di navigation
<CartButton />
```

### 4. **Add to Cart Button**
Contoh implementasi di product page:

```tsx
import { cartService } from '@/lib/cart'
import { supabase } from '@/lib/supabase'

const handleAddToCart = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    router.push('/login')
    return
  }

  try {
    await cartService.addToCart(
      user.id,
      productId,
      1, // quantity
      selectedSize,
      selectedColor
    )
    
    alert('Added to cart!')
  } catch (error) {
    console.error(error)
    alert('Failed to add to cart')
  }
}
```

---

## 💳 Payment Gateway Integration

### Siap untuk Integrasi:

#### **1. Midtrans (Indonesia)**
```typescript
// lib/midtrans.ts
export const createMidtransPayment = async (order: Order) => {
  // Implement Midtrans Snap API
  // https://docs.midtrans.com/
}
```

#### **2. Stripe (International)**
```typescript
// lib/stripe.ts
export const createStripePayment = async (order: Order) => {
  // Implement Stripe API
  // https://stripe.com/docs
}
```

#### **3. Xendit**
```typescript
// lib/xendit.ts
export const createXenditInvoice = async (order: Order) => {
  // Implement Xendit API
  // https://developers.xendit.co/
}
```

---

## 📊 Admin Features

### Order Management (untuk Admin)
```typescript
// Get all orders
const orders = await orderService.getAllOrders({
  status: 'pending',
  limit: 50
})

// Update order status
await orderService.updateOrderStatus(orderId, 'confirmed')

// Update tracking
await orderService.updateTrackingInfo(
  orderId,
  'JNE12345678',
  'JNE',
  '2026-01-15'
)

// Verify payment
await paymentService.verifyPayment(paymentId, true)
```

---

## 🔒 Security Features

1. **Row Level Security (RLS)**
   - Users can only access their own cart
   - Users can only see their own orders
   - Admin can access all data

2. **Stock Validation**
   - Prevent overselling
   - Real-time stock check

3. **Payment Verification**
   - Manual verification system
   - Payment proof upload

---

## 📱 Mobile Responsive

Semua halaman sudah responsive:
- ✅ Cart page
- ✅ Checkout flow
- ✅ Order history
- ✅ Order detail

---

## 🎨 Customization

### Shipping Cost
```typescript
// app/checkout/page.tsx
const shippingCost = 15000 // Ubah sesuai kebutuhan

// Atau implement dynamic shipping cost:
const calculateShipping = (city: string) => {
  // Logic based on city/province
}
```

### Tax Calculation
```typescript
// Current: 11% PPN
const tax = subtotal * 0.11

// Customize as needed
```

### Payment Methods
Tambah/kurangi payment methods di:
```typescript
// app/checkout/page.tsx
// Section: Payment Method
```

---

## 📧 Email Notifications (Next Step)

Siap untuk integrasi email:

```typescript
// lib/email.ts
export const sendOrderConfirmation = async (order: Order) => {
  // Implement with:
  // - SendGrid
  // - Resend
  // - AWS SES
  // - Mailgun
}
```

---

## 🧪 Testing

### Test Flow:
1. ✅ Add product to cart
2. ✅ Update quantities
3. ✅ Proceed to checkout
4. ✅ Add shipping address
5. ✅ Select payment method
6. ✅ Place order
7. ✅ View order history
8. ✅ Track order status

---

## 📝 Notes

- **Stock Management**: Stock otomatis berkurang saat order dibuat
- **Order Number**: Auto-generate dengan format `BRN[YYYYMMDD][XXXX]`
- **Guest Checkout**: Bisa diaktifkan dengan modifikasi kecil
- **Multi-Currency**: Siap untuk implementasi multi-currency
- **Discount System**: Schema sudah support discount

---

## 🚀 Production Ready

Sistem ini sudah production-ready dengan fitur:
- ✅ Complete cart system
- ✅ Secure checkout flow
- ✅ Multiple payment methods
- ✅ Order tracking
- ✅ Admin management
- ✅ Mobile responsive
- ✅ Optimized database
- ✅ Security implemented

---

## 🎉 Selamat!

Sistem keranjang dan pembayaran lengkap untuk Bearion sudah siap digunakan!

Untuk pertanyaan atau customization lebih lanjut, refer ke dokumentasi di masing-masing file service.
