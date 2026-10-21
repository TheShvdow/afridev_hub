import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../mail/escape-html';
import { Payment, PaymentEntityType, PlanType, Prisma } from '@prisma/client';
import type { PaymentsPaymentCapturedEvent } from '@afridev/shared-types';
import { DomainException } from '../common/errors/domain.exception';
import { verifyBictorysWebhook, BictorysWebhookHeaders } from './providers/bictorys-webhook';
import { mapBictorysStatus, isOutcomeConfirmed } from './providers/bictorys-status';
import { PAYMENT_PROVIDER, type IPaymentProvider } from './providers/payment-provider.interface';
import { PRODUCTS, PRODUCT_CODES, ProductCode } from './catalog';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

type SettledPayment = Pick<Payment, 'id' | 'userId' | 'amount' | 'currency' | 'entityType' | 'entityId' | 'metadata'>;

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
    @Inject(PAYMENT_PROVIDER) private readonly provider: IPaymentProvider,
    private readonly mail: MailService,
    private readonly events: EventEmitter2,
  ) {
    this.commissionRate = Number(this.config.get('COMMISSION_RATE', '0.12'));
  }

  // ── Catalogue ────────────────────────────────────────────────────────

  listProducts() {
    return PRODUCT_CODES.map((code) => ({
      code,
      label:        PRODUCTS[code].label,
      amount:       this.priceOf(code),
      currency:     PRODUCTS[code].currency,
      durationDays: PRODUCTS[code].durationDays,
    }));
  }

  private priceOf(code: ProductCode): number {
    const product = PRODUCTS[code];
    const configured = Number(this.config.get(product.priceEnv));
    return Number.isInteger(configured) && configured >= 100 ? configured : product.defaultPrice;
  }

  // ── Initier un paiement ──────────────────────────────────────────────

  // Le montant, la devise et la cible viennent du catalogue : un client ne peut ni fixer
  // le prix ni payer pour quelqu'un d'autre.
  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const product = PRODUCTS[dto.product];
    const amount = this.priceOf(dto.product);

    if (product.entityType === PaymentEntityType.RECRUITER_PLAN) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isRecruiter: true } });
      if (!user?.isRecruiter) {
        throw new DomainException('PAYMENTS_RECRUITER_REQUIRED', 'Activez votre profil recruteur avant de souscrire au plan premium.', 403);
      }
    }

    const input = { ...dto, userId, amount, currency: product.currency };
    const commissionAmount = Math.round(input.amount * this.commissionRate);

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        currency:    product.currency,
        provider:    this.provider.name,
        entityType:  product.entityType,
        entityId:    userId, // le plan recruteur est rattaché au membre qui paie
        status:      'PENDING',
        metadata:    { product: dto.product, paymentType: input.paymentType, country: input.country } as Prisma.InputJsonObject,
      },
    });

    await this.prisma.commission.create({
      data: { paymentId: payment.id, amount: commissionAmount, rate: this.commissionRate },
    });

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');
    const charge = await this.provider.initiate({
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
          product:     dto.product,
          paymentType: input.paymentType,
          country:     input.country,
          redirectUrl: charge.redirectUrl,
          ...(charge.link && { link: charge.link }),
        } as Prisma.InputJsonObject,
      },
    });

    return {
      paymentId:     payment.id,
      amount,
      currency:      product.currency,
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
    const confirmed = await this.provider.getStatus(transactionId);
    if (!isOutcomeConfirmed(payload.status, confirmed)) {
      this.logger.warn(`Webhook Bictorys non confirmé pour ${paymentId} : webhook=${payload.status}, Bictorys=${confirmed}`);
      return;
    }

    await this.settle(payment, outcome, payload.status, payload.id ?? transactionId);
  }

  // Règlement commun aux webhooks et à la réconciliation. Mise à jour conditionnelle :
  // un paiement déjà fermé n'est jamais retraité, donc jamais activé deux fois. Le statut
  // et l'activation du plan sont écrits ensemble : pas de paiement capturé sans plan.
  private async settle(
    payment: SettledPayment,
    outcome: 'CAPTURED' | 'FAILED',
    providerStatus: string,
    providerRef: string,
  ) {
    const now = new Date();
    const fulfilled = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data:  {
          status:   outcome,
          metadata: {
            ...((payment.metadata as Record<string, unknown>) ?? {}),
            providerStatus,
            providerRef,
            ...(outcome === 'CAPTURED' && { capturedAt: now.toISOString() }),
          } as Prisma.InputJsonObject,
        },
      });
      if (outcome !== 'CAPTURED' || result.count !== 1) return null;
      return this.fulfillPayment(tx, payment, now);
    });

    if (fulfilled) await this.afterCapture(payment, fulfilled);
  }

  // Réconciliation (job planifié) : relit les paiements restés en attente auprès de Bictorys.
  // Une fenêtre évite de doubler les webhooks récents ; au-delà de 24 h, on ne touche plus.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcilePendingPayments(now: Date = new Date()): Promise<{ checked: number; settled: number }> {
    const pending = await this.prisma.payment.findMany({
      where: {
        status:      'PENDING',
        externalRef: { not: null },
        createdAt:   { lt: new Date(now.getTime() - 5 * 60 * 1000), gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
      take:    100,
    });

    let settled = 0;
    for (const payment of pending) {
      try {
        const providerStatus = await this.provider.getStatus(payment.externalRef as string);
        const outcome = mapBictorysStatus(providerStatus);
        if (outcome === 'CAPTURED' || outcome === 'FAILED') {
          await this.settle(payment, outcome, providerStatus, payment.externalRef as string);
          settled++;
        }
      } catch (error) {
        // Une erreur sur un paiement n'empêche pas les autres : il sera repris au prochain passage.
        this.logger.warn(`Réconciliation impossible pour ${payment.id} : ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (pending.length > 0) {
      this.logger.log(`Réconciliation : ${pending.length} vérifié(s), ${settled} réglé(s)`);
    }
    return { checked: pending.length, settled };
  }

  // Produit payé : celui du catalogue (metadata.product), ou déduit du type pour les anciens paiements.
  private productOf(payment: SettledPayment): ProductCode | null {
    const code = (payment.metadata as Record<string, unknown> | null)?.['product'];
    if (typeof code === 'string' && code in PRODUCTS) return code as ProductCode;
    return payment.entityType === PaymentEntityType.RECRUITER_PLAN ? 'RECRUITER_PREMIUM_MONTHLY' : null;
  }

  private async fulfillPayment(tx: Prisma.TransactionClient, payment: SettledPayment, now: Date) {
    const product = this.productOf(payment);
    this.logger.log(`Fulfillment: ${payment.entityType}/${payment.entityId} pour userId=${payment.userId} (paiement ${payment.id})`);

    switch (payment.entityType) {
      case 'RECRUITER_PLAN': {
        const validUntil = await this.activatePremium(tx, payment.entityId, PRODUCTS.RECRUITER_PREMIUM_MONTHLY.durationDays, now);
        return { product: product ?? 'RECRUITER_PREMIUM_MONTHLY', validUntil };
      }
      case 'MENTOR_SESSION':
      case 'COURSE_ENROLLMENT':
        // Phase 2 : aucun produit de ce type n'est en vente (catalog.ts).
        this.logger.warn(`Paiement ${payment.id} pour un produit de phase 2 (${payment.entityType}) : rien à activer`);
        return null;
      default:
        this.logger.warn(`EntityType inconnu: ${payment.entityType}`);
        return null;
    }
  }

  // FR-34 : un mois de premium. Un renouvellement avant échéance s'ajoute à la période en cours.
  private async activatePremium(tx: Prisma.TransactionClient, userId: string, days: number, now: Date): Promise<Date> {
    const current = await tx.recruiterPlan.findUnique({ where: { userId } });
    const stillPremium =
      current?.planType === PlanType.PREMIUM && current.isActive && current.expiresAt && current.expiresAt > now;
    const from = stillPremium ? (current.expiresAt as Date) : now;
    const expiresAt = new Date(from.getTime() + days * DAY_MS);

    await tx.recruiterPlan.upsert({
      where:  { userId },
      create: { userId, planType: PlanType.PREMIUM, isActive: true, startedAt: now, expiresAt },
      update: { planType: PlanType.PREMIUM, isActive: true, expiresAt, ...(!stillPremium && { startedAt: now }) },
    });
    return expiresAt;
  }

  // Reçu par email et événement, après la transaction : un échec d'envoi ne défait pas le paiement.
  private async afterCapture(payment: SettledPayment, fulfilled: { product: ProductCode; validUntil: Date }) {
    const event: PaymentsPaymentCapturedEvent = {
      paymentId:  payment.id,
      userId:     payment.userId,
      product:    fulfilled.product,
      amount:     payment.amount,
      currency:   payment.currency,
      validUntil: fulfilled.validUntil.toISOString(),
    };
    this.events.emit('payments.payment.captured', event);

    try {
      const user = await this.prisma.user.findUnique({ where: { id: payment.userId }, select: { email: true } });
      if (!user) return;
      await this.mail.send(user.email, 'Votre reçu AfriDev Hub', this.receiptHtml(payment, fulfilled));
    } catch (error) {
      this.logger.error(`Reçu non envoyé (paiement ${payment.id})`, error instanceof Error ? error.stack : String(error));
    }
  }

  private receiptHtml(payment: SettledPayment, fulfilled: { product: ProductCode; validUntil: Date }) {
    const date = (value: Date) => value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const amount = `${payment.amount.toLocaleString('fr-FR')} ${payment.currency}`;
    return `<h2>Merci pour votre paiement</h2>
      <table cellpadding="6">
        <tr><td>Produit</td><td>${escapeHtml(PRODUCTS[fulfilled.product].label)}</td></tr>
        <tr><td>Montant</td><td>${escapeHtml(amount)}</td></tr>
        <tr><td>Date</td><td>${escapeHtml(date(new Date()))}</td></tr>
        <tr><td>Référence</td><td>${escapeHtml(payment.id)}</td></tr>
        <tr><td>Valable jusqu'au</td><td>${escapeHtml(date(fulfilled.validUntil))}</td></tr>
      </table>
      <p style="color:#666;font-size:12px">Conservez cet email comme justificatif de paiement.</p>`;
  }
}
