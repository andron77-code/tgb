import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

export const registerCors = async (app: FastifyInstance) => {
  await app.register(fastifyCors, {
    origin: true,
  });
};
