import type { FastifyPluginAsync } from 'fastify';
import { MODEL_VERSIONS } from '@anylical/config';
import { optionalAuth } from '../plugins/auth.js';
import { SipGenerateSchema } from '../schemas/http.js';
import { generateSipPlan } from '../services/intelligence-client.js';
import { logAudit, saveSip } from '../services/stock-service.js';
import { mandatoryDisclaimers } from '../utils/disclaimers.js';

export const sipRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/sip/generate',
    {
      schema: {
        summary: 'Generate SIP suggestion',
        tags: ['sip'],
      },
    },
    async (request, reply) => {
      await optionalAuth(request);

      const parsed = SipGenerateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
      }

      const plan = await generateSipPlan({
        monthlyBudget: parsed.data.monthly_budget,
        riskPersona: parsed.data.risk_persona,
        horizonMonths: parsed.data.horizon_months,
      });

      if (request.authUser?.id) {
        await saveSip({
          userId: request.authUser.id,
          monthlyBudgetInr: parsed.data.monthly_budget,
          riskPersona: parsed.data.risk_persona,
          horizonMonths: parsed.data.horizon_months,
          expectedDrawdown: plan.expectedDrawdown,
          rebalanceTriggers: plan.rebalanceTriggers,
          allocations: plan.allocations,
          warnings: plan.warnings,
          modelVersion: MODEL_VERSIONS.SIP,
        });
      }

      await logAudit(
        'sip.generated',
        {
          modelVersion: MODEL_VERSIONS.SIP,
          riskPersona: parsed.data.risk_persona,
          monthlyBudget: parsed.data.monthly_budget,
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
