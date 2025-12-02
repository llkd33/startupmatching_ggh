'use client'

import { AuthProvider } from '@/components/auth/AuthContext'
import { ToastProvider } from '@/components/ui/toast-provider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="startup-matching-theme">
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}