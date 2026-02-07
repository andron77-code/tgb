import { EnvConfig } from './env';

export const appConfig = {
  server: {
    host: (process.env.SERVER_HOST || '0.0.0.0') as EnvConfig['SERVER_HOST'],
    port: Number(process.env.SERVER_PORT || 3000) as EnvConfig['SERVER_PORT'],
  },
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
  swagger: {
    routePrefix: '/docs',
    exposeRoute: true,
  },
} as const;
