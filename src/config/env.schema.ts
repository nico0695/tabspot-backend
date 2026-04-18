import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_TEST: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWT_PUBLIC_KEY: z.string().min(1),
  ENABLE_DOCS: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .default(false),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    console.error(
      '[config] Invalid environment variables:\n',
      JSON.stringify(result.error.flatten(), null, 2),
    );
    throw new Error('Invalid environment variables. See errors above.');
  }
  return result.data;
}
