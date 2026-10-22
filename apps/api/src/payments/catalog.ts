import { PaymentEntityType } from '@prisma/client';

// Catalogue côté serveur : le client choisit un produit, jamais un montant ni une cible.
// FR-34 : plan recruteur premium à 25 000 FCFA par mois (prix réglable par la configuration).
export const PRODUCTS = {
  RECRUITER_PREMIUM_MONTHLY: {
    label:        'Plan recruteur premium — 1 mois',
    entityType:   PaymentEntityType.RECRUITER_PLAN,
    currency:     'XOF',
    priceEnv:     'RECRUITER_PREMIUM_PRICE_XOF',
    defaultPrice: 25_000,
    durationDays: 30,
  },
} as const;

export type ProductCode = keyof typeof PRODUCTS;
export const PRODUCT_CODES = Object.keys(PRODUCTS) as ProductCode[];
