# 🔧 Fix Image Loading Issue - Quick Guide

## ❌ Problem
```
GET http://localhost:3000/_next/image?url=%2Fimages%2Fbearion-tees.jpg&w=1080&q=75 400 (Bad Request)
```

Images gagal load karena:
1. ❌ File images tidak ada di `/public/images/`
2. ❌ Database mengarah ke local paths `/images/...`
3. ❌ Production memerlukan images di Supabase Storage

## ✅ Solution Implemented

### 1. **SafeImage Component** ✅
Komponen baru yang handle image errors dengan graceful fallback:

```typescript
// Otomatis fallback ke placeholder jika image tidak ada
<SafeImage 
  src={product.image_url} 
  alt={product.name}
  category={product.category}
/>
```

**Features:**
- ✅ Auto fallback ke placeholder
- ✅ Category-specific placeholders
- ✅ Error handling
- ✅ Supabase Storage support

### 2. **Image Utils Library** ✅
Helper functions untuk image management:

```typescript
import { getImageUrl, uploadProductImage } from '@/lib/image-utils'

// Convert any URL format ke valid URL
const imageUrl = getImageUrl(product.image_url)

// Upload to Supabase
const uploadedUrl = await uploadProductImage(file, productId)
```

**Functions:**
- `getImageUrl()` - Convert/validate URLs
- `uploadProductImage()` - Upload single image
- `uploadMultipleProductImages()` - Bulk upload
- `validateImageFile()` - Validate before upload
- `compressImage()` - Client-side compression

### 3. **Updated Components** ✅
- ✅ `ProductCard.tsx` - Menggunakan SafeImage
- ✅ `ImageCarousel.tsx` - Menggunakan SafeImage
- ✅ `next.config.ts` - Production-ready config

### 4. **Bulk Upload Script** ✅
Script untuk upload banyak images sekaligus:

```bash
# 1. Install tsx jika belum
npm install -D tsx

# 2. Buat folder dan add images
mkdir temp-images
cp your-images/* temp-images/

# 3. Set environment variable
# Add ke .env.local:
SUPABASE_SERVICE_KEY=your-service-key-here

# 4. Run upload
npm run upload-images
```

## 🚀 Quick Fix untuk Testing (Development)

### Option A: Use Placeholder URLs (Recommended untuk testing)

Run SQL di Supabase SQL Editor:

```sql
UPDATE products 
SET image_url = 'https://placehold.co/600x600/e5e7eb/1f2937?text=' || 
  CASE 
    WHEN category = 'Tops' THEN 'T-Shirt'
    WHEN category = 'Bottoms' THEN 'Pants'
    WHEN category = 'Accessories' THEN 'Accessories'
    WHEN category = 'Outerwear' THEN 'Jacket'
    ELSE 'Product'
  END
WHERE image_url LIKE '/images/%' OR image_url IS NULL;
```

### Option B: Set to NULL (Use SafeImage Fallback)

```sql
UPDATE products 
SET image_url = NULL
WHERE image_url LIKE '/images/%';
```

## 🎯 Production Setup (Before Launch)

### Step 1: Setup Supabase Storage

1. **Create Bucket:**
   - Buka Supabase Dashboard → Storage
   - Create new bucket: `product-images`
   - Set as Public bucket

2. **Set Policies:**
   ```sql
   -- Public read access
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'product-images' );

   -- Authenticated upload
   CREATE POLICY "Authenticated Upload"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'product-images' 
     AND auth.role() = 'authenticated'
   );
   ```

### Step 2: Upload Product Images

**Method 1: Via Admin Panel**
1. Login sebagai admin
2. Edit product
3. Upload images via UI
4. Images auto-upload ke Supabase

**Method 2: Bulk Upload Script**
```bash
# Prepare images
mkdir temp-images
# Add your product images here

# Get service key dari Supabase Dashboard → Settings → API → Service Role Key

# Add to .env.local
echo "SUPABASE_SERVICE_KEY=your-service-key" >> .env.local

# Upload all images
npm run upload-images

# Copy SQL output and run di Supabase
```

### Step 3: Update Database

Script akan generate SQL seperti ini:

```sql
UPDATE products
SET image_url = 'https://iktbpmqahpkboovgbbib.supabase.co/storage/v1/object/public/product-images/products/bearion-tees.jpg'
WHERE name ILIKE '%bearion%';
```

Run SQL di Supabase SQL Editor.

### Step 4: Test & Verify

```bash
# Restart development server
npm run dev

# Check:
# 1. Browse catalog - images should load
# 2. Check product details - carousel working
# 3. Admin panel - images display correctly
# 4. No 400 errors in console
```

## 📋 Pre-Launch Checklist

- [ ] **Supabase Storage Setup**
  - [ ] Bucket created (`product-images`)
  - [ ] Public access policy set
  - [ ] Upload policy for authenticated users

- [ ] **Images Uploaded**
  - [ ] All product images uploaded
  - [ ] Image URLs updated in database
  - [ ] Test loading dari different devices

- [ ] **Configuration Verified**
  - [ ] `next.config.ts` has correct domains
  - [ ] Environment variables set
  - [ ] Error fallbacks working

- [ ] **Performance Check**
  - [ ] Images load quickly
  - [ ] Responsive images working
  - [ ] No console errors
  - [ ] Mobile performance good

- [ ] **Production Ready**
  - [ ] All local paths removed from database
  - [ ] Only Supabase URLs or NULL values
  - [ ] SafeImage handling all edge cases
  - [ ] Monitoring setup for image errors

## 🐛 Troubleshooting

### Images masih 400 Error

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Check database:**
   ```sql
   SELECT id, name, image_url FROM products LIMIT 10;
   ```
   - Pastikan tidak ada `/images/` paths
   - URLs harus HTTPS atau NULL

3. **Check browser console:**
   - Look for specific error messages
   - Check network tab untuk failed requests

### Images lambat load

1. **Optimize images:**
   - Compress sebelum upload
   - Max 2000x2000px
   - Convert ke WebP

2. **Enable caching:**
   - Already configured di `next.config.ts`
   - Cache TTL: 60 seconds

### Upload script gagal

1. **Check service key:**
   ```bash
   # .env.local
   SUPABASE_SERVICE_KEY=eyJ... (get from dashboard)
   ```

2. **Check file permissions:**
   ```bash
   ls -la temp-images/
   ```

3. **Try manual upload:**
   - Supabase Dashboard → Storage → Upload

## 📞 Need Help?

Jika masih ada masalah:

1. Check `IMAGE_MANAGEMENT_GUIDE.md` untuk detail lengkap
2. Review Supabase Dashboard logs
3. Check browser DevTools console
4. Verify environment variables loaded

## 🎉 Result

Setelah fix:
- ✅ No more 400 errors
- ✅ Images load dengan smooth fallback
- ✅ Production-ready image management
- ✅ Optimized untuk performance
- ✅ Scalable untuk growth

---

**Quick Test:**
```bash
# 1. Update database dengan placeholders
# Run SQL fix-image-urls.sql di Supabase

# 2. Restart dev server
npm run dev

# 3. Open http://localhost:3000/catalog
# Images should load with placeholders

# 4. For production, upload real images
npm run upload-images
```

**Next Steps:**
1. Test current fix (placeholders work)
2. Collect real product images
3. Upload to Supabase before launch
4. Update database dengan real URLs
5. Launch! 🚀
