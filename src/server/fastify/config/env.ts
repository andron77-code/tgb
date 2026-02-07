import { FromSchema } from 'json-schema-to-ts';

export const envSchema = {
  type: 'object',
  required: ['NODE_ENV', 'SERVER_HOST', 'SERVER_PORT'],
  properties: {
    NODE_ENV: { type: 'string', default: 'development' },
    SERVER_HOST: { type: 'string', default: '0.0.0.0' },
    SERVER_PORT: { type: 'number', default: 3000 },
  },
} as const;

export type EnvConfig = FromSchema<typeof envSchema>;
