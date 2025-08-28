import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should display login page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login')
    
    // Check for login form elements
    await expect(page.locator('h1')).toContainText('로그인')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login')
    
    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Check for error message
    await expect(page.locator('text=/오류|에러|실패/i')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login')
    
    // Click register link
    await page.click('text=/회원가입|가입/i')
    
    // Check if navigated to register page
    await expect(page).toHaveURL(/.*register/)
    await expect(page.locator('h1')).toContainText('회원가입')
  })

  test('should display register form with role selection', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/register')
    
    // Check for role selection
    await expect(page.locator('text=/전문가|기관/i')).toBeVisible()
    
    // Check for form fields
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/register')
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalidemail')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    
    // Try to submit
    await page.click('button[type="submit"]')
    
    // Check for validation error
    await expect(page.locator('text=/이메일|email/i')).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Check for hero section
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=/스타트업|전문가/i')).toBeVisible()
  })

  test('should open mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')
    
    // Click mobile menu button
    await page.click('button[aria-label="모바일 메뉴 토글"]')
    
    // Check if menu is visible
    await expect(page.locator('text=이용방법')).toBeVisible()
    await expect(page.locator('text=전문가 찾기')).toBeVisible()
    await expect(page.locator('text=회사소개')).toBeVisible()
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Check navigation links exist
    const links = [
      { text: '이용방법', href: '#how-it-works' },
      { text: '전문가 찾기', href: '#features' },
      { text: '회사소개', href: '#cta' }
    ]
    
    for (const link of links) {
      const element = page.locator(`a:has-text("${link.text}")`)
      await expect(element).toBeVisible()
      await expect(element).toHaveAttribute('href', link.href)
    }
  })
})

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ]

  viewports.forEach(({ name, width, height }) => {
    test(`should render correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('http://localhost:3000')
      
      // Check main elements are visible
      await expect(page.locator('header')).toBeVisible()
      await expect(page.locator('main')).toBeVisible()
      
      // Check responsive behavior
      if (width < 768) {
        // Mobile: hamburger menu should be visible
        await expect(page.locator('button[aria-label="모바일 메뉴 토글"]')).toBeVisible()
      } else {
        // Desktop: regular navigation should be visible
        await expect(page.locator('nav a:has-text("이용방법")')).toBeVisible()
      }
    })
  })

  test('should have proper touch targets on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')
    
    // Open mobile menu
    await page.click('button[aria-label="모바일 메뉴 토글"]')
    
    // Check button sizes (should be at least 44x44px for touch)
    const buttons = await page.locator('button').all()
    for (const button of buttons.slice(0, 3)) { // Check first 3 buttons
      const box = await button.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  })
})