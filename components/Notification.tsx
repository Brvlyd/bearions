'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

interface NotificationProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose: () => void
  duration?: number
}

export default function Notification({ type, message, onClose, duration = 5000 }: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const types = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircle className="w-5 h-5 text-red-600" />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <AlertCircle className="w-5 h-5 text-blue-600" />
    }
  }

  const style = types[type]

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
      <div className={`${style.bg} ${style.border} border rounded-lg shadow-lg p-4 pr-12 min-w-[300px] max-w-md`}>
        <div className="flex items-start gap-3">
          {style.icon}
          <p className={`${style.text} text-sm font-medium flex-1`}>
            {message}
          </p>
          <button
            onClick={onClose}
            className={`${style.text} hover:opacity-70 transition absolute top-3 right-3`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
