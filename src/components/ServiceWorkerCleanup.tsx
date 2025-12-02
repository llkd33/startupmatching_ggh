'use client'

import { useEffect } from 'react'

const isDev = process.env.NODE_ENV === 'development'

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    // Clean up any existing service workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          const unregisterPromises = registrations.map((registration) =>
            registration.unregister()
              .then((success) => {
                if (isDev && success) {
                  console.log('Service Worker unregistered:', registration.scope)
                }
              })
              .catch((error) => {
                if (isDev) {
                  console.log('Service Worker unregister error:', error)
                }
              })
          )
          return Promise.all(unregisterPromises)
        })
        .catch((error) => {
          if (isDev) {
            console.log('Service Worker cleanup error:', error)
          }
        })

      // Also clear caches
      if ('caches' in window) {
        caches.keys()
          .then((cacheNames) => {
            return Promise.all(
              cacheNames.map((cacheName) => caches.delete(cacheName))
            )
          })
          .then(() => {
            if (isDev) {
              console.log('All caches cleared')
            }
          })
          .catch((error) => {
            if (isDev) {
              console.log('Cache cleanup error:', error)
            }
          })
      }
    }
  }, [])

  return null
}
