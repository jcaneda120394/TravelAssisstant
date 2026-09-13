/**
 * Capture TravelAssistant screenshots for the New User Guide.
 * Uses Expo Web at a consistent iPhone-sized viewport.
 *
 * Usage: node docs/user-guide/capture-screenshots.mjs
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const ANNOTATED = path.join(OUT, 'annotated');
const BASE = process.env.TA_BASE_URL || 'http://localhost:8081';
const VIEWPORT = { width: 393, height: 852 };

async function waitReady(page) {
  await page.waitForTimeout(2800);
  try {
    await page.locator('text=Allow').first().click({ timeout: 800 });
  } catch {
    /* ignore */
  }
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('captured', name);
  return file;
}

async function goto(page, route) {
  const url = route.startsWith('http') ? route : `${BASE}${route}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }
  await waitReady(page);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ANNOTATED, { recursive: true });

  const device = devices['iPhone 14 Pro'] || devices['iPhone 13 Pro'] || devices['iPhone 12 Pro'];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: device?.userAgent,
  });
  const page = await context.newPage();

  const routes = [
    ['/', '04-home.png'],
    ['/login', '02-login.png'],
    ['/signup', '02b-signup.png'],
    ['/explore', '05-explore.png'],
    ['/map', '07-map.png'],
    ['/trips', '09-trips.png'],
    ['/assistant', '12-ai-assistant.png'],
    ['/profile', '21-profile.png'],
    ['/directions', '08-directions.png'],
    ['/hotels', '13-hotels.png'],
    ['/weather', '16-weather.png'],
    ['/currency', '14-currency.png'],
    ['/esim', '17-esim.png'],
    ['/emergency', '18-emergency.png'],
    ['/favorites', '19-favorites.png'],
    ['/notifications', '20-notifications.png'],
    ['/search', '04b-search.png'],
    ['/guide', '04c-guide.png'],
    ['/trip-suggestions', '07b-trip-suggestions.png'],
    ['/trip-suggestion', '07c-trip-suggestion.png'],
    ['/create-trip', '10-create-trip.png'],
    ['/onboarding', '03-onboarding.png'],
    ['/magic-link', '02c-magic-link.png'],
    ['/budget', '15-budget.png'],
  ];

  for (const [route, file] of routes) {
    try {
      await goto(page, route);
      await shot(page, file);
    } catch (err) {
      console.error('FAILED', route, err.message);
    }
  }

  try {
    await goto(page, '/');
    await shot(page, '01-welcome-home.png');
    await page.screenshot({
      path: path.join(ANNOTATED, '04-home-callouts.png'),
      fullPage: false,
    });
  } catch (err) {
    console.error('home retry failed', err.message);
  }

  try {
    await goto(page, '/explore');
    await page.waitForTimeout(5000);
    const card = page.locator('[data-testid^="place-card-"]').first();
    if ((await card.count()) > 0) {
      await card.click();
      await waitReady(page);
      await page.waitForTimeout(3500);
      await shot(page, '06-place-details.png');
    } else {
      console.log('place detail: no cards found');
    }
  } catch (err) {
    console.error('place detail failed', err.message);
  }

  await browser.close();
  console.log('Done. Screenshots in', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
