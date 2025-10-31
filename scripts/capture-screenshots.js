/**
 * Screenshot Capture Script
 * 모든 주요 페이지의 스크린샷을 자동으로 캡처합니다.
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// 스크린샷 저장 디렉토리
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

// 캡처할 페이지 목록
const PAGES = [
  {
    name: '01-main-page',
    url: 'http://localhost:3004',
    description: '메인 페이지'
  },
  {
    name: '02-login',
    url: 'http://localhost:3004/auth/login',
    description: '로그인 페이지'
  },
  {
    name: '03-register-expert',
    url: 'http://localhost:3004/auth/register/expert',
    description: '전문가 회원가입'
  },
  {
    name: '04-register-org',
    url: 'http://localhost:3004/auth/register/organization',
    description: '기관 회원가입'
  },
  // 로그인 필요한 페이지들은 인증 후 캡처
  {
    name: '05-dashboard',
    url: 'http://localhost:3004/dashboard',
    description: '대시보드',
    requiresAuth: true
  },
  {
    name: '06-expert-profile-complete',
    url: 'http://localhost:3004/profile/expert/complete',
    description: '전문가 프로필 완성',
    requiresAuth: true,
    role: 'expert'
  },
  {
    name: '07-org-profile-complete',
    url: 'http://localhost:3004/profile/organization/complete',
    description: '기관 프로필 완성',
    requiresAuth: true,
    role: 'organization'
  },
  {
    name: '08-campaigns-list',
    url: 'http://localhost:3004/dashboard/campaigns',
    description: '캠페인 목록',
    requiresAuth: true
  },
  {
    name: '09-campaign-create',
    url: 'http://localhost:3004/dashboard/campaigns/create',
    description: '캠페인 생성',
    requiresAuth: true,
    role: 'organization'
  },
  {
    name: '10-proposals',
    url: 'http://localhost:3004/dashboard/proposals',
    description: '제안서 목록',
    requiresAuth: true
  },
  {
    name: '11-experts-search',
    url: 'http://localhost:3004/dashboard/experts',
    description: '전문가 검색',
    requiresAuth: true
  }
];

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture process...\n');

  // 스크린샷 디렉토리 생성
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false, // 디버깅을 위해 브라우저 표시
    slowMo: 100 // 각 액션 사이에 100ms 대기
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // 콘솔 에러 수집
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        location: msg.location()
      });
    }
  });

  // 네트워크 에러 수집
  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  // 인증 상태 관리
  let isAuthenticated = false;

  for (const pageInfo of PAGES) {
    try {
      console.log(`📸 Capturing: ${pageInfo.description}`);
      console.log(`   URL: ${pageInfo.url}`);

      // 인증이 필요한 페이지인 경우 로그인 수행
      if (pageInfo.requiresAuth && !isAuthenticated) {
        console.log('   🔐 Authentication required, logging in...');

        // 여기에 실제 로그인 로직 추가
        // 테스트 계정 정보는 환경 변수에서 가져오기
        await page.goto('http://localhost:3004/auth/login');
        await page.waitForLoadState('networkidle');

        // 로그인 폼 작성 (실제 테스트 계정 필요)
        // await page.fill('input[name="email"]', process.env.TEST_EMAIL);
        // await page.fill('input[name="password"]', process.env.TEST_PASSWORD);
        // await page.click('button[type="submit"]');
        // await page.waitForNavigation();

        console.log('   ⚠️  Manual login required - please log in manually');
        console.log('   ⏸️  Waiting 10 seconds for manual login...');
        await page.waitForTimeout(10000);

        isAuthenticated = true;
      }

      // 페이지 이동
      await page.goto(pageInfo.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 페이지 로딩 대기
      await page.waitForTimeout(2000);

      // 풀 페이지 스크린샷
      const screenshotPath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}-full.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      console.log(`   ✅ Saved: ${pageInfo.name}-full.png`);

      // 모바일 뷰 캡처 (반응형 확인)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      const mobileScreenshotPath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}-mobile.png`);
      await page.screenshot({
        path: mobileScreenshotPath,
        fullPage: true
      });
      console.log(`   ✅ Saved: ${pageInfo.name}-mobile.png`);

      // 뷰포트 원복
      await page.setViewportSize({ width: 1920, height: 1080 });

      console.log('');

    } catch (error) {
      console.error(`   ❌ Error capturing ${pageInfo.name}:`, error.message);
      console.log('');
    }
  }

  // 에러 리포트 생성
  const errorReport = {
    timestamp: new Date().toISOString(),
    consoleErrors: consoleErrors,
    networkErrors: networkErrors
  };

  const reportPath = path.join(SCREENSHOTS_DIR, 'error-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));
  console.log('📄 Error report saved to error-report.json');

  // 콘솔 에러 요약
  if (consoleErrors.length > 0) {
    console.log('\n⚠️  Console Errors Found:');
    consoleErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.text}`);
    });
  }

  // 네트워크 에러 요약
  if (networkErrors.length > 0) {
    console.log('\n⚠️  Network Errors Found:');
    const uniqueErrors = [...new Set(networkErrors.map(e => `${e.status} ${e.url}`))];
    uniqueErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  await browser.close();
  console.log('\n✅ Screenshot capture complete!');
  console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

// 실행
captureScreenshots().catch(console.error);
