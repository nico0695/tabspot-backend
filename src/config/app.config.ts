import { registerAs } from '@nestjs/config';
import { EnvSchema, type Env } from './env.schema';

export const appConfig = registerAs('app', (): Env => EnvSchema.parse(process.env));

export type { Env } from './env.schema';
