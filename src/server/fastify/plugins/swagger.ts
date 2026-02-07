import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { appConfig } from '../config/app';

export const registerSwagger = async (app: FastifyInstance) => {
  await app.register(fastifySwagger, {
    swagger: {
      info: {
        title: 't-system API',
        description: 'API documentation',
        version: '1.0.0',
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: appConfig.swagger.routePrefix,
  });
};
