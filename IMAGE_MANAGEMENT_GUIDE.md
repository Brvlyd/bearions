# Image Management & Production Setup Guide

## 🚀 Overview
Panduan lengkap untuk setup image management di Bearions untuk production deployment.

## 📁 Supabase Storage Setup

### 1. Create Storage Bucket

Buka Supabase Dashboard → Storage → Create Bucket:

```
Bucket Name: product-images
Public Bucket: Yes (untuk public access)
File size limit: 5MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

### 2. Set Bucket Policies

Di Storage → Policies, tambahkan policies berikut:

#### Policy 1: Public Read Access
```sql
-- Allow public to read images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );
```

#### Policy 2: Authenticated Upload
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
```

#### Policy 3: Owner Delete
```sql
-- Allow users to delete their own uploads
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.uid() = owner
);
```

## 🔧 Configuration

### Next.js Image Configuration

File `next.config.ts` sudah dikonfigurasi dengan:

- ✅ Supabase Storage domain
- ✅ Image optimization formats (AVIF, WebP)
- ✅ Responsive device sizes
- ✅ Caching TTL

### Environment Variables

Pastikan `.env.local` memiliki:

```env
NEXT_PUBLIC_SUPABASE_URL=https://iktbpmqahpkboovgbbib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📤 Upload Images untuk Production

### Cara 1: Melalui Admin Panel

1. Login sebagai admin
2. Buka "Add Product" atau "Edit Product"
3. Upload images melalui MultiImageUpload component
4. Images otomatis ter-upload ke Supabase Storage

### Cara 2: Bulk Upload Script

Buat file `scripts/upload-images.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service key for bulk upload
)

async function uploadProductImages() {
  const imagesDir = './public/temp-images'
  const files = fs.readdirSync(imagesDir)

  for (const file of files) {
    const filePath = path.join(imagesDir, file)
    const fileBuffer = fs.readFileSync(filePath)

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(`products/${file}`, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      })

    if (error) {
      console.error(`Failed to upload ${file}:`, error)
    } else {
      console.log(`Uploaded ${file} successfully`)
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path)
      
      console.log(`Public URL: ${urlData.publicUrl}`)
    }
  }
}

uploadProductImages()
```

Run: `ts-node scripts/upload-images.ts`

### Cara 3: Update Database dengan Supabase URLs

Setelah upload, update product image URLs:

```sql
-- Update product dengan Supabase Storage URL
UPDATE products 
SET image_url = 'https://iktbpmqahpkboovgbbib.supabase.co/storage/v1/object/public/product-images/products/bearion-tees.jpg'
WHERE id = 'product-id-here';
```

## 🎨 Image Guidelines untuk Production

### Recommended Specifications

- **Format**: JPEG, PNG, atau WebP
- **Dimensions**: Minimum 800x800px, Maximum 2000x2000px
- **File Size**: Maximum 5MB per image
- **Aspect Ratio**: 1:1 (square) untuk product images
- **Color Space**: sRGB
- **Resolution**: 72-150 DPI

### Image Naming Convention

```
product-{product-id}-{index}.jpg
// Example:
product-123e4567-e89b-main.jpg
product-123e4567-e89b-1.jpg
product-123e4567-e89b-2.jpg
```

### Image Optimization

Before uploading:

1. **Compress**: Use tools like TinyPNG, ImageOptim
2. **Resize**: Max 2000x2000px
3. **Format**: Convert to WebP for best compression
4. **Quality**: 80-85% for JPEG

## 🚀 Production Deployment Checklist

### Pre-Launch

- [ ] Upload all product images ke Supabase Storage
- [ ] Update database dengan correct image URLs
- [ ] Test image loading di berbagai devices
- [ ] Enable CDN/caching di Supabase (sudah otomatis)
- [ ] Setup image monitoring/error logging

### Domain Setup

Jika menggunakan custom domain:

1. Update `next.config.ts`:
```typescript
images: {
  domains: [
    'iktbpmqahpkboovgbbib.supabase.co',
    'your-custom-domain.com'
  ]
}
```

2. Setup CDN (optional tapi recommended):
   - Cloudflare Images
   - Vercel Image Optimization
   - AWS CloudFront

### Performance Optimization

- ✅ Images lazy loaded otomatis (Next.js)
- ✅ Responsive images dengan `sizes` prop
- ✅ AVIF/WebP format untuk modern browsers
- ✅ Image caching (60s TTL)
- ✅ Error fallback ke placeholder

## 🔍 Troubleshooting

### Issue: Images tidak muncul (400 Error)

**Solution:**
1. Check Supabase Storage bucket is public
2. Verify image URL format correct
3. Check Next.js config includes domain
4. Clear Next.js cache: `rm -rf .next`

### Issue: Images lambat loading

**Solution:**
1. Optimize image file size
2. Enable Supabase CDN
3. Use WebP format
4. Implement progressive loading

### Issue: Upload gagal

**Solution:**
1. Check file size < 5MB
2. Verify file type allowed (JPEG, PNG, WebP)
3. Check Supabase storage policies
4. Verify authentication token valid

## 📊 Monitoring

### Track Image Performance

```typescript
// Add to lib/analytics.ts
export function trackImageError(url: string, error: string) {
  console.error('Image Load Error:', { url, error })
  // Send to analytics service (GA, Sentry, etc)
}

// Usage in SafeImage component
const handleError = () => {
  trackImageError(src, 'Failed to load')
  setImageSrc(fallbackUrl)
}
```

### Monitor Storage Usage

Di Supabase Dashboard → Storage:
- Check total storage used
- Monitor bandwidth usage
- Setup alerts untuk storage limit

## 💰 Cost Optimization

### Supabase Storage Pricing

- **Free Tier**: 1GB storage, 2GB bandwidth
- **Pro**: $25/mo - 100GB storage, 200GB bandwidth
- **Pay as you go**: $0.021/GB storage, $0.09/GB bandwidth

### Optimization Tips

1. Compress images before upload
2. Use WebP format (50% smaller)
3. Delete unused images regularly
4. Implement image CDN caching
5. Use thumbnail sizes untuk listings

## 🔐 Security Best Practices

1. **Validate uploads**: Check file type dan size
2. **Sanitize filenames**: Remove special characters
3. **Rate limiting**: Limit uploads per user/time
4. **Virus scanning**: Implement untuk file uploads
5. **Access control**: Only authenticated users dapat upload

## 📝 Migration dari Local ke Supabase

Jika sudah ada images di `/public/images`:

```bash
# 1. Copy images ke temp folder
mkdir temp-images
cp -r public/images/* temp-images/

# 2. Run upload script
npm run upload-images

# 3. Update database
psql -h db.xxxxxx.supabase.co -U postgres -d postgres < update-image-urls.sql

# 4. Test thoroughly
# 5. Delete local images setelah verified
rm -rf public/images/*
```

## 🎯 Next Steps

1. ✅ Setup Supabase Storage bucket
2. ✅ Configure policies
3. ✅ Upload initial product images
4. ✅ Update database URLs
5. ✅ Test di staging environment
6. ✅ Monitor performance
7. ✅ Launch to production

## 📞 Support

Jika ada issue:
1. Check [Supabase Docs](https://supabase.com/docs/guides/storage)
2. Check [Next.js Image Docs](https://nextjs.org/docs/api-reference/next/image)
3. Review error logs di browser console
4. Check Supabase Dashboard logs

---

**Last Updated**: January 2026
**Version**: 1.0.0
