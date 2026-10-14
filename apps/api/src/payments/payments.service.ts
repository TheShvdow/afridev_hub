import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentEntityType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'STRIPE';

interface InitiatePaymentInput {
  userId:      string;
  amount:      number;              // en centimes (XOF)
  currency:    string;
  provider:    PaymentProvider;
  entityType:  PaymentEntityType;   // required — replaces `purpose`
  entityId:    string;              // required — ID de l'entité liée au paiement
  metadata?:   Record<string, unknown>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly commissionRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.commissionRate = Number(this.config.get('COMMISSION_RATE', '0.12'));
  }

  // ── Initier un paiement ──────────────────────────────────────────────

  async initiatePayment(input: InitiatePaymentInput) {
    const externalRef = `AFRIDEV-${uuidv4().slice(0, 8).toUpperCase()}`; // externalRef not reference
    const commissionAmount = Math.round(input.amount * this.commissionRate);

    // Payment has entityType + entityId (required); no `purpose`, no `reference`, no `commission` field
    const payment = await this.prisma.payment.create({
      data: {
        userId:      input.userId,
        amount:      input.amount,
        currency:    input.currency,
        provider:    input.provider,
        entityType:  input.entityType,
        entityId:    input.entityId,
        externalRef,
        status:      'PENDING',
        metadata:    input.metadata ?? {},
      },
    });

    // Commission is a separate model — not a field on Payment
    await this.prisma.commission.create({
      data: {
        paymentId: payment.id,
        amount:    commissionAmount,
        rate:      this.commissionRate,
      },
    });

    const checkoutUrl = this.buildCheckoutUrl(payment.id, input);

    return { paymentId: payment.id, externalRef, checkoutUrl };
  }

  // ── Webhook handlers ─────────────────────────────────────────────────

  async handleWaveWebhook(payload: Record<string, unknown>, signature: string) {
    // TODO: Vérifier la signature HMAC Wave
    this.logger.log('Wave webhook reçu', payload);
    return this.processWebhook('WAVE', payload);
  }

  async handleOrangeWebhook(payload: Record<string, unknown>) {
    this.logger.log('Orange Money webhook reçu', payload);
    return this.processWebhook('ORANGE_MONEY', payload);
  }

  async handleMtnWebhook(payload: Record<string, unknown>) {
    this.logger.log('MTN MoMo webhook reçu', payload);
    return this.processWebhook('MTN_MOMO', payload);
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    // TODO: Vérifier avec stripe.webhooks.constructEvent
    this.logger.log('Stripe webhook reçu');
    return this.processWebhook('STRIPE', {});
  }

  // ── Statut paiement ──────────────────────────────────────────────────

  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Paiement introuvable.');
    }

    return payment;
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });
  }

  // ── Privé ────────────────────────────────────────────────────────────

  private async processWebhook(provider: PaymentProvider, payload: Record<string, unknown>) {
    const reference = this.extractReference(provider, payload);
    if (!reference) {
      this.logger.warn(`Impossible d'extraire la référence du webhook ${provider}`);
      return;
    }

    // externalRef is not @unique — use findFirst, not findUnique
    const payment = await this.prisma.payment.findFirst({ where: { externalRef: reference } });
    if (!payment) {
      this.logger.warn(`Paiement introuvable pour la référence ${reference}`);
      return;
    }

    const success    = this.isSuccessPayload(provider, payload);
    const newStatus  = success ? 'CAPTURED' : 'FAILED'; // CAPTURED not COMPLETED — COMPLETED doesn't exist

    // Payment has no paidAt/providerRef/webhookData — store extras in metadata (Json field)
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status:   newStatus,
        metadata: {
          ...((payment.metadata as Record<string, unknown>) ?? {}),
          capturedAt:   success ? new Date().toISOString() : undefined,
          providerRef:  String(payload['transactionId'] ?? payload['id'] ?? ''),
          webhookData:  payload,
        },
      },
    });

    if (success) {
      // Create commission record after successful capture
      await this.prisma.commission.create({
        data: {
          paymentId: payment.id,
          amount:    Math.round(payment.amount * this.commissionRate),
          rate:      this.commissionRate,
        },
      }).catch(() => null); // idempotence — may already exist from initiatePayment

      await this.fulfillPayment(payment.id, payment.userId, payment.entityType, payment.entityId);
    }
  }

  private async fulfillPayment(
    paymentId: string,
    userId: string,
    entityType: PaymentEntityType,  // was `purpose: string`
    entityId: string,
  ) {
    this.logger.log(`Fulfillment: ${entityType}/${entityId} pour userId=${userId}`);

    switch (entityType) {
      case 'RECRUITER_PLAN':
        // TODO: Activer le plan premium recruteur
        break;
      case 'MENTOR_SESSION':
        // TODO: Confirmer la session mentoring
        break;
      case 'COURSE_ENROLLMENT':
        // TODO: Inscrire l'utilisateur au cours
        break;
      default:
        this.logger.warn(`EntityType inconnu: ${entityType}`);
    }
  }

  private buildCheckoutUrl(paymentId: string, input: InitiatePaymentInput): string {
    const webUrl = this.config.get('WEB_URL', 'http://localhost:4200');
    const apiUrl = this.config.get('API_URL', 'http://localhost:3000');

    switch (input.provider) {
      case 'WAVE':
        return `${this.config.get('WAVE_CHECKOUT_URL', 'https://pay.wave.com/m/checkout')}?amount=${input.amount}&currency=${input.currency}&client_reference=${paymentId}`;
      case 'STRIPE':
        return `${apiUrl}/api/payments/stripe/session/${paymentId}`;
      default:
        return `${webUrl}/payment/checkout/${paymentId}`;
    }
  }

  private extractReference(provider: PaymentProvider, payload: Record<string, unknown>): string | null {
    switch (provider) {
      case 'WAVE':         return payload['client_reference'] as string ?? null;
      case 'ORANGE_MONEY': return payload['externalId']      as string ?? null;
      case 'MTN_MOMO':     return payload['externalId']      as string ?? null;
      case 'STRIPE':       return (payload['metadata'] as Record<string, string>)?.['externalRef'] ?? null;
      default:             return null;
    }
  }

  private isSuccessPayload(provider: PaymentProvider, payload: Record<string, unknown>): boolean {
    switch (provider) {
      case 'WAVE':         return payload['status'] === 'succeeded';
      case 'ORANGE_MONEY': return payload['status'] === 'SUCCESS';
      case 'MTN_MOMO':     return payload['status'] === 'SUCCESSFUL';
      case 'STRIPE':       return (payload['type'] as string)?.startsWith('payment_intent.succeeded') ?? false;
      default:             return false;
    }
  }
}
