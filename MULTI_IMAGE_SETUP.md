# Multiple Images & Carousel Feature

Sistem multiple images untuk product dengan auto-carousel telah berhasil diimplementasikan.

## 🎯 Fitur yang Ditambahkan

### 1. **Multiple Images per Product**
- Admin bisa upload banyak gambar untuk satu product
- Gambar bisa diurutkan dengan drag/reorder
- Preview semua gambar dalam grid
- Delete gambar individual

### 2. **Auto Carousel di User View**
- Otomatis berganti gambar setiap 3 detik
- Navigation buttons (prev/next)
- Dots indicator untuk switch manual
- Image counter (1/5, 2/5, etc)
- Smooth transitions

### 3. **Admin Upload Interface**
- Drag & drop multiple files sekaligus
- Browse files (multiple selection)
- Grid preview dengan thumbnails
- Reorder dengan arrow buttons
- Remove individual images

## 🗄️ Database Setup

### Jalankan SQL Schema

Jalankan file [product-images-schema.sql](product-images-schema.sql) di Supabase SQL Editor:

```sql
-- Table: product_images
-- Menyimpan multiple images per product dengan order
```

Schema ini membuat:
- Table `product_images` untuk store multiple images
- Foreign key ke `products.id` dengan CASCADE delete
- `display_order` untuk urutan tampilan
- RLS policies untuk admin dan public access

## 📁 File yang Dibuat/Diupdate

### New Components:
1. **[components/MultiImageUpload.tsx](components/MultiImageUpload.tsx)**
   - Upload multiple images
   - Drag & drop support
   - Reorder images
   - Delete individual images
   - Preview grid

2. **[components/ImageCarousel.tsx](components/ImageCarousel.tsx)**
   - Auto-play carousel
   - Navigation controls
   - Dots indicator
   - Image counter
   - Responsive design

### Updated Files:
3. **[lib/products.ts](lib/products.ts)**
   - `saveProductImages()` - Save multiple images
   - `getProductImages()` - Get product images with order
   - `deleteProductImage()` - Delete specific image

4. **[app/admin/dashboard/add-product/page.tsx](app/admin/dashboard/add-product/page.tsx)**
   - Use MultiImageUpload component
   - Save multiple images on create

5. **[app/admin/dashboard/edit-product/[id]/page.tsx](app/admin/dashboard/edit-product/[id]/page.tsx)**
   - Load existing product images
   - Update multiple images
   - Use MultiImageUpload component

6. **[components/ProductCard.tsx](components/ProductCard.tsx)**
   - Load product images
   - Display ImageCarousel
   - Auto-play carousel di catalog

## 🎨 UI Improvements

### MultiImageUpload Features:
- ✅ Padding yang sama dengan input lainnya (px-4 py-3)
- ✅ Grid layout untuk preview images
- ✅ Hover effects untuk show controls
- ✅ Reorder buttons dengan GripVertical icon
- ✅ Image numbering (1, 2, 3...)
- ✅ Responsive grid (2 cols mobile, 3 cols desktop)

### ImageCarousel Features:
- ✅ Auto-play dengan configurable interval
- ✅ Smooth transitions
- ✅ Hover untuk show navigation
- ✅ Dots indicator di bottom
- ✅ Image counter di top-right
- ✅ Navigation arrows (prev/next)

## 🚀 Cara Penggunaan

### Admin - Add Product:
1. Buka `/admin/dashboard/add-product`
2. Upload images dengan:
   - Drag & drop multiple files ke area upload
   - Atau klik "Browse Files" dan pilih multiple files
3. Reorder images:
   - Klik arrow buttons untuk pindah posisi
   - Gambar pertama = main image
4. Delete image: Hover dan klik tombol X
5. Submit form

### Admin - Edit Product:
1. Buka `/admin/dashboard/edit-product/[id]`
2. Lihat existing images di grid
3. Upload gambar baru
4. Reorder atau delete yang ada
5. Save changes

### User View:
1. Buka `/catalog` atau `/products/[id]`
2. ProductCard otomatis show carousel
3. Carousel auto-play setiap 3 detik
4. Hover untuk manual navigation
5. Click dots untuk jump ke specific image

## ⚙️ Technical Details

### Image Storage:
- Supabase Storage bucket: `product-images`
- Path: `products/{timestamp}-{random}.{ext}`
- Max size: 5MB per image
- Formats: JPG, PNG, GIF

### Database Structure:
```sql
product_images:
  - id (UUID)
  - product_id (FK to products)
  - image_url (TEXT)
  - display_order (INTEGER)
  - created_at (TIMESTAMP)
```

### Carousel Settings:
- Auto-play: `true` (default)
- Interval: `3000ms` (3 seconds)
- Transition: `500ms` fade
- Controls: Show on hover

## 🔄 Backward Compatibility

- Table `products.image_url` tetap ada
- Digunakan sebagai main/featured image
- Fallback jika tidak ada images di `product_images`
- Existing products tetap work

## 📝 Notes

1. **First Image = Main Image**: Gambar pertama di carousel otomatis jadi `products.image_url`
2. **Auto Delete**: Delete product otomatis delete semua images (CASCADE)
3. **Order Matters**: `display_order` menentukan urutan tampilan
4. **Performance**: Images loaded on-demand per product
5. **Responsive**: Grid dan carousel responsive untuk mobile

## 🎯 Next Steps (Optional)

- [ ] Add image zoom on click
- [ ] Add image optimization/compression
- [ ] Add bulk upload (folder)
- [ ] Add image captions/alt text
- [ ] Add lightbox gallery view
- [ ] Add video support
