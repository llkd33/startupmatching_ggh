'use client'

import { AuthProvider } from '@/components/auth/AuthContext'
import { ToastProvider } from '@/components/ui/toast-provider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import ServiceWorkerCleanup from '@/components/ServiceWorkerCleanup'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="startup-matching-theme">
      <ServiceWorkerCleanup />
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
