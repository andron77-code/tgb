import { FastifyInstance } from 'fastify';
import fastifyEnv from '@fastify/env';

import { envSchema } from '../config/env';

export const registerEnv = async (app: FastifyInstance) => {
  await app.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
  });
};
