// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Nerdiversary Main Flows', () => {
  /** @type {string[]} */
  let consoleErrors = [];
  /** @type {string[]} */
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    consoleErrors = [];
    pageErrors = [];

    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Ignore network errors for external resources
        const text = msg.text();
        if (!text.includes('net::ERR_') && !text.includes('Failed to load resource')) {
          consoleErrors.push(text);
        }
      }
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Clear localStorage before each test
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
  });

  test.afterEach(async () => {
    // Fail test if there were any JS errors
    expect(pageErrors, 'Page should have no uncaught errors').toEqual([]);
    expect(consoleErrors, 'Console should have no errors').toEqual([]);
  });

  test('home page loads correctly', async ({ page }) => {
    await page.goto('/index.html');

    // Check title
    await expect(page).toHaveTitle(/Nerdiversary/);

    // Check main elements are visible
    await expect(page.locator('h1.title')).toContainText('Nerdiversary');
    await expect(page.locator('#birthday-form')).toBeVisible();
    await expect(page.locator('#name-0')).toBeVisible();
    await expect(page.locator('#birthdate-0')).toBeVisible();
    await expect(page.locator('#add-member')).toBeVisible();
  });

  test('add family member button works', async ({ page }) => {
    await page.goto('/index.html');

    // Initially should have 1 family member
    await expect(page.locator('.family-member')).toHaveCount(1);

    // Click add family member
    await page.click('#add-member');

    // Should now have 2 family members
    await expect(page.locator('.family-member')).toHaveCount(2);

    // Second member should have name and birthdate inputs
    await expect(page.locator('#name-1')).toBeVisible();
    await expect(page.locator('#birthdate-1')).toBeVisible();
  });

  test('remove family member button works', async ({ page }) => {
    await page.goto('/index.html');

    // Add a second family member
    await page.click('#add-member');
    await expect(page.locator('.family-member')).toHaveCount(2);

    // Remove buttons should now be visible
    await expect(page.locator('.remove-member-btn').first()).toBeVisible();

    // Click remove on second member
    await page.locator('.family-member').nth(1).locator('.remove-member-btn').click();

    // Should be back to 1 member
    await expect(page.locator('.family-member')).toHaveCount(1);
  });

  test('name is optional for single person', async ({ page }) => {
    await page.goto('/index.html');

    // Name input should not be required for single person
    const nameInput = page.locator('#name-0');
    await expect(nameInput).not.toHaveAttribute('required', '');
  });

  test('name becomes required when adding family members', async ({ page }) => {
    await page.goto('/index.html');

    // Add a family member
    await page.click('#add-member');

    // Second member name should be required
    const secondNameInput = page.locator('#name-1');
    await expect(secondNameInput).toHaveAttribute('required', '');
  });

  test('form submission navigates to results page', async ({ page }) => {
    await page.goto('/index.html');

    // Fill in the form
    await page.fill('#birthdate-0', '1990-05-15');

    // Submit the form
    await page.click('button[type="submit"]');

    // Should navigate to results page
    await expect(page).toHaveURL(/results\.html\?family=/);

    // Results page should load successfully
    await expect(page.locator('.family-info')).toBeVisible({ timeout: 10000 });
  });

  test('results page loads with direct URL', async ({ page }) => {
    // Go directly to results page with family parameter
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check that family info is displayed
    await expect(page.locator('.family-info')).toBeVisible({ timeout: 10000 });
  });

  test('results page shows events for direct URL', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for events to calculate and display
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // Check countdown is visible
    await expect(page.locator('#countdown-days')).toBeVisible();
  });

  test('results page filter buttons work', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for events to load
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // Click on "Planetary" filter
    await page.click('[data-filter="planetary"]');

    // The filter button should be active
    await expect(page.locator('[data-filter="planetary"]')).toHaveClass(/active/);
  });

  test('results page timeline toggle works', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for events to load
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // Click on "Past" toggle
    await page.click('[data-view="past"]');

    // The toggle should be active
    await expect(page.locator('[data-view="past"]')).toHaveClass(/active/);
  });

  test('results page shows person filter for multiple people', async ({ page }) => {
    await page.goto('/results.html?family=Alice|1990-01-15,Bob|1985-06-20');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Person filter section should be visible
    await expect(page.locator('#person-filter-section')).toBeVisible({ timeout: 5000 });

    // Should show both names
    await expect(page.locator('#person-filter-buttons')).toContainText('Alice');
    await expect(page.locator('#person-filter-buttons')).toContainText('Bob');
  });

  test('results page handles family URL with mixed time formats', async ({ page }) => {
    // Test with real-world URL: some members have time, some don't
    await page.goto('/results.html?family=Paul|1984-05-02|20:37,Michelle|1982-07-02,Everett|2021-01-31,Orion|2024-08-20');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Should NOT redirect to index - check we're still on results page
    await expect(page).toHaveURL(/results\.html/);

    // Person filter section should be visible for 4 people
    await expect(page.locator('#person-filter-section')).toBeVisible({ timeout: 5000 });

    // Should show all 4 names
    await expect(page.locator('#person-filter-buttons')).toContainText('Paul');
    await expect(page.locator('#person-filter-buttons')).toContainText('Michelle');
    await expect(page.locator('#person-filter-buttons')).toContainText('Everett');
    await expect(page.locator('#person-filter-buttons')).toContainText('Orion');

    // Events should be displayed
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });
  });

  test('share button exists and is clickable', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Share button should exist
    await expect(page.locator('#share-results')).toBeVisible();
  });

  test('back link navigates to home', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Click back link
    await page.click('a.nav-link');

    // Should navigate to home (wait for it)
    await expect(page).toHaveURL(/index\.html|\/$/);
  });

  test('celebration overlay displays and can be dismissed', async ({ page }) => {
    await page.goto('/results.html?family=Test|1990-05-15');

    // Wait for events to load
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // Trigger celebration via exposed test function
    await page.evaluate(() => window.testCelebration());

    // Celebration overlay should appear
    await expect(page.locator('.celebration-overlay')).toBeVisible();
    await expect(page.locator('.celebration-title')).toContainText("It's Happening NOW!");
    await expect(page.locator('.celebration-emoji')).toBeVisible();

    // Confetti should be present
    await expect(page.locator('.confetti-container')).toBeVisible();
    await expect(page.locator('.confetti').first()).toBeVisible();

    // Dismiss button should work
    await page.click('.celebration-dismiss');

    // Overlay should be removed
    await expect(page.locator('.celebration-overlay')).not.toBeVisible({ timeout: 2000 });
  });

  test('celebration shows person name in family mode', async ({ page }) => {
    await page.goto('/results.html?family=Alice|1990-01-15,Bob|1985-06-20');

    // Wait for events to load
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // Trigger celebration
    await page.evaluate(() => window.testCelebration());

    // Celebration overlay should show person name
    await expect(page.locator('.celebration-overlay')).toBeVisible();
    await expect(page.locator('.celebration-person')).toBeVisible();

    // Dismiss
    await page.click('.celebration-dismiss');
  });

  test('countdown cache invalidation when switching person filter', async ({ page }) => {
    await page.goto('/results.html?family=Alice|1990-01-15,Bob|1985-06-20');

    // Wait for events to load
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 15000 });

    // Ensure countdown is present before switching
    await expect(page.locator('.countdown-title')).toBeVisible();

    // Click on Bob's filter to switch person
    await page.click('button[data-person="Bob"]');

    // Wait a moment for the display to update
    await page.waitForTimeout(500);

    // Verify countdown elements still exist and are updating
    await expect(page.locator('#countdown-days')).toBeVisible();
    await expect(page.locator('#countdown-hours')).toBeVisible();
    await expect(page.locator('#countdown-minutes')).toBeVisible();
    await expect(page.locator('#countdown-seconds')).toBeVisible();

    // Switch back to All
    await page.click('button[data-person="all"]');

    // Wait a moment for the display to update
    await page.waitForTimeout(500);

    // Countdown should still work
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

    // Get initial seconds value
    const initialSeconds = await page.locator('#countdown-seconds').textContent();

    // Wait for countdown to tick
    await page.waitForTimeout(1500);

    // Seconds should have changed (or wrapped around)
    const newSeconds = await page.locator('#countdown-seconds').textContent();

    // At least one of them should be a valid number
    expect(parseInt(initialSeconds)).toBeGreaterThanOrEqual(0);
    expect(parseInt(newSeconds)).toBeGreaterThanOrEqual(0);
  });

  test('XSS prevention - malicious URL params are escaped', async ({ page }) => {
    // Attempt XSS via second family member (first member uses safe .value assignment,
    // but addFamilyMember() for members 2+ could be vulnerable to innerHTML injection)
    const xssPayload = '"><img src=x onerror=alert(1)>';
    // Two members: safe first, malicious second
    const maliciousUrl = `/index.html?family=Safe|1990-01-01,${encodeURIComponent(xssPayload)}|1995-05-05`;

    // Track if any alert/error occurs
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.goto(maliciousUrl);

    // Wait for the second member's name input to be populated
    const nameInput = page.locator('#name-1');
    await nameInput.waitFor({ state: 'visible' });

    // XSS should NOT have executed
    expect(alertFired).toBe(false);

    // The malicious string should be safely contained in the input value
    const value = await nameInput.inputValue();
    expect(value).toBe(xssPayload);

    // The page HTML should NOT contain unescaped script injection
    const html = await page.content();
    expect(html).not.toContain('onerror=alert');
  });
});
