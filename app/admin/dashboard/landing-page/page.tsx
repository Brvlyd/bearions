'use client'

import HeroImageManager from '@/components/HeroImageManager'

// Client-operated CMS page: plain Indonesian only (see HeroImageManager).
// Registered in scripts/check-i18n.mjs SINGLE_LANGUAGE_FILES.

export default function LandingPageManager() {
  return (
    <div className="p-6">
      <HeroImageManager
        table="landing_page_images"
        storagePathPrefix="landing"
        heading="Gambar Landing Page"
        subheading="Atur foto latar belakang halaman utama untuk tampilan desktop dan mobile."
      />
    </div>
  )
}
