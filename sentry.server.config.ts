// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only initialize Sentry if DSN is provided
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter sensitive data before sending
  beforeSend(event, hint) {
    // Filter out sensitive information from server-side events
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
    }

    // Filter sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          // Remove potential sensitive keys
          const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'apiKey'];
          sensitiveKeys.forEach(key => {
            if (breadcrumb.data && key in breadcrumb.data) {
              delete breadcrumb.data[key];
            }
          });
        }
        return breadcrumb;
      });
    }

    return event;
  },

  // Set custom tags
  initialScope: {
    tags: {
      environment: process.env.NODE_ENV || 'development',
      runtime: 'nodejs',
    },
  },

  // Ignore specific errors
  ignoreErrors: [
    // Network errors
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    // Supabase specific
    'JWT expired',
    'invalid claim: missing sub claim',
  ],
});
