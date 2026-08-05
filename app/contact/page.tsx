'use client'

import { useEffect, useState } from 'react'
import { Clock, ExternalLink, Instagram, Mail, MapPin, MessageCircle, Music2, Phone } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import {
  DEFAULT_CONTACT_CONTENT,
  contactText,
  loadContactContent,
  toWhatsAppLink,
  type ContactContent,
} from '@/lib/contact-content'

export default function ContactPage() {
  const { t, tr, language } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [content, setContent] = useState<ContactContent>(DEFAULT_CONTACT_CONTENT)

  useEffect(() => {
    loadContactContent().then(({ data }) => setContent(data))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setStatus('success')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  const heading = contactText(content, 'heading', language)
  const subheading = contactText(content, 'subheading', language)
  const hoursWeekday = contactText(content, 'hours_weekday', language)
  const hoursWeekend = contactText(content, 'hours_weekend', language)
  const note = contactText(content, 'note', language)
  const whatsappLink = toWhatsAppLink(content.whatsapp)
  const showHours = Boolean(hoursWeekday || hoursWeekend)
  const socials = [
    { url: content.instagram_url, label: 'Instagram', Icon: Instagram },
    { url: content.tiktok_url, label: 'TikTok', Icon: Music2 },
  ].filter((social) => social.url)

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-2 text-black">{heading}</h1>
        {subheading && <p className="text-gray-600 mb-10">{subheading}</p>}

        {/* Without the form the info card is the whole page, so it stops
            being a half-width column and takes the full width instead. */}
        <div
          className={`grid grid-cols-1 gap-8 ${content.form_enabled ? 'lg:grid-cols-2' : 'max-w-2xl'}`}
        >
          {content.form_enabled && (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-xl font-semibold mb-6 text-black">{t('contact.getInTouch')}</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.name')}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('contact.namePlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.emailLabel')}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={tr('you@example.com', 'anda@contoh.com')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.subject')}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('contact.subjectPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('contact.messagePlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                  />
                </div>

                {status === 'success' && (
                  <p className="text-sm text-green-600">{t('contact.successMessage')}</p>
                )}
                {status === 'error' && (
                  <p className="text-sm text-red-600">{t('contact.errorMessage')}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? t('contact.sending') : t('contact.send')}
                </button>

                {note && <p className="text-sm text-gray-500 text-center">{note}</p>}
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-8 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-black">{t('contact.info')}</h2>

            <div className="space-y-6">
              {content.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-black">{t('contact.email')}</h3>
                    <a
                      href={`mailto:${content.email}`}
                      className="text-gray-600 wrap-break-word hover:text-black hover:underline"
                    >
                      {content.email}
                    </a>
                  </div>
                </div>
              )}

              {content.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-black">{t('contact.phone')}</h3>
                    <a
                      href={`tel:${content.phone.replace(/\s/g, '')}`}
                      className="text-gray-600 hover:text-black hover:underline"
                    >
                      {content.phone}
                    </a>
                  </div>
                </div>
              )}

              {whatsappLink && (
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-gray-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-black">WhatsApp</h3>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-gray-600 hover:text-black hover:underline"
                    >
                      {content.whatsapp}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {content.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-black">{t('contact.address')}</h3>
                    <p className="text-gray-600 wrap-break-word">{content.address}</p>
                    {content.maps_url && (
                      <a
                        href={content.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-black underline underline-offset-4 hover:text-gray-600"
                      >
                        {tr('Open in Maps', 'Buka di Maps')}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {showHours && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-black">{t('contact.hours')}</h3>
                    {hoursWeekday && <p className="text-gray-600">{hoursWeekday}</p>}
                    {hoursWeekend && <p className="text-gray-600">{hoursWeekend}</p>}
                  </div>
                </div>
              )}

              {socials.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-6">
                  {socials.map(({ url, label, Icon }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black transition hover:border-black hover:bg-gray-50"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
