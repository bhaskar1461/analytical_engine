import { expect, test } from '@playwright/test';

test('mocked interactive journey: quiz -> portfolio -> sip -> donate', async ({ page }) => {
  await page.route('**/api/quiz/submit', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          riskScore: 57.5,
          persona: 'OWL',
          riskLevel: 'MODERATE',
          warnings: [],
          modelVersion: 'quiz-v1.0.0',
        },
      }),
    });
  });

  await page.route('**/api/portfolio/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          riskPersona: 'OWL',
          amountInr: 50000,
          horizonMonths: 60,
          confidence: 78,
          riskLevel: 'Moderate',
          volatilityEstimate: 21.3,
          educationalOnly: true,
          nonBinding: true,
          allocations: [
            {
              symbol: 'NIFTYBEES.NS',
              label: 'Nippon India ETF Nifty 50',
              sector: 'ETF',
              weightPct: 35,
              expectedVolatility: 14.2,
              trustScore: 76.1,
            },
            {
              symbol: 'HDFCBANK.NS',
              label: 'HDFC Bank',
              sector: 'Financial Services',
              weightPct: 33,
              expectedVolatility: 20.1,
              trustScore: 72.9,
            },
            {
              symbol: 'ITC.NS',
              label: 'ITC',
              sector: 'FMCG',
              weightPct: 32,
              expectedVolatility: 18.7,
              trustScore: 71.5,
            },
          ],
          warnings: [],
          disclaimers: [],
        },
      }),
    });
  });

  await page.route('**/api/sip/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          monthlyBudgetInr: 3000,
          riskPersona: 'OWL',
          horizonMonths: 120,
          expectedDrawdown: 16.2,
          rebalanceTriggers: ['Allocation drift > 8%'],
          allocations: [
            {
              symbol: 'NIFTYBEES.NS',
              label: 'Nippon India ETF Nifty 50',
              sector: 'ETF',
              weightPct: 50,
              expectedVolatility: 14.2,
              trustScore: 76.1,
            },
            {
              symbol: 'HDFCBANK.NS',
              label: 'HDFC Bank',
              sector: 'Financial Services',
              weightPct: 50,
              expectedVolatility: 20.1,
              trustScore: 72.9,
            },
          ],
          warnings: [],
          disclaimers: [],
        },
      }),
    });
  });

  await page.route('**/api/donate/create-link', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          provider: 'razorpay',
          keyId: 'rzp_test_123',
          amountPaise: 4900,
          currency: 'INR',
          description: 'Support Anylical Engine',
          paymentUrl: 'https://rzp.io/l/anylical-demo',
        },
      }),
    });
  });

  await page.goto('/quiz');
  await page.getByRole('button', { name: /Generate Risk Persona/i }).click();
  await expect(page.getByText(/Persona: OWL/i)).toBeVisible();

  await page.goto('/portfolio');
  await page.getByRole('button', { name: /Generate Portfolio/i }).click();
  await expect(page.getByText(/Amount: .*50,000/i)).toBeVisible();

  await page.goto('/sip');
  await page.getByRole('button', { name: /Generate SIP/i }).click();
  await expect(page.getByText(/Expected drawdown: 16.2%/i)).toBeVisible();

  await page.goto('/donate');
  await page.getByRole('button', { name: /Create Donation Link/i }).click();
  await expect(page.getByRole('link', { name: /Open Razorpay Link/i })).toBeVisible();
});

test('portfolio failure path surfaces API errors', async ({ page }) => {
  await page.route('**/api/portfolio/generate', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'text/plain',
      body: 'Portfolio service unavailable',
    });
  });

  await page.goto('/portfolio');
  await page.getByRole('button', { name: /Generate Portfolio/i }).click();
  await expect(page.getByText(/Portfolio service unavailable/i)).toBeVisible();
});
