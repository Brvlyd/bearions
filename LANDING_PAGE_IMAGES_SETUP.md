# Landing Page Images Setup

This feature allows admin to upload and manage the 3 background images on the landing page.

## Database Setup

Run the SQL script in Supabase SQL Editor:

```sql
-- File: landing-page-images-schema.sql
```

This will:
1. Create the `landing_page_images` table
2. Insert default placeholder images (from Unsplash)
3. Set up Row Level Security policies
4. Allow public read access and admin-only write access

## Admin Interface

Navigate to: **Admin Panel → Landing Page**

### Features:
- Upload up to 3 images (positions 1, 2, 3)
- Preview current images
- Replace existing images
- Automatic image storage in Supabase Storage

### Image Requirements:
- **Recommended ratio**: 3:4 (portrait)
- **Maximum file size**: 5MB
- **Supported formats**: JPG, PNG, WebP

## How It Works

1. **Admin uploads image** → Stored in Supabase Storage (`product-images/landing/`)
2. **URL saved to database** → Table `landing_page_images`
3. **Landing page fetches images** → Displays in 3-column grid
4. **Fallback to emojis** → If no image uploaded, shows default emojis (🐻, ✨, 🎁)

## File Locations

- **Admin Page**: `app/admin/dashboard/landing-page/page.tsx`
- **Landing Page**: `app/page.tsx`
- **Database Schema**: `landing-page-images-schema.sql`
- **Type Definitions**: `lib/supabase.ts`

## Default Images

If you haven't uploaded custom images yet, the system uses placeholder images from Unsplash. Admin can replace these anytime through the admin panel.
