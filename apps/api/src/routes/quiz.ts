import type { FastifyPluginAsync } from 'fastify';
import { MODEL_VERSIONS } from '@anylical/config';
import { optionalAuth } from '../plugins/auth.js';
import { QuizSubmitSchema } from '../schemas/http.js';
import { generateRiskProfile } from '../services/intelligence-client.js';
import { logAudit, saveQuizResult } from '../services/stock-service.js';
import { mandatoryDisclaimers } from '../utils/disclaimers.js';

export const quizRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/quiz/submit',
    {
      schema: {
        summary: 'Submit risk quiz and get persona',
        tags: ['quiz'],
      },
    },
    async (request, reply) => {
      await optionalAuth(request);

      const parsed = QuizSubmitSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
      }

      const profile = await generateRiskProfile(parsed.data.answers);

      if (request.authUser?.id) {
        await saveQuizResult({
          userId: request.authUser.id,
          rawResponses: parsed.data.answers,
          riskScore: profile.riskScore,
          persona: profile.persona,
          riskLevel: profile.riskLevel,
          modelVersion: profile.modelVersion,
        });
      }

      await logAudit(
        'quiz.submitted',
        {
          modelVersion: MODEL_VERSIONS.QUIZ,
          riskScore: profile.riskScore,
          persona: profile.persona,
        },
        undefined,
        request.authUser?.id,
      );

      return {
        data: {
          ...profile,
          disclaimers: mandatoryDisclaimers(),
        },
      };
    },
  );
};
