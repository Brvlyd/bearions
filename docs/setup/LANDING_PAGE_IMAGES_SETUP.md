# Landing Page Images Setup

This feature allows admin to upload and manage background images on the landing page,
separately for desktop (1 to 6 images) and mobile (1 image). The same mechanism also
powers the optional banner at the top of the Community page (`community_page_images`).

## Database Setup

Run these SQL scripts in Supabase SQL Editor, in order:

```sql
-- File: landing-page-images-schema.sql
-- File: db/migrations/expand-landing-page-images-to-6.sql
-- File: db/migrations/device-aware-hero-images.sql
```

The last one:
1. Adds a `device` ('desktop' | 'mobile') column to `landing_page_images`, scopes its
   uniqueness to `(device, position)`, and caps mobile to position 1
2. Fixes the admin-write RLS policy on `landing_page_images` (it referenced a
   nonexistent `admins.user_id` column, which likely blocked admin writes outright)
3. Creates `community_page_images` with the same shape, for the Community page banner

## Admin Interface

Navigate to: **Admin Panel → Landing Page** (desktop/mobile tabs), or
**Admin Panel → Community** (banner section at the top of that page).

### Features:
- Desktop tab: upload up to 6 images (positions 1 to 6)
- Mobile tab: upload exactly 1 image, shown full-bleed on phones
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

1. **Admin uploads image** → Stored in Supabase Storage (`product-images/landing/` for
   the landing page, `product-images/community-hero/` for the Community banner)
2. **URL saved to database** → `landing_page_images` or `community_page_images`, tagged
   with `device` ('desktop' | 'mobile') and `position`
3. **Public page fetches all rows for the table** → Both a desktop grid and a mobile
   single-image layer are rendered; CSS (`hidden md:...` / `md:hidden`) picks the right
   one for the visitor's screen — no client-side device sniffing, so there's no
   hydration flash
4. **Fallback** → If a device has no image uploaded, that layer shows a plain gradient
   instead (landing), or the whole banner is skipped (Community, when neither device has
   an image)

## Migration for Existing Databases

```sql
-- File: db/migrations/expand-landing-page-images-to-6.sql   (old 3-image limit -> 6)
-- File: db/migrations/device-aware-hero-images.sql           (adds desktop/mobile split + community banner table)
```

## File Locations

- **Shared admin manager**: `components/HeroImageManager.tsx` (desktop/mobile tabs, used by both pages below)
- **Shared public renderer**: `components/HeroBackground.tsx`
- **Shared types/config**: `lib/hero-images.ts`
- **Landing admin page**: `app/admin/dashboard/landing-page/page.tsx`
- **Landing page**: `app/page.tsx`
- **Community admin banner section**: `app/admin/dashboard/community/page.tsx` (top of the page)
- **Community page**: `app/community/page.tsx`
- **Database schema**: `landing-page-images-schema.sql`, `db/migrations/device-aware-hero-images.sql`

## Default Images

If you haven't uploaded custom images yet, the landing page falls back to a plain
gradient per slot (no image), and the Community banner simply doesn't render.
