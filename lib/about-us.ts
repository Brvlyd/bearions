import { AboutUsContent, AboutUsContentBlock, supabase } from '@/lib/supabase'

type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

export const DEFAULT_ABOUT_US_CONTENT: AboutUsContent = {
  id: 1,
  title: 'About Us',
  headline: 'Bearions builds everyday essentials with practical quality and honest pricing.',
  content_blocks: [
    {
      id: 'default-text',
      type: 'text',
      text:
        'We focus on useful products, consistent service, and a smooth shopping experience. Our goal is simple: make good products accessible and reliable for everyone.',
    },
  ],
  background_image_url: null,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
}

const isValidContentBlock = (value: any): value is AboutUsContentBlock => {
  if (!value || typeof value !== 'object') return false
  if (value.type !== 'text' && value.type !== 'image') return false
  if (typeof value.id !== 'string') return false
  return true
}

const normalizeContentBlocks = (value: unknown): AboutUsContentBlock[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_ABOUT_US_CONTENT.content_blocks || []
  }

  const blocks = value
    .filter(isValidContentBlock)
    .map((block) => {
      if (block.type === 'text') {
        return {
          id: block.id,
          type: 'text' as const,
          text: typeof block.text === 'string' ? block.text : '',
        }
      }

      return {
        id: block.id,
        type: 'image' as const,
        image_url: typeof block.image_url === 'string' ? block.image_url : '',
      }
    })

  if (blocks.length > 0) return blocks
  return DEFAULT_ABOUT_US_CONTENT.content_blocks || []
}

const normalizeAboutContent = (raw: any): AboutUsContent => {
  const legacyBody =
    raw?.body ||
    raw?.body_en ||
    raw?.body_id ||
    (DEFAULT_ABOUT_US_CONTENT.content_blocks?.[0]?.text || '')

  const contentBlocks = raw?.content_blocks
    ? normalizeContentBlocks(raw.content_blocks)
    : [
        {
          id: 'legacy-text',
          type: 'text' as const,
          text: String(legacyBody || ''),
        },
      ]

  return {
    id: Number(raw?.id || 1),
    title: String(raw?.title || raw?.title_en || raw?.title_id || DEFAULT_ABOUT_US_CONTENT.title),
    headline: String(
      raw?.headline ||
      raw?.headline_en ||
      raw?.headline_id ||
      DEFAULT_ABOUT_US_CONTENT.headline
    ),
    content_blocks: contentBlocks,
    background_image_url:
      typeof raw?.background_image_url === 'string' || raw?.background_image_url === null
        ? raw?.background_image_url
        : DEFAULT_ABOUT_US_CONTENT.background_image_url,
    updated_at:
      typeof raw?.updated_at === 'string'
        ? raw.updated_at
        : DEFAULT_ABOUT_US_CONTENT.updated_at,
    updated_by:
      typeof raw?.updated_by === 'string' || raw?.updated_by === null
        ? raw?.updated_by
        : DEFAULT_ABOUT_US_CONTENT.updated_by,
  }
}

export const parseAboutUsError = (error: unknown, unknownErrorText = 'Unknown error') => {
  const err = (error || {}) as SupabaseErrorLike
  const message = err.message || unknownErrorText
  const details = err.details || ''
  const hint = err.hint || ''
  const code = err.code || 'UNKNOWN'
  const combined = `${message} ${details} ${hint}`.toLowerCase()

  const isMissingTableError =
    code === '42P01' ||
    code === 'PGRST205' ||
    (combined.includes('about_us_content') &&
      (combined.includes('does not exist') ||
        combined.includes('schema cache') ||
        combined.includes('could not find the table')))

  const isMissingBuilderColumns =
    combined.includes('about_us_content') &&
    combined.includes('column') &&
    (combined.includes('title') || combined.includes('headline') || combined.includes('content_blocks')) &&
    (combined.includes('does not exist') || combined.includes('schema cache'))

  return {
    message,
    details,
    hint,
    code,
    isMissingTableError,
    isMissingBuilderColumns,
  }
}

export const loadAboutUsContent = async () => {
  const { data, error } = await supabase
    .from('about_us_content')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    const parsedError = parseAboutUsError(error)
    return {
      data: DEFAULT_ABOUT_US_CONTENT,
      error: parsedError,
      tableMissing: parsedError.isMissingTableError,
    }
  }

  return {
    data: data ? normalizeAboutContent(data) : DEFAULT_ABOUT_US_CONTENT,
    error: null,
    tableMissing: false,
  }
}
