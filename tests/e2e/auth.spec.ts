import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check for login form elements - 실제 페이지의 텍스트 확인
    await expect(page.getByRole('heading', { name: '다시 만나서 반가워요!' })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Check for error message
    await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeVisible()
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Click register link
    await page.getByRole('link', { name: '전문가 가입' }).click()
    
    // Check if navigated to register page
    await expect(page).toHaveURL(/.*register/)
    await expect(page.locator('h1')).toContainText('회원가입')
  })

  test('should display register form with role selection', async ({ page }) => {
    await page.goto('/auth/register')
    
    // Check for role selection
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible()
    const expertButton = page.getByRole('button', { name: '전문가 회원가입 페이지로 이동' })
    await expect(expertButton).toBeVisible()
    await expect(page.getByRole('button', { name: '조직 회원가입 페이지로 이동' })).toBeVisible()
    await expertButton.click()
    await expect(page).toHaveURL(/\/auth\/register\/expert/)
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/register/expert')
    
    // Enter invalid email
    const emailField = page.locator('input[type="email"]')
    await emailField.fill('invalidemail')
    
    // Try to submit
    await page.click('button[type="submit"]')
    
    // Browser-native validation should block malformed email submission.
    await expect(emailField).not.toHaveJSProperty('validationMessage', '')
  })
})

test.describe('Navigation', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('/')
    
    // Check for hero section
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('heading', { name: /필요한 전문가를/ })).toBeVisible()
  })

  test('should show primary CTAs on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    await expect(page.getByRole('link', { name: '기관으로 시작하기' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: '전문가로 시작하기' }).first()).toBeVisible()
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/')
    
    // Check current public links exposed on the homepage footer.
    const links = [
      { text: '전문가 찾기', href: '/experts' },
      { text: '프로젝트 등록', href: '/campaigns' },
      { text: '회사소개', href: '/about' }
    ]
    
    for (const link of links) {
      const element = page.locator('footer').getByRole('link', { name: link.text }).first()
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
      await page.goto('/')
      
      // Check main elements are visible
      await expect(page.locator('header, main, body')).toBeVisible()
      
      // Check responsive behavior
      if (width < 768) {
        // Mobile: hamburger menu should be visible (if logged in, DashboardLayout의 메뉴)
        const menuButton = page.locator('button[aria-label="메뉴 토글"]')
        // 메뉴 버튼이 있으면 확인, 없으면 스킵 (로그인 안 한 경우)
        const count = await menuButton.count()
        if (count > 0) {
          await expect(menuButton).toBeVisible()
        }
      }
    })
  })

  test('should have proper touch targets on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Open mobile menu if available (DashboardLayout)
    const menuButton = page.locator('button[aria-label="메뉴 토글"]')
    const count = await menuButton.count()
    if (count > 0) {
      await menuButton.click()
    }
    
    // Check primary app touch targets rather than dev-overlay controls.
    const touchTargets = await page.locator('a[href^="/auth/login"]').all()
    for (const target of touchTargets.slice(0, 2)) {
      const box = await target.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  })
})
