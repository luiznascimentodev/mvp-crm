import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .describe('Secret key for signing JWT tokens'),

  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must be in format: 60s, 15m, 1h, 7d')
    .default('1h')
    .describe('JWT token expiration time'),

  // Storage (MinIO / S3)
  STORAGE_ENDPOINT: z.string().url().describe('S3/MinIO endpoint URL'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1).default('orbit-crm'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // SMTP (Nodemailer)
  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@orbit-crm.app'),

  // Frontend (para links em emails)
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

export type EnvConfig = z.infer<typeof envSchema>;
