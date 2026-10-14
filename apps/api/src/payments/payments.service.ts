import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'STRIPE';

interface InitiatePaymentInput {
  userId:      string;
  amount:      number;       // en centimes (XOF)
  currency:    string;
  provider:    PaymentProvider;
  purpose:     string;       // ex: 'JOB_PREMIUM_30D'
  metadata?:   Record<string, string>;
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
    const reference = `AFRIDEV-${uuidv4().slice(0, 8).toUpperCase()}`;
    const commission = Math.round(input.amount * this.commissionRate);

    const payment = await this.prisma.payment.create({
      data: {
        userId:       input.userId,
        amount:       input.amount,
        currency:     input.currency,
        provider:     input.provider,
        purpose:      input.purpose,
        reference,
        commission,
        status:       'PENDING',
        metadata:     input.metadata ?? {},
      },
    });

    const checkoutUrl = await this.buildCheckoutUrl(payment.id, input);

    return { paymentId: payment.id, reference, checkoutUrl };
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
    // Extraire la référence selon le provider
    const reference = this.extractReference(provider, payload);
    if (!reference) {
      this.logger.warn(`Impossible d'extraire la référence du webhook ${provider}`);
      return;
    }

    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      this.logger.warn(`Paiement introuvable pour la référence ${reference}`);
      return;
    }

    const success = this.isSuccessPayload(provider, payload);
    const newStatus = success ? 'COMPLETED' : 'FAILED';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status:       newStatus,
        paidAt:       success ? new Date() : undefined,
        providerRef:  String(payload['transactionId'] ?? payload['id'] ?? ''),
        webhookData:  payload,
      },
    });

    if (success) {
      await this.fulfillPayment(payment.id, payment.userId, payment.purpose);
    }
  }

  private async fulfillPayment(paymentId: string, userId: string, purpose: string) {
    this.logger.log(`Fulfillment: ${purpose} pour userId=${userId}`);

    switch (purpose) {
      case 'JOB_PREMIUM_30D':
        // TODO: Activer le plan premium recruteur 30 jours
        break;
      case 'JOB_PREMIUM_90D':
        // TODO: Activer le plan premium recruteur 90 jours
        break;
      default:
        this.logger.warn(`Purpose inconnu: ${purpose}`);
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
      case 'STRIPE':       return (payload['metadata'] as Record<string, string>)?.['reference'] ?? null;
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
