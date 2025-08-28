'use client'

import { useEffect } from 'react'

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    // Clean up any existing service workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister().then(function(success) {
            if (success) {
              console.log('Service Worker unregistered:', registration.scope)
            }
          })
        }
      }).catch(function(error) {
        console.log('Service Worker cleanup error:', error)
      })

      // Also clear caches
      if ('caches' in window) {
        caches.keys().then(function(cacheNames) {
          return Promise.all(
            cacheNames.map(function(cacheName) {
              return caches.delete(cacheName)
            })
          )
        }).then(function() {
          console.log('All caches cleared')
        }).catch(function(error) {
          console.log('Cache cleanup error:', error)
        })
      }
    }
  }, [])

  return null
}