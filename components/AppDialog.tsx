'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle, Info, XCircle } from 'lucide-react'

export type DialogKind = 'confirm' | 'alert'
export type DialogVariant = 'default' | 'dangerous' | 'success' | 'error' | 'info'

interface AppDialogProps {
  open: boolean
  kind: DialogKind
  variant: DialogVariant
  title?: string
  message: string
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT_STYLES: Record<
  DialogVariant,
  { icon: typeof HelpCircle; iconClass: string; headerClass: string; confirmClass: string }
> = {
  default: {
    icon: HelpCircle,
    iconClass: 'text-black',
    headerClass: 'bg-gray-50',
    confirmClass: 'bg-black text-white hover:bg-gray-800 shadow-lg',
  },
  dangerous: {
    icon: AlertTriangle,
    iconClass: 'text-red-600',
    headerClass: 'bg-red-50',
    confirmClass:
      'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-red-200/50',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-600',
    headerClass: 'bg-green-50',
    confirmClass: 'bg-black text-white hover:bg-gray-800 shadow-lg',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-600',
    headerClass: 'bg-red-50',
    confirmClass: 'bg-black text-white hover:bg-gray-800 shadow-lg',
  },
  info: {
    icon: Info,
    iconClass: 'text-black',
    headerClass: 'bg-gray-50',
    confirmClass: 'bg-black text-white hover:bg-gray-800 shadow-lg',
  },
}

// Replaces window.confirm/alert: same call shape (one modal, resolved by the
// user's choice) but rendered in-app so styling and language match the rest
// of the site instead of the browser chrome.
export default function AppDialog({
  open,
  kind,
  variant,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const style = VARIANT_STYLES[variant]
  const Icon = style.icon
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    confirmButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <>
      <div
        className={`fixed inset-0 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
      />

      <div
        className={`fixed inset-0 flex items-center justify-center z-[101] p-4 ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        onClick={handleBackdropClick}
      >
        <div
          role={kind === 'confirm' ? 'alertdialog' : 'alert'}
          aria-modal="true"
          className={`bg-white rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-300 ${
            open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <div className={`flex items-center gap-3 p-6 border-b border-gray-200 rounded-t-xl ${style.headerClass}`}>
            <Icon className={`w-6 h-6 shrink-0 ${style.iconClass}`} />
            {title && <h2 className="text-lg font-semibold text-black">{title}</h2>}
          </div>

          <div className="p-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            {kind === 'confirm' && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {cancelText}
              </button>
            )}
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${style.confirmClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
