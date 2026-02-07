import { FastifyInstance } from 'fastify';

import { healthSchema } from '../schemas/health';

export const registerHealthRoute = async (app: FastifyInstance) => {
  app.get(
    '/health',
    {
      schema: healthSchema,
    },
    async () => ({ status: 'ok fasify' }),
  );
};
