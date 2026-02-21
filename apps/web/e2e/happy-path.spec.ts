import { expect, test } from '@playwright/test';

test('landing and route accessibility', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Trust-driven stock intelligence/i }),
  ).toBeVisible();

  await page.goto('/stock/RELIANCE.NS');
  await expect(page.getByText(/Stock intelligence/i)).toBeVisible();

  await page.goto('/quiz');
  await expect(page.getByRole('heading', { name: /Risk Personality Quiz/i })).toBeVisible();

  await page.goto('/portfolio');
  await expect(page.getByRole('heading', { name: /AI Portfolio Advisor/i })).toBeVisible();

  await page.goto('/sip');
  await expect(page.getByRole('heading', { name: /Smart SIP Planner/i })).toBeVisible();

  await page.goto('/donate');
  await expect(page.getByRole('heading', { name: /Support Anylical Engine/i })).toBeVisible();

  await page.goto('/watchlist');
  await expect(page.getByRole('heading', { name: /My Watchlist/i })).toBeVisible();
});
