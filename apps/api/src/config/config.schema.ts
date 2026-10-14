import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // ── Required ──────────────────────────────────────────────────────────────
  DATABASE_URL:        Joi.string().required(),
  REDIS_URL:          Joi.string().required(),
  JWT_SECRET:         Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  WEB_URL:            Joi.string().required(),

  // ── With defaults ─────────────────────────────────────────────────────────
  PORT:     Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // ── Optional ──────────────────────────────────────────────────────────────
  RESEND_API_KEY:                Joi.string().optional().allow(''),
  WAVE_API_KEY:                  Joi.string().optional().allow(''),
  STRIPE_SECRET_KEY:             Joi.string().optional().allow(''),
  CLOUDFLARE_R2_ACCESS_KEY_ID:   Joi.string().optional().allow(''),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  CLOUDFLARE_R2_BUCKET_NAME:     Joi.string().optional().allow(''),
  CLOUDFLARE_R2_PUBLIC_URL:      Joi.string().optional().allow(''),
  CLOUDFLARE_ACCOUNT_ID:         Joi.string().optional().allow(''),
});
