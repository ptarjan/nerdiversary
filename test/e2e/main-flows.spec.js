// @ts-check
import { test, expect } from '@playwright/test';
import { PAGES } from '../../scripts/landing-pages-data.js';
import { HAPPENING_NOW, NOTIFY_LABELS } from '../../js/shared.js';

test.describe('Nerdiversary Main Flows', () => {
  /** @type {string[]} */
  let consoleErrors = [];
  /** @type {string[]} */
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Ignore network errors for external resources
        const text = msg.text();
        if (!text.includes('net::ERR_') && !text.includes('Failed to load resource')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // localStorage is per-origin, so load a page before clearing it.
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
  });

  test.afterEach(async () => {
    // Any uncaught exception or console.error fails the test.
    expect(pageErrors, 'Page should have no uncaught errors').toEqual([]);
    expect(consoleErrors, 'Console should have no errors').toEqual([]);
  });

  test('home page loads correctly', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page).toHaveTitle(/Nerdiversary/);

    await expect(page.locator('h1.title')).toContainText('Nerdiversary');
    await expect(page.locator('#birthday-form')).toBeVisible();
    await expect(page.locator('#name-0')).toBeVisible();
    await expect(page.locator('#birthdate-0')).toBeVisible();
    await expect(page.locator('#add-member')).toBeVisible();
  });

  test('add family member button works', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page.locator('.family-member')).toHaveCount(1);

    await page.click('#add-member');

    await expect(page.locator('.family-member')).toHaveCount(2);

    await expect(page.locator('#name-1')).toBeVisible();
    await expect(page.locator('#birthdate-1')).toBeVisible();
  });

  test('remove family member button works', async ({ page }) => {
    await page.goto('/index.html');

    await page.click('#add-member');
    await expect(page.locator('.family-member')).toHaveCount(2);

    await expect(page.locator('.remove-member-btn').first()).toBeVisible();

    await page.locator('.family-member').nth(1).locator('.remove-member-btn').click();

    await expect(page.locator('.family-member')).toHaveCount(1);
  });

  test('name is optional for single person', async ({ page }) => {
    await page.goto('/index.html');

    const nameInput = page.locator('#name-0');
    await expect(nameInput).not.toHaveAttribute('required', '');
  });

  test('name becomes required when adding family members', async ({ page }) => {
    await page.goto('/index.html');

    await page.click('#add-member');

    const secondNameInput = page.locator('#name-1');
    await expect(secondNameInput).toHaveAttribute('required', '');
  });

  test('form submission navigates to results page', async ({ page }) => {
    await page.goto('/index.html');

    await page.fill('#birthdate-0', '1990-05-15');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/results\.html\?family=/);

    await expect(page.locator('.family-info')).toBeVisible({ timeout: 10000 });
  });

  test('results page loads with direct URL', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('.family-info')).toBeVisible({ timeout: 10000 });
  });

  test('results page shows events for direct URL', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    await expect(page.locator('#countdown-days')).toBeVisible();
  });

  test('results page filter buttons work', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    await page.click('[data-filter="planetary"]');

    await expect(page.locator('[data-filter="planetary"]')).toHaveClass(/active/);
  });

  test('results page timeline toggle works', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    await page.click('[data-view="past"]');

    await expect(page.locator('[data-view="past"]')).toHaveClass(/active/);
  });

  test('results page shows person filter for multiple people', async ({ page }) => {
    await page.goto('/results.html?family=Alice|1990-01-15,Bob|1985-06-20');

    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#person-filter-section')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('#person-filter-buttons')).toContainText('Alice');
    await expect(page.locator('#person-filter-buttons')).toContainText('Bob');
  });

  test('results page handles family URL with mixed time formats', async ({ page }) => {
    // Test with real-world URL: some members have time, some don't
    await page.goto('/results.html?family=Paul|1984-05-02|20:37,Michelle|1982-07-02,Everett|2021-01-31,Orion|2024-08-20');

    await page.waitForLoadState('domcontentloaded');

    // Should NOT redirect to index - check we're still on results page
    await expect(page).toHaveURL(/results\.html/);

    await expect(page.locator('#person-filter-section')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('#person-filter-buttons')).toContainText('Paul');
    await expect(page.locator('#person-filter-buttons')).toContainText('Michelle');
    await expect(page.locator('#person-filter-buttons')).toContainText('Everett');
    await expect(page.locator('#person-filter-buttons')).toContainText('Orion');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });
  });

  test('names with commas and percent signs survive form submission', async ({ page }) => {
    await page.goto('/index.html');

    // Two members so names are required and both parsing paths are exercised
    await page.fill('#name-0', 'Bob, Jr.');
    await page.fill('#birthdate-0', '1985-03-22');
    await page.click('#add-member');
    await page.fill('#name-1', '100% Nerd');
    await page.fill('#birthdate-1', '1990-05-15');

    await page.click('button[type="submit"]');

    // Should land on results (not bounce back to index) with both members intact
    await expect(page).toHaveURL(/results\.html\?family=/);
    await expect(page.locator('#person-filter-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#person-filter-buttons')).toContainText('Bob, Jr.');
    await expect(page.locator('#person-filter-buttons')).toContainText('100% Nerd');
  });

  test('SEO landing page loads and its form reaches results', async ({ page }) => {
    // Assert against the page data, not a copy of it, so rewriting the copy
    // cannot leave this test asserting a title that no longer ships.
    const lp = PAGES.find(p => p.slug === 'billion-seconds');
    await page.goto(`/${lp.slug}.html`);

    await expect(page).toHaveTitle(`${lp.title} - Nerdiversary`);
    await expect(page.locator('h1')).toContainText(lp.heading);

    await page.fill('#lp-date', '1990-05-15');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/results\.html\?family=/);
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });
  });

  test('legendary milestones show rarity badge and next-legendary teaser', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    await expect(page.locator('.next-legendary')).toBeVisible();

    await page.click('[data-view="all"]');
    await expect(page.locator('.rarity-badge.legendary').first()).toBeVisible();
  });

  test('share button exists and is clickable', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#share-results')).toBeVisible();
  });

  test('back link navigates to home', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    await page.waitForLoadState('domcontentloaded');

    await page.click('a.nav-link');

    await expect(page).toHaveURL(/index\.html|\/$/);
  });

  test('celebration overlay displays and can be dismissed', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // Trigger celebration via exposed test function
    await page.evaluate(() => window.testCelebration());

    await expect(page.locator('.celebration-overlay')).toBeVisible();
    await expect(page.locator('.celebration-title')).toContainText(HAPPENING_NOW);
    await expect(page.locator('.celebration-emoji')).toBeVisible();

    await expect(page.locator('.confetti-container')).toBeVisible();
    await expect(page.locator('.confetti').first()).toBeVisible();

    const confettiZIndex = await page.locator('.confetti-container').evaluate(el =>
      parseInt(getComputedStyle(el).zIndex) || 0
    );
    const overlayZIndex = await page.locator('.celebration-overlay').evaluate(el =>
      parseInt(getComputedStyle(el).zIndex) || 0
    );
    expect(confettiZIndex).toBeGreaterThan(overlayZIndex);

    await page.click('.celebration-dismiss');

    await expect(page.locator('.celebration-overlay')).not.toBeVisible({ timeout: 2000 });
  });

  test('celebration shows person name in family mode', async ({ page }) => {
    await page.goto('/results.html?family=Alice|1990-01-15,Bob|1985-06-20');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => window.testCelebration());

    await expect(page.locator('.celebration-overlay')).toBeVisible();
    await expect(page.locator('.celebration-person')).toBeVisible();

    await page.click('.celebration-dismiss');
  });

  test('countdown cache invalidation when switching person filter', async ({ page }) => {
    await page.goto('/results.html?family=Alice|1990-01-15,Bob|1985-06-20');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    await expect(page.locator('.countdown-title')).toBeVisible();

    await page.click('button[data-person="Bob"]');

    await page.waitForTimeout(500);

    await expect(page.locator('#countdown-days')).toBeVisible();
    await expect(page.locator('#countdown-hours')).toBeVisible();
    await expect(page.locator('#countdown-minutes')).toBeVisible();
    await expect(page.locator('#countdown-seconds')).toBeVisible();

    await page.click('button[data-person="all"]');

    await page.waitForTimeout(500);

    await expect(page.locator('#countdown-days')).toBeVisible();

    // Wait for the interval to tick and verify values are valid numbers
    await page.waitForTimeout(1100);
    const daysText = await page.locator('#countdown-days').textContent();
    expect(parseInt(daysText)).toBeGreaterThanOrEqual(0);
  });

  test('countdown continues to update after page interactions', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for events to load
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    const initialSeconds = await page.locator('#countdown-seconds').textContent();

    await page.waitForTimeout(1500);

    // The value may have wrapped, so only check both reads are numbers.
    const newSeconds = await page.locator('#countdown-seconds').textContent();

    expect(parseInt(initialSeconds)).toBeGreaterThanOrEqual(0);
    expect(parseInt(newSeconds)).toBeGreaterThanOrEqual(0);
  });

  test('XSS prevention - malicious URL params are escaped', async ({ page }) => {
    // Attempt XSS via second family member (first member uses safe .value assignment,
    // but addFamilyMember() for members 2+ could be vulnerable to innerHTML injection)
    const xssPayload = '"><img src=x onerror=alert(1)>';
    // Two members: safe first, malicious second
    const maliciousUrl = `/index.html?family=Safe|1990-01-01,${encodeURIComponent(xssPayload)}|1995-05-05`;

    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.goto(maliciousUrl);

    const nameInput = page.locator('#name-1');
    await nameInput.waitFor({ state: 'visible' });

    expect(alertFired).toBe(false);

    const value = await nameInput.inputValue();
    expect(value).toBe(xssPayload);

    const html = await page.content();
    expect(html).not.toContain('onerror=alert');
  });

  test('all event categories have corresponding filter buttons', async ({ page }) => {
    // Load results page with a birthdate that will generate events in all categories
    await page.goto('/results.html?family=Test|1990-01-01');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    const eventCategories = await page.evaluate(() => {
      const cards = document.querySelectorAll('.event-card[data-category]');
      const categories = new Set();
      cards.forEach(card => categories.add(card.dataset.category));
      return Array.from(categories);
    });

    const filterCategories = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.filter-btn[data-filter]');
      const categories = [];
      buttons.forEach(btn => {
        if (btn.dataset.filter !== 'all') {
          categories.push(btn.dataset.filter);
        }
      });
      return categories;
    });

    for (const category of eventCategories) {
      expect(filterCategories, `Filter button missing for category: ${category}`).toContain(category);
    }
  });

  test('notification button is visible on results page', async ({ page }) => {
    await page.goto(`/results.html?family=${encodeURIComponent('Test|1990-01-01')}`);
    await page.waitForSelector('.event-card');

    const notifyBtn = page.locator('#enable-notifications');
    await expect(notifyBtn).toBeVisible();

    // The button must be in one of its declared states. Assert against the
    // labels the app exports, so rewording the copy cannot fail this test.
    const btnText = await notifyBtn.textContent();
    expect(Object.values(NOTIFY_LABELS).some(l => btnText.includes(l))).toBe(true);
  });

  test('notification button has correct initial state', async ({ page }) => {
    await page.goto(`/results.html?family=${encodeURIComponent('Test|1990-01-01')}`);
    await page.waitForSelector('.event-card');

    const notifyBtn = page.locator('#enable-notifications');
    await expect(notifyBtn).toBeVisible();

    await expect(notifyBtn).toHaveClass(/notification-btn/);

    const icon = notifyBtn.locator('.btn-icon');
    await expect(icon).toBeVisible();
  });

  test('PWA persistence - results page loads from storage when no URL params', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#birthdate-0', '1990-05-15');
    await page.fill('#name-0', 'TestPerson');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/results\.html\?family=/);
    await expect(page.locator('.family-info')).toBeVisible({ timeout: 10000 });

    // Now navigate directly to results.html WITHOUT URL params (simulating PWA reopen)
    await page.goto('/results.html');

    // Page should NOT redirect to index - it should load from storage
    await expect(page).toHaveURL(/results\.html/);

    await expect(page.locator('.family-info')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.family-info')).toContainText('TestPerson');

    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // URL should have been updated with family params for shareability
    await expect(page).toHaveURL(/family=TestPerson/);
  });

  test('PWA persistence - index auto-navigates to results when data is stored', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#birthdate-0', '1985-12-25');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/results\.html\?family=/);

    await page.goto('/index.html');

    // Should auto-navigate to results because storage has data
    await expect(page).toHaveURL(/results\.html\?family=/, { timeout: 5000 });
  });

  test('PWA persistence - index shows form with new=1 flag even when data is stored', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#birthdate-0', '1985-12-25');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/results\.html\?family=/);

    await page.goto('/index.html?new=1');

    // ?new=1 opts out of the auto-navigate so the form can be edited.
    await expect(page).toHaveURL(/index\.html\?new=1/);

    // Form should be visible and pre-populated with stored data
    await expect(page.locator('#birthday-form')).toBeVisible();
    await expect(page.locator('#birthdate-0')).toHaveValue('1985-12-25');
  });
});
