import { NextResponse } from 'next/server'

const WILAYAH_BASE_URL = 'https://wilayah.id/api'

type RouteContext = {
  params: Promise<{ slug?: string[] }>
}

const buildExternalPath = (slug: string[]): string | null => {
  const [resource, code] = slug

  if (resource === 'provinces') {
    return '/provinces.json'
  }

  if (!code) {
    return null
  }

  if (resource === 'regencies') {
    return `/regencies/${encodeURIComponent(code)}.json`
  }

  if (resource === 'districts') {
    return `/districts/${encodeURIComponent(code)}.json`
  }

  if (resource === 'villages') {
    return `/villages/${encodeURIComponent(code)}.json`
  }

  return null
}

export async function GET(_: Request, context: RouteContext) {
  const { slug = [] } = await context.params

  const path = buildExternalPath(slug)

  if (!path) {
    return NextResponse.json({ error: 'Invalid wilayah endpoint' }, { status: 400 })
  }

  try {
    const response = await fetch(`${WILAYAH_BASE_URL}${path}`, {
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch wilayah data' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Wilayah proxy error:', error)
    return NextResponse.json({ error: 'Wilayah service unavailable' }, { status: 503 })
  }
}
