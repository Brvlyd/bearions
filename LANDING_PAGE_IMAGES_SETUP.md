# Landing Page Images Setup

This feature allows admin to upload and manage 1 to 6 background images on the landing page.

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
- Upload up to 6 images (positions 1 to 6)
- Preview current images
- Replace existing images
- Remove images you no longer want to display
- Automatic image storage in Supabase Storage

### Image Requirements:
- **Recommended ratio**: 3:4 (portrait)
- **Maximum file size**: 5MB
- **Supported formats**: JPG, PNG, WebP

### Recommended Size by Image Count

| Total Upload | Ideal Ratio | Suggested Per-Image Size |
|---|---|---|
| 1 image | 16:9 | 2560 x 1440 px |
| 2 images | 4:5 | 1600 x 2000 px |
| 3 images | 2:3 | 1400 x 2100 px |
| 4 images | 16:9 | 1920 x 1080 px |
| 5 images | 4:3 | 1600 x 1200 px |
| 6 images | 4:3 | 1600 x 1200 px |

Tip: keep important subject in the center safe area (middle 60%) to reduce crop risk on different screen sizes.

## How It Works

1. **Admin uploads image** → Stored in Supabase Storage (`product-images/landing/`)
2. **URL saved to database** → Table `landing_page_images`
3. **Landing page fetches images** → Displays with responsive dynamic grid based on image count
4. **Fallback to emojis** → If no image uploaded, shows default emojis (🐻, ✨, 🎁)

## Migration for Existing Databases

If your database was created with the old 3-image limit, run:

```sql
-- File: expand-landing-page-images-to-6.sql
```

## File Locations

- **Admin Page**: `app/admin/dashboard/landing-page/page.tsx`
- **Landing Page**: `app/page.tsx`
- **Database Schema**: `landing-page-images-schema.sql`
- **Type Definitions**: `lib/supabase.ts`

## Default Images

If you haven't uploaded custom images yet, the system uses placeholder images from Unsplash. Admin can replace these anytime through the admin panel.
