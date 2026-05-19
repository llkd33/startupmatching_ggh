'use client'

import { useEffect } from 'react'

const isDev = process.env.NODE_ENV === 'development'
const CLEANUP_STORAGE_KEY = 'startupmatching:service-worker-cleanup:v1'

function hasCompletedCleanup() {
  try {
    return window.localStorage.getItem(CLEANUP_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function markCleanupComplete() {
  try {
    window.localStorage.setItem(CLEANUP_STORAGE_KEY, 'true')
  } catch {
    // Ignore storage failures; cleanup can safely retry on the next load.
  }
}

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const canCleanupServiceWorkers = 'serviceWorker' in navigator
    const canCleanupCaches = 'caches' in window

    if ((!canCleanupServiceWorkers && !canCleanupCaches) || hasCompletedCleanup()) {
      return
    }

    let cancelled = false

    async function cleanup() {
      try {
        if (canCleanupServiceWorkers) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(
            registrations.map(async (registration) => {
              const success = await registration.unregister()
              if (isDev && success) {
                console.log('Service Worker unregistered:', registration.scope)
              }
            })
          )
        }

        if (canCleanupCaches) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
          if (isDev) {
            console.log('All caches cleared')
          }
        }

        if (!cancelled) {
          markCleanupComplete()
        }
      } catch (error) {
        if (isDev) {
          console.log('Service Worker cleanup error:', error)
        }
      }
    }

    void cleanup()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
