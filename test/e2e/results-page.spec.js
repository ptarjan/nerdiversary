// @ts-check
import { test, expect } from '@playwright/test';

/**
 * results.html URL for a family, encoded the way main.js builds it: each name
 * percent-encoded, then the whole value encoded again.
 * @param {Array<[string, string]>} people - [name, YYYY-MM-DD]
 */
function resultsUrl(people) {
  const family = people.map(([name, date]) => `${encodeURIComponent(name)}|${date}`).join(',');
  return `/results.html?family=${encodeURIComponent(family)}`;
}

test('a crafted name in the URL injects no markup anywhere on the results page', async ({ page }) => {
  const payload = '"><img src=x onerror="window.__xss=1">\'';
  await page.goto(resultsUrl([[payload, '1990-05-15'], [`b${payload}`, '1985-06-20']]));
  await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

  // Every place a name is drawn: header badges, person filter, countdown,
  // timeline cards, share dialog, subscribe dialog, celebration overlay.
  await expect(page.locator('.family-member-badge').first()).toContainText(payload);
  await page.locator('.event-share-btn').first().click();
  await expect(page.locator('.share-preview-text')).toBeVisible();
  await page.locator('.import-modal .import-close').click();
  await page.click('#subscribe-calendar');
  await page.locator('.import-modal .import-close').click();
  await page.evaluate(() => window.testCelebration());
  await expect(page.locator('.celebration-overlay')).toBeVisible();

  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => /** @type {any} */ (window).__xss)).toBeUndefined();

  // The share button's id still finds its event after escaping.
  await page.locator('.celebration-dismiss').click();
  await page.locator('.event-share-btn').first().click();
  await expect(page.locator('.share-preview-text')).toBeVisible();
});

// Someone born at UTC midnight 1990-05-15 turns 1 billion seconds old at this
// instant; no other milestone falls within a day of it.
const BIRTH = 'Test|1990-05-15|00:00|UTC';
const BILLION_SECONDS = new Date(Date.UTC(1990, 4, 15) + 1e9 * 1000);

test('the celebration shows when a milestone arrives while the page is open', async ({ page }) => {
  await page.clock.install({ time: new Date(BILLION_SECONDS.getTime() - 10_000) });
  await page.goto(`/results.html?family=${encodeURIComponent(BIRTH)}`);
  await expect(page.locator('.countdown-title')).toContainText('1 billion seconds');
  await expect(page.locator('.celebration-overlay')).toHaveCount(0);

  await page.clock.runFor(15_000);

  await expect(page.locator('.celebration-event')).toHaveText('1 billion seconds');
  await page.click('.celebration-dismiss');
  await page.clock.runFor(1_000);
  await expect(page.locator('.celebration-overlay')).toHaveCount(0);
  await expect(page.locator('.countdown-title')).not.toContainText('1 billion seconds');
});

/**
 * Open results.html 20 s before BILLION_SECONDS with notifications already on,
 * advance past the milestone, and return the notifications the page itself
 * showed. Pushes are shown by sw.js, not the page, so they are not counted.
 * @param {import('@playwright/test').Page} page
 * @param {number} pushStatus - the worker's reply to /push/subscribe
 */
async function notificationsShownByPage(page, pushStatus) {
  await page.addInitScript(() => {
    // Headless Chromium reports 'denied' even after grantPermissions.
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    localStorage.setItem('nerdiversary-notifications-enabled', 'true');
    const win = /** @type {any} */ (window);
    win.__shown = [];
    ServiceWorkerRegistration.prototype.showNotification = async function (title, options) {
      win.__shown.push({ title, tag: options && options.tag });
    };
    const subscription = {
      endpoint: 'https://push.example/test',
      toJSON: () => ({ endpoint: 'https://push.example/test', keys: { p256dh: 'p', auth: 'a' } }),
      unsubscribe: async () => true,
    };
    PushManager.prototype.getSubscription = async () => /** @type {any} */ (subscription);
  });
  /** @type {() => void} */
  let subscribed = () => {};
  const subscribeCalled = new Promise(resolve => { subscribed = () => resolve(undefined); });
  await page.route('**/push/subscribe', route => {
    subscribed();
    return route.fulfill({ status: pushStatus, body: '{}' });
  });

  await page.clock.install({ time: new Date(BILLION_SECONDS.getTime() - 20_000) });
  await page.goto(`/results.html?family=${encodeURIComponent(BIRTH)}`);
  await subscribeCalled;
  // Let the page act on the worker's reply before time moves.
  await page.waitForTimeout(500);
  await page.clock.runFor(30_000);
  // showNotification is async; give the fired timers a moment to call it.
  await page.waitForTimeout(500);
  return page.evaluate(() => /** @type {any} */ (window).__shown);
}

test('with push on, an open page shows no alert of its own (push is the one)', async ({ page }) => {
  expect(await notificationsShownByPage(page, 200)).toEqual([]);
});

test('without push, an open page alerts exactly once when a milestone arrives', async ({ page }) => {
  const shown = await notificationsShownByPage(page, 500);
  expect(shown).toHaveLength(1);
  expect(shown[0].title).toContain('Happening now');
});
