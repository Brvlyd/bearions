'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'en' | 'id'

type Translations = {
  [key: string]: {
    en: string
    id: string
  }
}

const translations: Translations = {
  // Header & Navigation
  'nav.catalog': { en: 'Catalog', id: 'Katalog' },
  'nav.myOrders': { en: 'My Orders', id: 'Pesanan Saya' },
  'nav.community': { en: 'Community', id: 'Komunitas' },
  'nav.contact': { en: 'Contact Us', id: 'Hubungi Kami' },
  'nav.cart': { en: 'Shopping Cart', id: 'Keranjang Belanja' },
  'nav.signIn': { en: 'Sign in', id: 'Masuk' },
  'nav.signUp': { en: 'Sign up', id: 'Daftar' },
  'nav.profile': { en: 'Profile', id: 'Profil' },
  'nav.dashboard': { en: 'Dashboard', id: 'Dasbor' },
  'nav.logout': { en: 'Logout', id: 'Keluar' },
  
  // Language selector
  'lang.english': { en: 'English (US)', id: 'Bahasa Inggris (US)' },
  'lang.indonesian': { en: 'Bahasa Indonesia', id: 'Bahasa Indonesia' },
  
  // Login Page
  'login.title': { en: 'Welcome Back', id: 'Selamat Datang Kembali' },
  'login.subtitle': { en: 'Sign in to your account', id: 'Masuk ke akun Anda' },
  'login.email': { en: 'Email', id: 'Email' },
  'login.emailPlaceholder': { en: 'you@example.com', id: 'anda@contoh.com' },
  'login.password': { en: 'Password', id: 'Kata Sandi' },
  'login.passwordPlaceholder': { en: '••••••••', id: '••••••••' },
  'login.submit': { en: 'Sign In', id: 'Masuk' },
  'login.submitting': { en: 'Signing in...', id: 'Memproses...' },
  'login.noAccount': { en: "Don't have an account?", id: 'Belum punya akun?' },
  'login.signUpLink': { en: 'Sign up', id: 'Daftar' },
  'login.backToStore': { en: '← Back to store', id: '← Kembali ke toko' },
  'login.errorInvalidEmail': { en: 'Please enter a valid email address', id: 'Masukkan alamat email yang valid' },
  'login.errorPasswordLength': { en: 'Password must be at least 6 characters', id: 'Kata sandi minimal 6 karakter' },
  'login.errorFailed': { en: 'Login failed. Please check your credentials.', id: 'Login gagal. Periksa kredensial Anda.' },
  'login.errorEmailNotConfirmed': { en: 'Please verify your email before logging in. Check your inbox (and spam folder) for the confirmation link.', id: 'Verifikasi email Anda sebelum login. Cek inbox (dan folder spam) untuk link konfirmasi.' },
  'login.errorInvalidCredentials': { en: 'Invalid email or password. Please try again.', id: 'Email atau kata sandi salah. Silakan coba lagi.' },
  'login.errorRoleDetermination': { en: 'Unable to determine user role', id: 'Tidak dapat menentukan peran pengguna' },
  
  // Register Page
  'register.title': { en: 'Create Account', id: 'Buat Akun' },
  'register.subtitle': { en: 'Join Bearions today', id: 'Bergabung dengan Bearions' },
  'register.fullName': { en: 'Full Name', id: 'Nama Lengkap' },
  'register.fullNamePlaceholder': { en: 'John Doe', id: 'Budi Santoso' },
  'register.phone': { en: 'Phone Number', id: 'Nomor Telepon' },
  'register.phoneHelp': { en: 'Indonesian format: 08xx-xxxx-xxxx', id: 'Format Indonesia: 08xx-xxxx-xxxx' },
  'register.address': { en: 'Address', id: 'Alamat' },
  'register.addressOptional': { en: 'Address (Optional)', id: 'Alamat (Opsional)' },
  'register.confirmPassword': { en: 'Confirm Password', id: 'Konfirmasi Kata Sandi' },
  'register.passwordHelp': { en: 'At least 6 characters', id: 'Minimal 6 karakter' },
  'register.submit': { en: 'Create Account', id: 'Buat Akun' },
  'register.submitting': { en: 'Creating account...', id: 'Membuat akun...' },
  'register.haveAccount': { en: 'Already have an account?', id: 'Sudah punya akun?' },
  'register.signInLink': { en: 'Sign in', id: 'Masuk' },
  'register.errorInvalidEmail': { en: 'Please enter a valid email address', id: 'Mohon masukkan alamat email yang valid' },
  'register.errorNameRequired': { en: 'Please enter your full name', id: 'Mohon masukkan nama lengkap Anda' },
  'register.errorInvalidPhone': { en: 'Please enter a valid Indonesian phone number', id: 'Mohon masukkan nomor telepon Indonesia yang valid' },
  'register.errorPasswordMatch': { en: 'Passwords do not match', id: 'Kata sandi tidak cocok' },
  'register.errorPasswordLength': { en: 'Password must be at least 6 characters', id: 'Kata sandi minimal 6 karakter' },
  'register.successEmailConfirm': { 
    en: '✅ Registration successful!\n\n📧 Please check your email and click the confirmation link we sent.\n\n⚠️ You must confirm your email before you can login.', 
    id: '✅ Pendaftaran berhasil!\n\n📧 Silakan cek email Anda dan klik link konfirmasi yang kami kirim.\n\n⚠️ Anda harus mengkonfirmasi email terlebih dahulu sebelum bisa login.' 
  },
  'register.successLogin': { en: 'Account created! Redirecting to login...', id: 'Akun berhasil dibuat! Mengarahkan ke halaman login...' },
  'register.errorFailed': { en: 'Registration failed. Please try again.', id: 'Pendaftaran gagal. Silakan coba lagi.' },
  
  // Cart Page
  'cart.title': { en: 'Shopping Cart', id: 'Keranjang Belanja' },
  'cart.clearCart': { en: 'Clear Cart', id: 'Kosongkan Keranjang' },
  'cart.empty': { en: 'Your cart is empty', id: 'Keranjang Anda kosong' },
  'cart.startShopping': { en: 'Start Shopping', id: 'Mulai Belanja' },
  'cart.outOfStock': { en: 'Out of stock', id: 'Stok habis' },
  'cart.insufficientStock': { en: 'Only {stock} in stock', id: 'Hanya {stock} stok tersedia' },
  'cart.remove': { en: 'Remove from cart', id: 'Hapus dari keranjang' },
  'cart.summary': { en: 'Order Summary', id: 'Ringkasan Pesanan' },
  'cart.subtotal': { en: 'Subtotal', id: 'Subtotal' },
  'cart.tax': { en: 'Tax (11%)', id: 'Pajak (11%)' },
  'cart.shipping': { en: 'Shipping', id: 'Ongkir' },
  'cart.total': { en: 'Total', id: 'Total' },
  'cart.checkout': { en: 'Proceed to Checkout', id: 'Lanjut ke Checkout' },
  'cart.secureCheckout': { en: '🔒 Secure Checkout', id: '🔒 Checkout Aman' },
  
  // Checkout Page
  'checkout.title': { en: 'Checkout', id: 'Checkout' },
  'checkout.shipping': { en: 'Shipping Address', id: 'Alamat Pengiriman' },
  'checkout.payment': { en: 'Payment Method', id: 'Metode Pembayaran' },
  'checkout.review': { en: 'Review Order', id: 'Tinjau Pesanan' },
  'checkout.selectAddress': { en: 'Select a shipping address', id: 'Pilih alamat pengiriman' },
  'checkout.addNewAddress': { en: '+ Add New Address', id: '+ Tambah Alamat Baru' },
  'checkout.recipientName': { en: 'Recipient Name', id: 'Nama Penerima' },
  'checkout.recipientPhone': { en: 'Phone Number', id: 'Nomor Telepon' },
  'checkout.addressLine1': { en: 'Street Address', id: 'Alamat Jalan' },
  'checkout.addressLine2': { en: 'Apartment, suite, etc. (optional)', id: 'Apartemen, unit, dll. (opsional)' },
  'checkout.city': { en: 'City', id: 'Kota' },
  'checkout.province': { en: 'Province', id: 'Provinsi' },
  'checkout.postalCode': { en: 'Postal Code', id: 'Kode Pos' },
  'checkout.saveAddress': { en: 'Save Address', id: 'Simpan Alamat' },
  'checkout.cancel': { en: 'Cancel', id: 'Batal' },
  'checkout.continue': { en: 'Continue to Payment', id: 'Lanjut ke Pembayaran' },
  'checkout.back': { en: 'Back', id: 'Kembali' },
  'checkout.reviewOrder': { en: 'Review Order', id: 'Tinjau Pesanan' },
  'checkout.placeOrder': { en: 'Place Order', id: 'Buat Pesanan' },
  'checkout.processing': { en: 'Processing...', id: 'Memproses...' },
  'checkout.orderNotes': { en: 'Order Notes (Optional)', id: 'Catatan Pesanan (Opsional)' },
  'checkout.orderNotesPlaceholder': { en: 'Special instructions for your order...', id: 'Instruksi khusus untuk pesanan Anda...' },
  'checkout.edit': { en: 'Edit', id: 'Ubah' },
  
  // Payment Methods
  'payment.bankTransfer': { en: 'Bank Transfer', id: 'Transfer Bank' },
  'payment.eWallet': { en: 'E-Wallet (GoPay, OVO, DANA)', id: 'E-Wallet (GoPay, OVO, DANA)' },
  'payment.cod': { en: 'Cash on Delivery (COD)', id: 'Bayar di Tempat (COD)' },
  
  // Product Page
  'product.addToCart': { en: 'Add to Cart', id: 'Tambah ke Keranjang' },
  'product.adding': { en: 'Adding...', id: 'Menambahkan...' },
  'product.outOfStock': { en: 'Out of Stock', id: 'Stok Habis' },
  'product.size': { en: 'Size', id: 'Ukuran' },
  'product.color': { en: 'Color', id: 'Warna' },
  'product.quantity': { en: 'Quantity', id: 'Jumlah' },
  'product.max': { en: 'Max', id: 'Maks' },
  'product.description': { en: 'Description', id: 'Deskripsi' },
  'product.category': { en: 'Category', id: 'Kategori' },
  'product.stock': { en: 'Stock', id: 'Stok' },
  'product.available': { en: 'available', id: 'tersedia' },
  
  // Orders Page
  'orders.title': { en: 'My Orders', id: 'Pesanan Saya' },
  'orders.empty': { en: 'No orders yet', id: 'Belum ada pesanan' },
  'orders.startShoppingNow': { en: 'Start shopping now', id: 'Mulai belanja sekarang' },
  'orders.orderNumber': { en: 'Order Number', id: 'Nomor Pesanan' },
  'orders.date': { en: 'Date', id: 'Tanggal' },
  'orders.status': { en: 'Status', id: 'Status' },
  'orders.total': { en: 'Total', id: 'Total' },
  'orders.viewDetails': { en: 'View Details', id: 'Lihat Detail' },
  
  // Order Status
  'status.pending': { en: 'Pending', id: 'Menunggu' },
  'status.confirmed': { en: 'Confirmed', id: 'Dikonfirmasi' },
  'status.processing': { en: 'Processing', id: 'Diproses' },
  'status.shipped': { en: 'Shipped', id: 'Dikirim' },
  'status.delivered': { en: 'Delivered', id: 'Terkirim' },
  'status.cancelled': { en: 'Cancelled', id: 'Dibatalkan' },
  'status.refunded': { en: 'Refunded', id: 'Dikembalikan' },
  
  // Admin Dashboard
  'admin.title': { en: 'Admin Dashboard', id: 'Dasbor Admin' },
  'admin.analytics': { en: 'Analytics', id: 'Analitik' },
  'admin.products': { en: 'Products', id: 'Produk' },
  'admin.addProduct': { en: 'Add Product', id: 'Tambah Produk' },
  'admin.editProduct': { en: 'Edit Product', id: 'Edit Produk' },
  'admin.logout': { en: 'Logout', id: 'Keluar' },
  'admin.verifyingAccess': { en: 'Verifying access...', id: 'Memverifikasi akses...' },
  'admin.createProduct': { en: 'Create Product', id: 'Buat Produk' },
  'admin.creating': { en: 'Creating...', id: 'Membuat...' },
  'admin.saveChanges': { en: 'Save Changes', id: 'Simpan Perubahan' },
  'admin.saving': { en: 'Saving...', id: 'Menyimpan...' },
  'admin.cancel': { en: 'Cancel', id: 'Batal' },
  'admin.filterCategory': { en: 'Filter by Category', id: 'Filter Kategori' },
  'admin.allCategories': { en: 'All Categories', id: 'Semua Kategori' },
  
  // Common
  'common.loading': { en: 'Loading...', id: 'Memuat...' },
  'common.save': { en: 'Save', id: 'Simpan' },
  'common.delete': { en: 'Delete', id: 'Hapus' },
  'common.edit': { en: 'Edit', id: 'Ubah' },
  'common.view': { en: 'View', id: 'Lihat' },
  'common.search': { en: 'Search', id: 'Cari' },
  'common.filter': { en: 'Filter', id: 'Filter' },
  'common.sort': { en: 'Sort', id: 'Urutkan' },
  'common.required': { en: 'Required', id: 'Wajib' },
  'common.optional': { en: 'Optional', id: 'Opsional' },
  
  // Home Page
  'home.hero.title': { en: 'Welcome to Bearions', id: 'Selamat Datang di Bearions' },
  'home.hero.subtitle': { en: 'Your One-Stop Shop for Everything', id: 'Toko Serba Ada untuk Segala Kebutuhan' },
  'home.hero.cta': { en: 'Shop Now', id: 'Belanja Sekarang' },
  'home.hero.learnMore': { en: 'Learn More', id: 'Pelajari Lebih Lanjut' },
  'home.featured.title': { en: 'Featured Products', id: 'Produk Unggulan' },
  'home.featured.viewAll': { en: 'View All Products', id: 'Lihat Semua Produk' },
  'home.features.quality': { en: 'Premium Quality', id: 'Kualitas Premium' },
  'home.features.qualityDesc': { en: 'Only the best products for you', id: 'Hanya produk terbaik untuk Anda' },
  'home.features.shipping': { en: 'Free Shipping', id: 'Gratis Ongkir' },
  'home.features.shippingDesc': { en: 'On orders over Rp 100.000', id: 'Untuk pembelian di atas Rp 100.000' },
  'home.features.returns': { en: 'Easy Returns', id: 'Retur Mudah' },
  'home.features.returnsDesc': { en: '30-day money back guarantee', id: 'Garansi uang kembali 30 hari' },
  'home.features.support': { en: '24/7 Support', id: 'Dukungan 24/7' },
  'home.features.supportDesc': { en: "We're here to help anytime", id: 'Kami siap membantu kapan saja' },
  
  // Catalog Page
  'catalog.title': { en: 'Product Catalog', id: 'Katalog Produk' },
  'catalog.allProducts': { en: 'All Products', id: 'Semua Produk' },
  'catalog.searchPlaceholder': { en: 'Search products...', id: 'Cari produk...' },
  'catalog.filterByCategory': { en: 'Filter by Category', id: 'Filter Kategori' },
  'catalog.sortBy': { en: 'Sort by', id: 'Urutkan' },
  'catalog.sortNewest': { en: 'Newest', id: 'Terbaru' },
  'catalog.sortPriceLow': { en: 'Price: Low to High', id: 'Harga: Rendah ke Tinggi' },
  'catalog.sortPriceHigh': { en: 'Price: High to Low', id: 'Harga: Tinggi ke Rendah' },
  'catalog.sortNameAZ': { en: 'Name: A-Z', id: 'Nama: A-Z' },
  'catalog.noProducts': { en: 'No products found', id: 'Produk tidak ditemukan' },
  'catalog.tryDifferentFilter': { en: 'Try adjusting your filters', id: 'Coba ubah filter Anda' },
  
  // Profile Page
  'profile.title': { en: 'My Profile', id: 'Profil Saya' },
  'profile.personalInfo': { en: 'Personal Information', id: 'Informasi Pribadi' },
  'profile.fullName': { en: 'Full Name', id: 'Nama Lengkap' },
  'profile.email': { en: 'Email', id: 'Email' },
  'profile.phone': { en: 'Phone Number', id: 'Nomor Telepon' },
  'profile.address': { en: 'Address', id: 'Alamat' },
  'profile.updateProfile': { en: 'Update Profile', id: 'Perbarui Profil' },
  'profile.updating': { en: 'Updating...', id: 'Memperbarui...' },
  'profile.changePassword': { en: 'Change Password', id: 'Ubah Kata Sandi' },
  'profile.currentPassword': { en: 'Current Password', id: 'Kata Sandi Saat Ini' },
  'profile.newPassword': { en: 'New Password', id: 'Kata Sandi Baru' },
  'profile.confirmNewPassword': { en: 'Confirm New Password', id: 'Konfirmasi Kata Sandi Baru' },
  'profile.updateSuccess': { en: 'Profile updated successfully', id: 'Profil berhasil diperbarui' },
  'profile.updateError': { en: 'Failed to update profile', id: 'Gagal memperbarui profil' },
  
  // Community Page
  'community.title': { en: 'Community', id: 'Komunitas' },
  'community.subtitle': { en: 'Join our growing community', id: 'Bergabung dengan komunitas kami' },
  'community.description': { en: 'Connect with other customers, share your experiences, and get the latest updates.', id: 'Terhubung dengan pelanggan lain, bagikan pengalaman Anda, dan dapatkan update terbaru.' },
  'community.joinDiscord': { en: 'Join our Discord', id: 'Gabung Discord Kami' },
  'community.followInstagram': { en: 'Follow on Instagram', id: 'Ikuti di Instagram' },
  'community.followTwitter': { en: 'Follow on Twitter', id: 'Ikuti di Twitter' },
  'community.testimonials': { en: 'Customer Testimonials', id: 'Testimoni Pelanggan' },
  'community.shareYourStory': { en: 'Share Your Story', id: 'Bagikan Cerita Anda' },
  
  // Contact Page
  'contact.title': { en: 'Contact Us', id: 'Hubungi Kami' },
  'contact.subtitle': { en: 'We\'d love to hear from you', id: 'Kami ingin mendengar dari Anda' },
  'contact.getInTouch': { en: 'Get in Touch', id: 'Hubungi Kami' },
  'contact.name': { en: 'Your Name', id: 'Nama Anda' },
  'contact.emailLabel': { en: 'Your Email', id: 'Email Anda' },
  'contact.subject': { en: 'Subject', id: 'Subjek' },
  'contact.message': { en: 'Message', id: 'Pesan' },
  'contact.messagePlaceholder': { en: 'Tell us how we can help...', id: 'Beritahu kami bagaimana kami bisa membantu...' },
  'contact.send': { en: 'Send Message', id: 'Kirim Pesan' },
  'contact.sending': { en: 'Sending...', id: 'Mengirim...' },
  'contact.info': { en: 'Contact Information', id: 'Informasi Kontak' },
  'contact.address': { en: 'Address', id: 'Alamat' },
  'contact.phone': { en: 'Phone', id: 'Telepon' },
  'contact.email': { en: 'Email', id: 'Email' },
  'contact.hours': { en: 'Business Hours', id: 'Jam Operasional' },
  'contact.hoursWeekday': { en: 'Monday - Friday: 9:00 AM - 6:00 PM', id: 'Senin - Jumat: 09:00 - 18:00' },
  'contact.hoursWeekend': { en: 'Saturday - Sunday: 10:00 AM - 4:00 PM', id: 'Sabtu - Minggu: 10:00 - 16:00' },
  
  // Admin Products Page
  'adminProducts.title': { en: 'Product Management', id: 'Manajemen Produk' },
  'adminProducts.addNew': { en: 'Add New Product', id: 'Tambah Produk Baru' },
  'adminProducts.search': { en: 'Search products...', id: 'Cari produk...' },
  'adminProducts.name': { en: 'Name', id: 'Nama' },
  'adminProducts.category': { en: 'Category', id: 'Kategori' },
  'adminProducts.price': { en: 'Price', id: 'Harga' },
  'adminProducts.stock': { en: 'Stock', id: 'Stok' },
  'adminProducts.actions': { en: 'Actions', id: 'Aksi' },
  'adminProducts.edit': { en: 'Edit', id: 'Edit' },
  'adminProducts.delete': { en: 'Delete', id: 'Hapus' },
  'adminProducts.confirmDelete': { en: 'Are you sure you want to delete this product?', id: 'Yakin ingin menghapus produk ini?' },
  'adminProducts.deleteSuccess': { en: 'Product deleted successfully', id: 'Produk berhasil dihapus' },
  'adminProducts.deleteError': { en: 'Failed to delete product', id: 'Gagal menghapus produk' },
  
  // Admin Add/Edit Product
  'adminProduct.productName': { en: 'Product Name', id: 'Nama Produk' },
  'adminProduct.productNamePlaceholder': { en: 'Enter product name', id: 'Masukkan nama produk' },
  'adminProduct.description': { en: 'Description', id: 'Deskripsi' },
  'adminProduct.descriptionPlaceholder': { en: 'Enter product description', id: 'Masukkan deskripsi produk' },
  'adminProduct.price': { en: 'Price (Rp)', id: 'Harga (Rp)' },
  'adminProduct.pricePlaceholder': { en: '50000', id: '50000' },
  'adminProduct.stock': { en: 'Stock', id: 'Stok' },
  'adminProduct.stockPlaceholder': { en: '100', id: '100' },
  'adminProduct.category': { en: 'Category', id: 'Kategori' },
  'adminProduct.selectCategory': { en: 'Select a category', id: 'Pilih kategori' },
  'adminProduct.images': { en: 'Product Images', id: 'Gambar Produk' },
  'adminProduct.uploadImages': { en: 'Upload Images', id: 'Upload Gambar' },
  'adminProduct.createSuccess': { en: 'Product created successfully', id: 'Produk berhasil dibuat' },
  'adminProduct.createError': { en: 'Failed to create product', id: 'Gagal membuat produk' },
  'adminProduct.updateSuccess': { en: 'Product updated successfully', id: 'Produk berhasil diperbarui' },
  'adminProduct.updateError': { en: 'Failed to update product', id: 'Gagal memperbarui produk' },
  
  // Admin Dashboard
  'adminDashboard.welcome': { en: 'Welcome back, Admin!', id: 'Selamat datang kembali, Admin!' },
  'adminDashboard.overview': { en: 'Dashboard Overview', id: 'Ringkasan Dasbor' },
  'adminDashboard.overviewDesc': { en: 'Overview of your store performance', id: 'Ringkasan performa toko Anda' },
  'adminDashboard.totalRevenue': { en: 'Total Revenue', id: 'Total Pendapatan' },
  'adminDashboard.totalOrders': { en: 'Total Orders', id: 'Total Pesanan' },
  'adminDashboard.totalProducts': { en: 'Total Products', id: 'Total Produk' },
  'adminDashboard.totalCustomers': { en: 'Total Customers', id: 'Total Pelanggan' },
  'adminDashboard.recentOrders': { en: 'Recent Orders', id: 'Pesanan Terbaru' },
  'adminDashboard.viewAll': { en: 'View All', id: 'Lihat Semua' },
  'adminDashboard.lowStockAlert': { en: 'Low Stock Alert', id: 'Peringatan Stok Rendah' },
  'adminDashboard.productsLowStock': { en: 'products are running low on stock', id: 'produk stoknya hampir habis' },
  
  // Admin Sidebar
  'adminSidebar.adminPanel': { en: 'Admin Panel', id: 'Panel Admin' },
  'adminSidebar.mainMenu': { en: 'Main Menu', id: 'Menu Utama' },
  'adminSidebar.dashboard': { en: 'Dashboard', id: 'Dasbor' },
  'adminSidebar.products': { en: 'Products', id: 'Produk' },
  'adminSidebar.addProduct': { en: 'Add Product', id: 'Tambah Produk' },
  'adminSidebar.quickStats': { en: 'Quick Stats', id: 'Statistik Cepat' },
  'adminSidebar.ordersToday': { en: 'Orders Today', id: 'Pesanan Hari Ini' },
  'adminSidebar.revenue': { en: 'Revenue', id: 'Pendapatan' },
  'adminSidebar.viewStore': { en: 'View Store', id: 'Lihat Toko' },
  
  // Admin Header & General
  'admin.viewStore': { en: 'View Store', id: 'Lihat Toko' },
  'admin.loggedIn': { en: 'ONLINE', id: 'ONLINE' },
  'admin.administrator': { en: 'Administrator', id: 'Administrator' },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    // Load language from localStorage
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && (savedLang === 'en' || savedLang === 'id')) {
      setLanguageState(savedLang)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[key]?.[language] || key
    
    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue))
      })
    }
    
    return translation
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
