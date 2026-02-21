import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyRawBody from 'fastify-raw-body';
import { env } from './config/env.js';
import { adminRoutes } from './routes/admin.js';
import { donateRoutes } from './routes/donate.js';
import { healthRoutes } from './routes/health.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { quizRoutes } from './routes/quiz.js';
import { sipRoutes } from './routes/sip.js';
import { stockRoutes } from './routes/stocks.js';
import { userRoutes } from './routes/user.js';
import { captureException, trackMetric } from './services/telemetry.js';

const SLOW_REQUEST_MS = 1_200;

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    captureException(error, {
      path: request.url,
      method: request.method,
      requestId: request.id,
    });
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error. Please retry shortly.',
    });
  });

  app.addHook('onRequest', async (request) => {
    request.requestStartMs = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const start = request.requestStartMs ?? Date.now();
    const durationMs = Date.now() - start;

    reply.header('x-response-time-ms', String(durationMs));

    if (durationMs > SLOW_REQUEST_MS) {
      app.log.warn(
        {
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          durationMs,
        },
        'slow_request_detected',
      );
    }

    if (request.url.startsWith('/api/') && request.url !== '/api/health') {
      trackMetric('api.request', {
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        durationMs,
        requestId: request.id,
        level: durationMs > SLOW_REQUEST_MS ? 'warn' : 'info',
      });
    }
  });

  app.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
  });

  app.register(cors, {
    origin: [env.APP_BASE_URL],
    credentials: true,
  });

  app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.register(rateLimit, {
    max: 150,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      const auth = request.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        const suffix = auth.slice(-16);
        return `auth:${suffix}`;
      }
      return request.headers['x-forwarded-for']?.toString() ?? request.ip;
    },
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Anylical Engine API',
        version: '0.1.0',
        description: 'India-first Gen-Z stock intelligence gateway API',
      },
    },
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  app.register(healthRoutes);
  app.register(adminRoutes);
  app.register(stockRoutes);
  app.register(quizRoutes);
  app.register(portfolioRoutes);
  app.register(sipRoutes);
  app.register(donateRoutes);
  app.register(userRoutes);

  return app;
}
