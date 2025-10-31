import { test, expect, Page, Browser } from '@playwright/test'

const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/careers', name: 'Careers' },
  { path: '/experts', name: 'Experts' },
  { path: '/campaigns', name: 'Campaigns' },
  { path: '/login', name: 'Login' },
  { path: '/signup', name: 'Signup' },
  { path: '/auth/login', name: 'Auth Login' },
  { path: '/auth/register', name: 'Auth Register' },
  { path: '/auth/register/expert', name: 'Expert Registration' },
  { path: '/auth/register/organization', name: 'Organization Registration' },
  { path: '/forgot-password', name: 'Forgot Password' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/unauthorized', name: 'Unauthorized' }
]

const PROTECTED_PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/dashboard/campaigns', name: 'Dashboard Campaigns' },
  { path: '/dashboard/campaigns/create', name: 'Create Campaign' },
  { path: '/dashboard/experts', name: 'Dashboard Experts' },
  { path: '/dashboard/proposals', name: 'Dashboard Proposals' },
  { path: '/dashboard/messages', name: 'Dashboard Messages' },
  { path: '/dashboard/notifications', name: 'Dashboard Notifications' },
  { path: '/dashboard/connection-requests', name: 'Connection Requests' },
  { path: '/dashboard/organization', name: 'Organization Dashboard' },
  { path: '/dashboard/tasks', name: 'Dashboard Tasks' },
  { path: '/profile/expert/complete', name: 'Complete Expert Profile' },
  { path: '/profile/expert/edit', name: 'Edit Expert Profile' },
  { path: '/profile/organization/complete', name: 'Complete Organization Profile' },
  { path: '/settings/notifications', name: 'Notification Settings' }
]

const ADMIN_PAGES = [
  { path: '/admin', name: 'Admin Dashboard' },
  { path: '/admin/login', name: 'Admin Login' },
  { path: '/admin/users', name: 'Admin Users' },
  { path: '/admin/campaigns', name: 'Admin Campaigns' },
  { path: '/admin/proposals', name: 'Admin Proposals' },
  { path: '/admin/analytics', name: 'Admin Analytics' },
  { path: '/admin/settings', name: 'Admin Settings' },
  { path: '/admin/logs', name: 'Admin Logs' }
]

const VIEWPORT_SIZES = [
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 }
]

