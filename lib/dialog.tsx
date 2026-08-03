'use client'

import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import AppDialog, { DialogVariant } from '@/components/AppDialog'

export interface ConfirmDialogOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export interface AlertDialogOptions {
  title?: string
  okText?: string
  variant?: Extract<DialogVariant, 'success' | 'error' | 'info'>
}

type PendingDialog =
  | { kind: 'confirm'; message: string; options: ConfirmDialogOptions; resolve: (value: boolean) => void }
  | { kind: 'alert'; message: string; options: AlertDialogOptions; resolve: () => void }

interface DialogContextType {
  confirmDialog: (message: string, options?: ConfirmDialogOptions) => Promise<boolean>
  alertDialog: (message: string, options?: AlertDialogOptions) => Promise<void>
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
  const { tr } = useLanguage()
  const [pending, setPending] = useState<PendingDialog | null>(null)
  const [open, setOpen] = useState(false)
  // settle() fires from a timeout/callback after state may have moved on, so it
  // reads the latest pending dialog from a ref rather than a stale closure.
  const pendingRef = useRef<PendingDialog | null>(null)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  const confirmDialog = useCallback((message: string, options: ConfirmDialogOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setPending({ kind: 'confirm', message, options, resolve })
      setOpen(true)
    })
  }, [])

  const alertDialog = useCallback((message: string, options: AlertDialogOptions = {}) => {
    return new Promise<void>((resolve) => {
      setPending({ kind: 'alert', message, options, resolve })
      setOpen(true)
    })
  }, [])

  const settle = useCallback((result: boolean) => {
    const current = pendingRef.current
    if (!current) return

    setOpen(false)
    if (current.kind === 'confirm') {
      current.resolve(result)
    } else {
      current.resolve()
    }
    // Keep the dialog mounted through the closing transition before clearing it.
    setTimeout(() => setPending(null), 300)
  }, [])

  return (
    <DialogContext.Provider value={{ confirmDialog, alertDialog }}>
      {children}
      {pending && (
        <AppDialog
          open={open}
          kind={pending.kind}
          variant={
            pending.kind === 'confirm'
              ? pending.options.isDangerous
                ? 'dangerous'
                : 'default'
              : pending.options.variant || 'info'
          }
          title={pending.options.title}
          message={pending.message}
          confirmText={
            pending.kind === 'confirm'
              ? pending.options.confirmText || tr('Confirm', 'Konfirmasi')
              : pending.options.okText || 'OK'
          }
          cancelText={pending.kind === 'confirm' ? pending.options.cancelText || tr('Cancel', 'Batal') : undefined}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}
