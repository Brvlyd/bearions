import { supabase } from './supabase'
import { DEFAULT_SITE_SETTINGS } from './site-settings'

/**
 * Everything /contact renders, from db/migrations/add-contact-page-content.sql.
 *
 * Stored on the site_settings singleton next to the address/phone/email the
 * page already used, so there is one row to load and one place to edit.
 */
export type ContactContent = {
  heading: string
  heading_id: string
  subheading: string
  subheading_id: string
  address: string
  phone: string
  email: string
  whatsapp: string
  maps_url: string
  instagram_url: string
  tiktok_url: string
  hours_weekday: string
  hours_weekday_id: string
  hours_weekend: string
  hours_weekend_id: string
  note: string
  note_id: string
  form_enabled: boolean
}

export const DEFAULT_CONTACT_CONTENT: ContactContent = {
  heading: 'Contact Us',
  heading_id: 'Hubungi Kami',
  subheading: "We'd love to hear from you",
  subheading_id: 'Kami ingin mendengar dari Anda',
  address: DEFAULT_SITE_SETTINGS.contact_address || '',
  phone: DEFAULT_SITE_SETTINGS.contact_phone || '',
  email: DEFAULT_SITE_SETTINGS.contact_email || '',
  whatsapp: '',
  maps_url: '',
  instagram_url: '',
  tiktok_url: '',
  hours_weekday: 'Monday - Friday: 9:00 AM - 6:00 PM',
  hours_weekday_id: 'Senin - Jumat: 09:00 - 18:00',
  hours_weekend: 'Saturday - Sunday: 10:00 AM - 4:00 PM',
  hours_weekend_id: 'Sabtu - Minggu: 10:00 - 16:00',
  note: '',
  note_id: '',
  form_enabled: true,
}

const text = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

export const normalizeContactContent = (
  raw: Record<string, unknown> | null | undefined
): ContactContent => {
  const row = raw || {}

  return {
    heading: text(row.contact_heading, DEFAULT_CONTACT_CONTENT.heading),
    heading_id: text(row.contact_heading_id, DEFAULT_CONTACT_CONTENT.heading_id),
    subheading: text(row.contact_subheading, DEFAULT_CONTACT_CONTENT.subheading),
    subheading_id: text(row.contact_subheading_id, DEFAULT_CONTACT_CONTENT.subheading_id),
    address: text(row.contact_address, DEFAULT_CONTACT_CONTENT.address),
    phone: text(row.contact_phone, DEFAULT_CONTACT_CONTENT.phone),
    email: text(row.contact_email, DEFAULT_CONTACT_CONTENT.email),
    // Optional extras stay empty when unset — the storefront hides the whole
    // row rather than printing a blank label.
    whatsapp: text(row.contact_whatsapp, ''),
    maps_url: text(row.contact_maps_url, ''),
    instagram_url: text(row.contact_instagram_url, ''),
    tiktok_url: text(row.contact_tiktok_url, ''),
    hours_weekday: text(row.contact_hours_weekday, DEFAULT_CONTACT_CONTENT.hours_weekday),
    hours_weekday_id: text(row.contact_hours_weekday_id, DEFAULT_CONTACT_CONTENT.hours_weekday_id),
    hours_weekend: text(row.contact_hours_weekend, DEFAULT_CONTACT_CONTENT.hours_weekend),
    hours_weekend_id: text(row.contact_hours_weekend_id, DEFAULT_CONTACT_CONTENT.hours_weekend_id),
    note: text(row.contact_note, ''),
    note_id: text(row.contact_note_id, ''),
    // Only an explicit false hides the form: a row from before this migration
    // has no such column, and a store that silently loses its contact form is
    // worse than one showing it.
    form_enabled: row.contact_form_enabled !== false,
  }
}

/**
 * Reads the contact content. Missing columns (migration not applied yet) are
 * indistinguishable from unset ones here — both fall back to the defaults —
 * so the storefront renders correctly either way.
 */
export const loadContactContent = async () => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    return { data: DEFAULT_CONTACT_CONTENT, error }
  }

  return {
    data: normalizeContactContent(data as Record<string, unknown> | null),
    error: null,
  }
}

/** Picks the field for the active language, falling back to the other one. */
export const contactText = (
  content: ContactContent,
  field: 'heading' | 'subheading' | 'hours_weekday' | 'hours_weekend' | 'note',
  language: 'en' | 'id'
) => {
  const en = content[field]
  const id = content[`${field}_id` as keyof ContactContent] as string
  return language === 'id' ? id || en : en || id
}

/**
 * wa.me needs a bare international number. Indonesian admins type 08…, +62…,
 * or 62… interchangeably, so all three are normalised rather than rejected.
 */
export const toWhatsAppLink = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  // A leading 0 is the Indonesian trunk prefix; wa.me wants the country code.
  const international = digits.startsWith('0') ? `62${digits.slice(1)}` : digits

  return `https://wa.me/${international}`
}
