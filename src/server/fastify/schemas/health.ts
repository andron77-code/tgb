export const healthSchema = {
  tags: ['Health'],
  summary: 'Health check',
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
      },
    },
  },
} as const;
