'use client'

import { AuthProvider } from '@/components/auth/AuthContext'
import { ToastProvider } from '@/components/ui/toast-provider'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  )
}