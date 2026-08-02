const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone')
const publicSrc = path.join(root, 'public')
const publicDest = path.join(standalone, 'public')
const staticSrc = path.join(root, '.next', 'static')
const staticDest = path.join(standalone, '.next', 'static')
const rootImgModuleSrc = path.join(root, 'node_modules', '@img', 'sharp-win32-x64')
const rootImgModuleDest = path.join(standalone, 'node_modules', '@img', 'sharp-win32-x64')
const nextImgModuleSrc = path.join(root, 'node_modules', 'next', 'node_modules', '@img', 'sharp-win32-x64')
const nextImgModuleDest = path.join(standalone, 'node_modules', 'next', 'node_modules', '@img', 'sharp-win32-x64')

async function copyRecursive(src, dest) {
  await fs.promises.rm(dest, { recursive: true, force: true })
  await fs.promises.mkdir(dest, { recursive: true })
  await fs.promises.cp(src, dest, { recursive: true, force: true })
}

async function main() {
  if (!fs.existsSync(standalone)) {
    throw new Error(`Standalone output directory not found: ${standalone}`)
  }

  if (fs.existsSync(publicSrc)) {
    console.log(`Copying public assets from ${publicSrc} to ${publicDest}`)
    await copyRecursive(publicSrc, publicDest)
  } else {
    console.warn(`Public directory not found at ${publicSrc}`)
  }

  if (fs.existsSync(staticSrc)) {
    console.log(`Copying Next.js static assets from ${staticSrc} to ${staticDest}`)
    await copyRecursive(staticSrc, staticDest)
  } else {
    console.warn(`Next.js static directory not found at ${staticSrc}`)
  }

  if (fs.existsSync(rootImgModuleSrc)) {
    console.log(`Copying Sharp runtime from ${rootImgModuleSrc} to ${rootImgModuleDest}`)
    await copyRecursive(rootImgModuleSrc, rootImgModuleDest)
  } else {
    console.warn(`Sharp runtime package not found at ${rootImgModuleSrc}`)
  }

  if (fs.existsSync(nextImgModuleSrc)) {
    console.log(`Copying Next-bundled Sharp runtime from ${nextImgModuleSrc} to ${nextImgModuleDest}`)
    await copyRecursive(nextImgModuleSrc, nextImgModuleDest)
  } else {
    console.warn(`Next-bundled Sharp runtime package not found at ${nextImgModuleSrc}`)
  }

  console.log('Standalone asset sync complete.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
