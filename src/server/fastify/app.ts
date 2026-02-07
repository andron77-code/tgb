import fastify, { FastifyInstance } from 'fastify';

import { appConfig } from './config/app';
import { registerCors } from './plugins/cors';
import { registerEnv } from './plugins/env';
import { registerSwagger } from './plugins/swagger';
import { registerRoutes } from './routes';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = fastify({
    logger: appConfig.logger,
  });

  await registerEnv(app);
  await registerCors(app);
  await registerSwagger(app);
  await registerRoutes(app);

  return app;
};
