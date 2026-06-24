import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1. 로그인 테스트 (기존 인증된 계정)
console.log('=== 1. 로그인 테스트 ===');
await page.goto('http://localhost:3000/auth/login');
await page.fill('input[type="email"]', 'jbhan021@naver.com');
await page.fill('input[type="password"]', 'test1234');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

const afterLoginUrl = page.url();
const body = await page.textContent('body');
const loginOk = afterLoginUrl.includes('/dashboard');
console.log('로그인 후 URL:', afterLoginUrl);
console.log('대시보드 이동:', loginOk ? '✅ 성공' : '❌ 실패');

if (loginOk) {
  // 2. 대시보드 내용 확인
  console.log('\n=== 2. 대시보드 확인 ===');
  const hasGreeting = body?.includes('님');
  const hasModules = body?.includes('커머스') || body?.includes('미디어');
  console.log('인사 메시지:', hasGreeting ? '✅' : '❌');
  console.log('모듈 표시:', hasModules ? '✅' : '❌');

  // 3. 로그아웃 테스트
  console.log('\n=== 3. 로그아웃 테스트 ===');
  await page.click('button:has-text("로그아웃")');
  await page.waitForTimeout(2000);
  const afterLogout = page.url();
  console.log('로그아웃 후 URL:', afterLogout);
  console.log('메인 이동:', afterLogout.includes('localhost:3000') ? '✅' : '❌');
}

const errorEl = page.locator('.text-red-400');
if (await errorEl.count() > 0) {
  console.log('\n❌ 에러:', await errorEl.textContent());
}

await browser.close();
