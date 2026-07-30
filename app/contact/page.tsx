'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export default function ContactPage() {
  const { t, tr } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

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

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-2 text-black">{t('contact.title')}</h1>
        <p className="text-gray-600 mb-10">{t('contact.subtitle')}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-black">{t('contact.info')}</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <h3 className="font-medium text-black">{t('contact.email')}</h3>
                  <p className="text-gray-600">hello@bearions.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <h3 className="font-medium text-black">{t('contact.phone')}</h3>
                  <p className="text-gray-600">+62 812 3456 7890</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <h3 className="font-medium text-black">{t('contact.address')}</h3>
                  <p className="text-gray-600">{tr('Jakarta, Indonesia', 'Jakarta, Indonesia')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <h3 className="font-medium text-black">{t('contact.hours')}</h3>
                  <p className="text-gray-600">{t('contact.hoursWeekday')}</p>
                  <p className="text-gray-600">{t('contact.hoursWeekend')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