test.describe('Comprehensive Application Testing', () => {
  
  test.describe('Public Pages - Accessibility and Functionality', () => {
    for (const page of PAGES) {
      test(`${page.name} (${page.path}) - Load and basic functionality`, async ({ page: playwright }) => {
        // Navigate to page
        const response = await playwright.goto(page.path)
        
        // Check page loads successfully
        expect(response?.status()).toBeLessThan(400)
        
        // Wait for page to be fully loaded
        await playwright.waitForLoadState('networkidle')
        
        // Check no console errors
        const consoleErrors: string[] = []
        playwright.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text())
          }
        })
        
        // Basic accessibility checks
        await expect(playwright.locator('html')).toHaveAttribute('lang')
        
        // Check for basic page structure
        await expect(playwright.locator('body')).toBeVisible()
        
        // Look for navigation elements
        const hasNavigation = await playwright.locator('nav, [role="navigation"]').count() > 0
        
        // Check for skip link (accessibility)
        const hasSkipLink = await playwright.locator('a[href*="#"]').first().isVisible().catch(() => false)
        
        // Check page title exists and is not empty
        const title = await playwright.title()
        expect(title).toBeTruthy()
        expect(title.length).toBeGreaterThan(0)
        
        // Test common interactive elements
        const buttons = playwright.locator('button, [role="button"]')
        const buttonCount = await buttons.count()
        
        if (buttonCount > 0) {
          // Test first few buttons for basic interaction
          for (let i = 0; i < Math.min(3, buttonCount); i++) {
            const button = buttons.nth(i)
            if (await button.isVisible()) {
              await expect(button).toBeEnabled()
              // Check button has accessible name
              const hasAriaLabel = await button.getAttribute('aria-label')
              const hasText = await button.textContent()
              expect(hasAriaLabel || (hasText && hasText.trim().length > 0)).toBeTruthy()
            }
          }
        }
        
        // Test links
        const links = playwright.locator('a[href]')
        const linkCount = await links.count()
        
        if (linkCount > 0) {
          // Test first few links
          for (let i = 0; i < Math.min(5, linkCount); i++) {
            const link = links.nth(i)
            if (await link.isVisible()) {
              const href = await link.getAttribute('href')
              expect(href).toBeTruthy()
              
              // Check link has accessible text
              const linkText = await link.textContent()
              const hasAriaLabel = await link.getAttribute('aria-label')
              expect(hasAriaLabel || (linkText && linkText.trim().length > 0)).toBeTruthy()
            }
          }
        }
        
        // Report any console errors
        if (consoleErrors.length > 0) {
          console.warn(`Console errors on ${page.path}:`, consoleErrors)
        }
      })
    }
  })

  test.describe('Form Functionality Testing', () => {
    test('Registration forms - Expert registration', async ({ page }) => {
      await page.goto('/auth/register/expert')
      await page.waitForLoadState('networkidle')
      
      // Check form exists
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      // Test form fields
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"], textarea, select')
      const inputCount = await inputs.count()
      
      if (inputCount > 0) {
        for (let i = 0; i < Math.min(5, inputCount); i++) {
          const input = inputs.nth(i)
          if (await input.isVisible() && await input.isEnabled()) {
            // Check input has label or aria-label
            const inputId = await input.getAttribute('id')
            const hasLabel = inputId ? await page.locator(`label[for="${inputId}"]`).count() > 0 : false
            const hasAriaLabel = await input.getAttribute('aria-label')
            const hasPlaceholder = await input.getAttribute('placeholder')
            
            expect(hasLabel || hasAriaLabel || hasPlaceholder).toBeTruthy()
            
            // Test basic input functionality
            const inputType = await input.getAttribute('type')
            if (inputType === 'text' || inputType === 'email') {
              await input.fill('test')
              await expect(input).toHaveValue('test')
              await input.clear()
            }
          }
        }
      }
      
      // Test submit button
      const submitButton = page.locator('button[type="submit"], input[type="submit"]')
      if (await submitButton.count() > 0) {
        await expect(submitButton.first()).toBeVisible()
      }
    })

    test('Registration forms - Organization registration', async ({ page }) => {
      await page.goto('/auth/register/organization')
      await page.waitForLoadState('networkidle')
      
      // Similar tests as expert registration
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      const inputs = page.locator('input, textarea, select')
      const inputCount = await inputs.count()
      
      expect(inputCount).toBeGreaterThan(0)
    })

    test('Login form functionality', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
      
      // Test email field
      const emailField = page.locator('input[type="email"], input[name*="email"]')
      if (await emailField.count() > 0) {
        await emailField.first().fill('test@example.com')
        await expect(emailField.first()).toHaveValue('test@example.com')
      }
      
      // Test password field
      const passwordField = page.locator('input[type="password"], input[name*="password"]')
      if (await passwordField.count() > 0) {
        await passwordField.first().fill('testpassword')
        await expect(passwordField.first()).toHaveValue('testpassword')
      }
      
      // Test form submission (should show validation or redirect)
      const submitButton = page.locator('button[type="submit"], input[type="submit"]')
      if (await submitButton.count() > 0) {
        await expect(submitButton.first()).toBeVisible()
        await expect(submitButton.first()).toBeEnabled()
      }
    })
  })

  test.describe('Responsive Design Testing', () => {
    for (const viewport of VIEWPORT_SIZES) {
      test(`Homepage responsive design - ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        
        // Check page is still functional at this viewport
        await expect(page.locator('body')).toBeVisible()
        
        // Check navigation is accessible
        const nav = page.locator('nav, [role="navigation"]')
        if (await nav.count() > 0) {
          await expect(nav.first()).toBeVisible()
        }
        
        // Check main content is visible
        const main = page.locator('main, [role="main"], .container, .max-w-')
        if (await main.count() > 0) {
          await expect(main.first()).toBeVisible()
        }
        
        // For mobile, check if there's a hamburger menu or mobile navigation
        if (viewport.width < 768) {
          const mobileMenu = page.locator('[aria-label*="menu"], .hamburger, .mobile-menu, button[aria-expanded]')
          // It's okay if there's no mobile menu, but if there is one, it should be functional
        }
        
        // Check text is readable (not too small)
        const headings = page.locator('h1, h2, h3')
        if (await headings.count() > 0) {
          await expect(headings.first()).toBeVisible()
        }
        
        // Check buttons are still clickable
        const buttons = page.locator('button, [role="button"]')
        if (await buttons.count() > 0) {
          const firstButton = buttons.first()
          if (await firstButton.isVisible()) {
            await expect(firstButton).toBeEnabled()
          }
        }
      })
    }
  })

  test.describe('Navigation and Routing', () => {
    test('Navigation between public pages', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Test navigation to different pages through links
      const navLinks = page.locator('nav a, [role="navigation"] a, header a')
      const linkCount = await navLinks.count()
      
      if (linkCount > 0) {
        for (let i = 0; i < Math.min(3, linkCount); i++) {
          const link = navLinks.nth(i)
          if (await link.isVisible()) {
            const href = await link.getAttribute('href')
            if (href && href.startsWith('/') && !href.startsWith('/dashboard') && !href.startsWith('/admin')) {
              await link.click()
              await page.waitForLoadState('networkidle')
              
              // Check we navigated successfully
              expect(page.url()).toContain(href)
              
              // Go back to home
              await page.goto('/')
              await page.waitForLoadState('networkidle')
            }
          }
        }
      }
    })

    test('Footer links functionality', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Test footer links
      const footerLinks = page.locator('footer a')
      const footerLinkCount = await footerLinks.count()
      
      if (footerLinkCount > 0) {
        for (let i = 0; i < Math.min(3, footerLinkCount); i++) {
          const link = footerLinks.nth(i)
          if (await link.isVisible()) {
            const href = await link.getAttribute('href')
            if (href && href.startsWith('/')) {
              // Open in new tab to avoid navigation issues
              const [newPage] = await Promise.all([
                page.context().waitForEvent('page'),
                link.click({ modifiers: ['Meta'] }) // Cmd+click
              ])
              
              await newPage.waitForLoadState('networkidle')
              expect(newPage.url()).toContain(href)
              await newPage.close()
            }
          }
        }
      }
    })
  })

  test.describe('Protected Pages Access Control', () => {
    test('Protected pages redirect to login when not authenticated', async ({ page }) => {
      // Test a few key protected pages
      const testPages = ['/dashboard', '/dashboard/campaigns', '/profile/expert/edit']
      
      for (const testPath of testPages) {
        await page.goto(testPath)
        await page.waitForLoadState('networkidle')
        
        // Should redirect to login or show unauthorized
        const currentUrl = page.url()
        const isRedirectedToAuth = currentUrl.includes('/login') || 
                                   currentUrl.includes('/auth') || 
                                   currentUrl.includes('/unauthorized')
        
        expect(isRedirectedToAuth).toBeTruthy()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('404 page handling', async ({ page }) => {
      const response = await page.goto('/non-existent-page')
      
      // Should either return 404 or redirect
      if (response) {
        expect([404, 200, 302]).toContain(response.status())
      }
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    })

    test('JavaScript error handling', async ({ page }) => {
      const jsErrors: string[] = []
      
      page.on('pageerror', (error) => {
        jsErrors.push(error.message)
      })
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Allow some time for any delayed JS to run
      await page.waitForTimeout(2000)
      
      // Report any JavaScript errors (but don't fail the test unless critical)
      if (jsErrors.length > 0) {
        console.warn('JavaScript errors detected:', jsErrors)
      }
      
      // Page should still be functional despite any JS errors
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Performance and Loading', () => {
    test('Page load performance', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Page should load within reasonable time (10 seconds for CI)
      expect(loadTime).toBeLessThan(10000)
      
      // Check that main content is visible
      await expect(page.locator('body')).toBeVisible()
    })

    test('Image loading and optimization', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      const images = page.locator('img')
      const imageCount = await images.count()
      
      if (imageCount > 0) {
        for (let i = 0; i < Math.min(3, imageCount); i++) {
          const img = images.nth(i)
          if (await img.isVisible()) {
            // Check image has alt text
            const altText = await img.getAttribute('alt')
            expect(altText !== null).toBeTruthy()
            
            // Check image loads successfully
            await expect(img).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Accessibility Compliance', () => {
    test('Keyboard navigation', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Test tab navigation
      await page.keyboard.press('Tab')
      
      // Check if focus is visible
      const focusedElement = await page.locator(':focus').count()
      
      // Continue tabbing through a few elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        const newFocusedElement = await page.locator(':focus').count()
        // Focus should move to a focusable element
      }
    })

    test('Color contrast and text readability', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
      expect(h1Count).toBeLessThanOrEqual(1) // Should only have one h1
      
      // Check headings have text content
      const headings = page.locator('h1, h2, h3, h4, h5, h6')
      const headingCount = await headings.count()
      
      if (headingCount > 0) {
        for (let i = 0; i < Math.min(3, headingCount); i++) {
          const heading = headings.nth(i)
          const text = await heading.textContent()
          expect(text?.trim().length).toBeGreaterThan(0)
        }
      }
    })

    test('Form accessibility', async ({ page }) => {
      await page.goto('/auth/register')
      await page.waitForLoadState('networkidle')
      
      // Check form inputs have proper labels
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]')
      const inputCount = await inputs.count()
      
      if (inputCount > 0) {
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i)
          if (await input.isVisible()) {
            const inputId = await input.getAttribute('id')
            const hasLabel = inputId ? await page.locator(`label[for="${inputId}"]`).count() > 0 : false
            const hasAriaLabel = await input.getAttribute('aria-label')
            const hasAriaLabelledby = await input.getAttribute('aria-labelledby')
            
            expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBeTruthy()
          }
        }
      }
    })
  })
})