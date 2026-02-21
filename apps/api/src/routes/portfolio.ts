import type { FastifyPluginAsync } from 'fastify';
import { MODEL_VERSIONS } from '@anylical/config';
import { optionalAuth } from '../plugins/auth.js';
import { PortfolioGenerateSchema } from '../schemas/http.js';
import { generatePortfolio } from '../services/intelligence-client.js';
import { logAudit, savePortfolio } from '../services/stock-service.js';
import { mandatoryDisclaimers } from '../utils/disclaimers.js';

export const portfolioRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/portfolio/generate',
    {
      schema: {
        summary: 'Generate educational portfolio plan',
        tags: ['portfolio'],
      },
    },
    async (request, reply) => {
      await optionalAuth(request);

      const parsed = PortfolioGenerateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
      }

      const plan = await generatePortfolio({
        riskPersona: parsed.data.risk_persona,
        amount: parsed.data.amount,
        horizonMonths: parsed.data.horizon_months,
      });

      if (request.authUser?.id) {
        await savePortfolio({
          userId: request.authUser.id,
          riskPersona: parsed.data.risk_persona,
          amountInr: parsed.data.amount,
          horizonMonths: parsed.data.horizon_months,
          confidence: plan.confidence,
          riskLevel: plan.riskLevel,
          volatilityEstimate: plan.volatilityEstimate,
          allocations: plan.allocations,
          warnings: plan.warnings,
          modelVersion: MODEL_VERSIONS.PORTFOLIO,
        });
      }

      await logAudit(
        'portfolio.generated',
        {
          modelVersion: MODEL_VERSIONS.PORTFOLIO,
          riskPersona: parsed.data.risk_persona,
          amount: parsed.data.amount,
          horizonMonths: parsed.data.horizon_months,
        },
        undefined,
        request.authUser?.id,
      );

      return {
        data: {
          ...plan,
          disclaimers: mandatoryDisclaimers(),
        },
      };
    },
  );
};
