import { z } from 'zod';

export const SearchStocksQuerySchema = z.object({
  q: z.string().trim().default(''),
  sector: z.string().trim().optional(),
  exchange: z.enum(['NSE', 'BSE', 'NYSE']).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

export const SymbolParamsSchema = z.object({
  symbol: z.string().trim().min(2).max(20),
});

export const QuizSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        section: z.enum(['emotional', 'financial', 'behavioral']),
        value: z.coerce.number().min(0).max(100),
      }),
    )
    .min(6),
});

export const PortfolioGenerateSchema = z.object({
  risk_persona: z.enum(['TURTLE', 'OWL', 'TIGER', 'FALCON']),
  amount: z.coerce.number().min(1000).max(10000000),
  horizon_months: z.coerce.number().int().min(6).max(480),
});

export const SipGenerateSchema = z.object({
  monthly_budget: z.coerce.number().min(500).max(500000),
  risk_persona: z.enum(['TURTLE', 'OWL', 'TIGER', 'FALCON']),
  horizon_months: z.coerce.number().int().min(6).max(480),
});

export const WatchlistMutationSchema = z.object({
  symbol: z.string().trim().min(2).max(20),
});

export const DonationCreateSchema = z.object({
  amount_inr: z.coerce.number().positive().max(100000),
  tier: z.enum(['SUPPORTER', 'INSIDER', 'BACKER', 'FOUNDING_MEMBER']),
});

export const DonationWebhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.any()),
});
