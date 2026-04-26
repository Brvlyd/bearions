/**
 * Bulk Image Upload Script untuk Supabase Storage
 * 
 * Usage:
 * 1. Place images di folder ./temp-images/
 * 2. Set environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY)
 * 3. Run: npx tsx scripts/upload-images.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client with service key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY! // Get from Supabase Dashboard

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.log('Required:')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - SUPABASE_SERVICE_KEY (from Supabase Dashboard → Settings → API)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface UploadResult {
  filename: string
  success: boolean
  publicUrl?: string
  error?: string
}

async function uploadImage(
  filePath: string,
  bucketName: string = 'product-images'
): Promise<UploadResult> {
  const filename = path.basename(filePath)
  
  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath)
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase()
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    }[ext] || 'image/jpeg'

    // Upload to Supabase Storage
    const storagePath = `products/${filename}`
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      })

    if (error) {
      return {
        filename,
        success: false,
        error: error.message
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return {
      filename,
      success: true,
      publicUrl: urlData.publicUrl
    }
  } catch (error: any) {
    return {
      filename,
      success: false,
      error: error.message
    }
  }
}

async function bulkUploadImages(sourceDir: string) {
  console.log('🚀 Starting bulk image upload...\n')

  // Check if directory exists
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Directory not found: ${sourceDir}`)
    console.log('\n💡 Create the directory and add images:')
    console.log(`   mkdir ${sourceDir}`)
    console.log(`   cp your-images/* ${sourceDir}/`)
    return
  }

  // Get all image files
  const files = fs.readdirSync(sourceDir)
    .filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
    .map(file => path.join(sourceDir, file))

  if (files.length === 0) {
    console.log('⚠️  No image files found in', sourceDir)
    return
  }

  console.log(`📁 Found ${files.length} images to upload\n`)

  // Upload each file
  const results: UploadResult[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`[${i + 1}/${files.length}] Uploading ${path.basename(file)}...`)
    
    const result = await uploadImage(file)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ Success: ${result.publicUrl}\n`)
    } else {
      console.log(`  ❌ Failed: ${result.error}\n`)
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log('\n' + '='.repeat(60))
  console.log('📊 Upload Summary')
  console.log('='.repeat(60))
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📦 Total: ${results.length}`)
  console.log('='.repeat(60))

  // Print SQL for updating database
  if (successful > 0) {
    console.log('\n📝 SQL UPDATE statements:')
    console.log('='.repeat(60))
    results
      .filter(r => r.success)
      .forEach(r => {
        // Extract product name from filename (remove extension and clean up)
        const productName = path.basename(r.filename, path.extname(r.filename))
          .replace(/[-_]/g, ' ')
          .replace(/\d+/g, '')
          .trim()
        
        console.log(`-- Update ${r.filename}`)
        console.log(`UPDATE products`)
        console.log(`SET image_url = '${r.publicUrl}'`)
        console.log(`WHERE name ILIKE '%${productName}%';`)
        console.log()
      })
    console.log('='.repeat(60))
  }

  // Save results to JSON
  const resultsFile = path.join(__dirname, 'upload-results.json')
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2))
  console.log(`\n💾 Results saved to: ${resultsFile}`)
}

// Main execution
const sourceDir = path.join(__dirname, '..', 'temp-images')
bulkUploadImages(sourceDir)
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
