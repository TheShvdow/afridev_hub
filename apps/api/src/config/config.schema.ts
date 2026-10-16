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
  // Expose /api/docs en production (toujours actif hors production)
  SWAGGER_ENABLED:               Joi.string().valid('true', 'false').optional(),
  RESEND_API_KEY:               Joi.string().optional().allow(''),
  CLOUDFLARE_R2_ACCESS_KEY_ID:   Joi.string().optional().allow(''),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  CLOUDFLARE_R2_BUCKET_NAME:     Joi.string().optional().allow(''),
  CLOUDFLARE_R2_PUBLIC_URL:      Joi.string().optional().allow(''),
  CLOUDFLARE_ACCOUNT_ID:         Joi.string().optional().allow(''),

  // ── OAuth Google (optionnel : route 503 si absent) ─────────────────────
  GOOGLE_CLIENT_ID:               Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET:           Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL:            Joi.string().optional().allow(''),

  // ── Paiements — agrégateur Bictorys (optionnel au démarrage : 503 si absent à l'usage) ──
  BICTORYS_API_URL:               Joi.string().optional().allow(''),
  BICTORYS_API_KEY:               Joi.string().optional().allow(''),
  BICTORYS_PRIVATE_KEY:           Joi.string().optional().allow(''),
  BICTORYS_WEBHOOK_SECRET:        Joi.string().optional().allow(''),
  BICTORYS_MERCHANT_SECRET_CODE:  Joi.string().optional().allow(''),
});
