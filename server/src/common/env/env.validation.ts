import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().positive().default(3333),

  DATABASE_URL: z.string().url({
    message: 'DATABASE_URL deve ser uma URL válida (postgres://...)',
  }),
});

export type Env = z.infer<typeof envSchema>;
