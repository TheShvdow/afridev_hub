import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentEntityType, PaymentProvider, Prisma } from '@prisma/client';
import { DomainException } from '../common/errors/domain.exception';
import { BictorysProvider } from './providers/bictorys.provider';
import { verifyBictorysWebhook, BictorysWebhookHeaders } from './providers/bictorys-webhook';
import { mapBictorysStatus, isOutcomeConfirmed } from './providers/bictorys-status';
import type { ChargeCustomer } from './providers/payment-provider.interface';

interface InitiatePaymentInput {
  userId:      string;
  amount:      number;              // entier, XOF (unités de base)
  currency:    string;
  paymentType: string;              // wave_money, orange_money, card, …
  country:     string;              // SN, CI, BK, ML, TG, BJ
  entityType:  PaymentEntityType;
  entityId:    string;
  customer?:   ChargeCustomer;
}

interface BictorysWebhookPayload {
  id?:                string;
  status?:            string;
  paymentReference?:  string;
  amount?:            number;
  currency?:          string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly commissionRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bictorys: BictorysProvider,
  ) {
    this.commissionRate = Number(this.config.get('COMMISSION_RATE', '0.12'));
  }

  // ── Initier un paiement ──────────────────────────────────────────────

  async initiatePayment(input: InitiatePaymentInput) {
    const commissionAmount = Math.round(input.amount * this.commissionRate);

    const payment = await this.prisma.payment.create({
      data: {
        userId:      input.userId,
        amount:      input.amount,
        currency:    input.currency,
        provider:    PaymentProvider.BICTORYS,
        entityType:  input.entityType,
        entityId:    input.entityId,
        status:      'PENDING',
        metadata:    { paymentType: input.paymentType, country: input.country } as Prisma.InputJsonObject,
      },
    });

    await this.prisma.commission.create({
      data: { paymentId: payment.id, amount: commissionAmount, rate: this.commissionRate },
    });

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');
    const charge = await this.bictorys.initiate({
      paymentReference:   payment.id,
      amount:             input.amount,
      currency:           'XOF',
      country:            input.country,
      paymentType:        input.paymentType,
      successRedirectUrl: `${webUrl}/payment/result?ref=${payment.id}&status=success`,
      errorRedirectUrl:   `${webUrl}/payment/result?ref=${payment.id}&status=error`,
      customer:           input.customer,
    }).catch(async (error: unknown) => {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw error;
    });

    // La référence Bictorys (transactionId) sert de lien pour les webhooks et le statut.
    await this.prisma.payment.update({
      where: { id: payment.id },
      data:  {
        externalRef: charge.transactionId,
        metadata: {
          paymentType: input.paymentType,
          country:     input.country,
          redirectUrl: charge.redirectUrl,
          ...(charge.link && { link: charge.link }),
        } as Prisma.InputJsonObject,
      },
    });

    return {
      paymentId:     payment.id,
      transactionId: charge.transactionId,
      redirectUrl:   charge.redirectUrl,
      link:          charge.link ?? null,
      qrCode:        charge.qrCode ?? null,
      message:       charge.message ?? null,
    };
  }

  // ── Webhook Bictorys ─────────────────────────────────────────────────

  // Vérifie la signature avant toute lecture du payload. Le corps brut est requis.
  async handleBictorysWebhook(rawBody: string, headers: BictorysWebhookHeaders) {
    const secret = this.config.get<string>('BICTORYS_WEBHOOK_SECRET', '');
    if (!verifyBictorysWebhook(rawBody, headers, secret)) {
      this.logger.warn('Webhook Bictorys rejeté : signature invalide');
      throw new DomainException('PAYMENTS_WEBHOOK_INVALID_SIGNATURE', 'Signature du webhook invalide.', 401);
    }

    let payload: BictorysWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as BictorysWebhookPayload;
    } catch {
      this.logger.warn('Webhook Bictorys ignoré : JSON invalide');
      return { received: true };
    }

    // Journal sans données personnelles : seulement les clés et le statut, pour valider le format en sandbox.
    this.logger.log(`Webhook Bictorys reçu : clés=${Object.keys(payload).join(',')} statut=${payload.status ?? 'absent'}`);

    await this.applyWebhook(payload);
    return { received: true };
  }

  // ── Statut ───────────────────────────────────────────────────────────

  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== userId) {
      throw new DomainException('PAYMENTS_PAYMENT_NOT_FOUND', 'Paiement introuvable.', 404);
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

  private async applyWebhook(payload: BictorysWebhookPayload) {
    const paymentId = payload.paymentReference;
    if (!paymentId || !payload.status) {
      this.logger.warn('Webhook Bictorys sans référence ou statut');
      return;
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      this.logger.warn(`Webhook Bictorys : paiement ${paymentId} introuvable`);
      return;
    }

    // Contrôle anti-fraude de la doc : le montant et la devise doivent correspondre.
    if (payload.amount !== payment.amount || payload.currency !== payment.currency) {
      this.logger.error(`Webhook Bictorys incohérent pour ${paymentId} (montant ou devise)`);
      return;
    }

    const outcome = mapBictorysStatus(payload.status);
    if (outcome === 'IGNORED') {
      this.logger.warn(`Statut Bictorys non géré : ${payload.status}`);
      return;
    }
    if (outcome === 'PENDING') return;

    // Confirmation côté Bictorys : un webhook seul ne change jamais l'état d'un paiement.
    // Une erreur de l'appel remonte (502) pour que Bictorys renvoie le webhook.
    const transactionId = payment.externalRef ?? payload.id;
    if (!transactionId) {
      this.logger.warn(`Webhook Bictorys pour ${paymentId} sans identifiant de transaction : ignoré`);
      return;
    }
    const confirmed = await this.bictorys.getStatus(transactionId);
    if (!isOutcomeConfirmed(payload.status, confirmed)) {
      this.logger.warn(`Webhook Bictorys non confirmé pour ${paymentId} : webhook=${payload.status}, Bictorys=${confirmed}`);
      return;
    }

    // Mise à jour conditionnelle : un webhook rejoué ne retraite jamais un paiement déjà fermé.
    const result = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: { in: ['PENDING'] } },
      data:  {
        status:   outcome === 'CAPTURED' ? 'CAPTURED' : 'FAILED',
        metadata: {
          ...((payment.metadata as Record<string, unknown>) ?? {}),
          providerStatus: payload.status,
          providerRef:    payload.id ?? null,
          ...(outcome === 'CAPTURED' && { capturedAt: new Date().toISOString() }),
        } as Prisma.InputJsonObject,
      },
    });

    if (outcome === 'CAPTURED' && result.count === 1) {
      await this.fulfillPayment(payment.id, payment.userId, payment.entityType, payment.entityId);
    }
  }

  private async fulfillPayment(
    paymentId: string,
    userId: string,
    entityType: PaymentEntityType,
    entityId: string,
  ) {
    this.logger.log(`Fulfillment: ${entityType}/${entityId} pour userId=${userId} (paiement ${paymentId})`);

    switch (entityType) {
      case 'RECRUITER_PLAN':
        // TODO: Activer le plan premium recruteur
        break;
      case 'MENTOR_SESSION':
        // TODO: Confirmer la session mentoring (Phase 2)
        break;
      case 'COURSE_ENROLLMENT':
        // TODO: Inscrire l'utilisateur au cours (Phase 2)
        break;
      default:
        this.logger.warn(`EntityType inconnu: ${entityType}`);
    }
  }
}
