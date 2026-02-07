import { FastifyInstance } from 'fastify';

import { registerHealthRoute } from './health';

export const registerRoutes = async (app: FastifyInstance) => {
  await registerHealthRoute(app);
};
