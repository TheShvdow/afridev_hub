import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JobAlert, JobOffer } from '@prisma/client';
import type { JobsAlertMatchedEvent, JobsOfferPublishedEvent } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../mail/escape-html';
import { emailButton, emailNote } from '../mail/email-layout';
import { CurrencyService, RatesSnapshot } from '../currency/currency.service';
import { DomainException } from '../common/errors/domain.exception';
import { CreateJobAlertDto } from './dto/create-job-alert.dto';

const MAX_ALERTS_PER_USER = 5;
const DIGEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DIGEST_MAX_OFFERS = 10;

type AlertCriteria = Pick<JobAlert, 'country' | 'mode' | 'stack' | 'salaryMin' | 'currency'>;
type OfferFields = Pick<JobOffer, 'country' | 'mode' | 'stack' | 'salaryMax' | 'currency'>;

// FR-32 : alertes emploi. Notification in-app dès qu'une offre correspondante est
// publiée, et email récapitulatif chaque lundi (décision 2026-10-21).
@Injectable()
export class JobAlertsService {
  private readonly logger = new Logger(JobAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  list(userId: string) {
    return this.prisma.jobAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, dto: CreateJobAlertDto) {
    const count = await this.prisma.jobAlert.count({ where: { userId } });
    if (count >= MAX_ALERTS_PER_USER) {
      throw new DomainException('JOBS_ALERT_LIMIT_REACHED', `Maximum ${MAX_ALERTS_PER_USER} alertes par membre.`, 409);
    }

    return this.prisma.jobAlert.create({
      data: {
        userId,
        country:   dto.country,
        mode:      dto.mode,
        stack:     [...new Set((dto.stack ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean))],
        salaryMin: dto.salaryMin,
        currency:  dto.salaryMin !== undefined ? dto.currency : undefined,
      },
    });
  }

  async remove(userId: string, alertId: string) {
    const { count } = await this.prisma.jobAlert.deleteMany({ where: { id: alertId, userId } });
    if (count === 0) throw new DomainException('JOBS_ALERT_NOT_FOUND', 'Alerte introuvable.', 404);
  }

  // Une offre correspond si chaque critère renseigné est satisfait.
  matches(alert: AlertCriteria, offer: OfferFields, rates: RatesSnapshot): boolean {
    if (alert.country && alert.country !== offer.country) return false;
    if (alert.mode && alert.mode !== offer.mode) return false;
    if (alert.stack.length && !alert.stack.some((tech) => offer.stack.includes(tech))) return false;
    if (alert.salaryMin && alert.currency) {
      const wanted = this.currency.convert(alert.salaryMin, alert.currency, offer.currency, rates);
      // Sans taux pour comparer, on ne prévient pas plutôt que de prévenir à tort.
      if (wanted === null || offer.salaryMax < wanted) return false;
    }
    return true;
  }

  @OnEvent('jobs.offer.published')
  async onOfferPublished(event: JobsOfferPublishedEvent) {
    try {
      const offer = await this.prisma.jobOffer.findUnique({ where: { id: event.jobId } });
      if (!offer) return;

      const [alerts, rates] = await Promise.all([
        this.prisma.jobAlert.findMany({
          where: {
            isActive: true,
            userId:   { not: offer.recruiterId },
            OR:       [{ country: null }, { country: offer.country }],
            AND:      [{ OR: [{ mode: null }, { mode: offer.mode }] }],
          },
        }),
        this.currency.getRates(),
      ]);

      // Un membre avec plusieurs alertes correspondantes ne reçoit qu'une notification.
      const userIds = new Set(alerts.filter((alert) => this.matches(alert, offer, rates)).map((alert) => alert.userId));
      for (const userId of userIds) {
        const matched: JobsAlertMatchedEvent = { userId, jobId: offer.id, jobTitle: offer.title };
        this.events.emit('jobs.alert.matched', matched);
      }
    } catch (error) {
      this.logger.error(`Alertes non évaluées (offre ${event.jobId})`, error instanceof Error ? error.stack : String(error));
    }
  }

  // Chaque lundi à 8 h (UTC, heure de Dakar) : un email par membre avec les nouvelles offres.
  @Cron('0 8 * * 1', { name: 'job-alerts-weekly-digest' })
  async sendWeeklyDigest(now = new Date()): Promise<number> {
    const alerts = await this.prisma.jobAlert.findMany({
      where:   { isActive: true },
      include: { user: { select: { email: true } } },
    });
    if (!alerts.length) return 0;

    const windowStart = new Date(now.getTime() - DIGEST_WINDOW_MS);
    const [offers, rates] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where:   { status: 'ACTIVE', expiresAt: { gt: now }, publishedAt: { gte: windowStart, lte: now } },
        orderBy: { publishedAt: 'desc' },
      }),
      this.currency.getRates(),
    ]);

    const byUser = new Map<string, typeof alerts>();
    for (const alert of alerts) byUser.set(alert.userId, [...(byUser.get(alert.userId) ?? []), alert]);

    let sent = 0;
    // Un membre après l'autre, volontairement : un échec d'envoi n'empêche pas les autres
    // récapitulatifs, et le fournisseur d'emails n'est pas sollicité en rafale.
    for (const [userId, userAlerts] of byUser) {
      // Une offre n'est envoyée qu'une fois : après le dernier récapitulatif de chaque alerte.
      const matching = offers.filter((offer) =>
        offer.recruiterId !== userId &&
        userAlerts.some((alert) =>
          (!alert.lastDigestAt || (offer.publishedAt && offer.publishedAt > alert.lastDigestAt)) &&
          this.matches(alert, offer, rates)),
      );

      try {
        if (matching.length) {
          await this.mail.send(userAlerts[0].user.email, this.digestSubject(matching.length), this.digestHtml(matching));
          sent += 1;
        }
        await this.prisma.jobAlert.updateMany({ where: { userId, isActive: true }, data: { lastDigestAt: now } });
      } catch (error) {
        this.logger.error(`Récapitulatif d'alertes non envoyé (user ${userId})`, error instanceof Error ? error.stack : String(error));
      }
    }
    this.logger.log(`Récapitulatif hebdomadaire des alertes : ${sent} email(s)`);
    return sent;
  }

  private digestSubject(count: number) {
    return count === 1 ? '1 nouvelle offre correspond à vos alertes' : `${count} nouvelles offres correspondent à vos alertes`;
  }

  private digestHtml(offers: JobOffer[]) {
    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:4200';
    const items = offers.slice(0, DIGEST_MAX_OFFERS).map((offer) => {
      const salary = `${offer.salaryMin.toLocaleString('fr-FR')} – ${offer.salaryMax.toLocaleString('fr-FR')} ${offer.currency}`;
      const url = `${webUrl}/jobs/${offer.id}`;
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #E5E7EB">
        <a href="${escapeHtml(url)}" style="font-weight:600;color:#0F9D58;text-decoration:none">${escapeHtml(offer.title)}</a><br>
        <span style="font-size:13px;color:#6B7280">${escapeHtml(offer.company)} · ${escapeHtml(offer.country)} · ${escapeHtml(salary)}</span>
      </td></tr>`;
    });
    const listUrl = `${webUrl}/jobs`;
    const more = offers.length > DIGEST_MAX_OFFERS
      ? emailButton(listUrl, `Voir les ${offers.length - DIGEST_MAX_OFFERS} autres offres`)
      : '';
    return `<h1 style="margin:0 0 16px;font-size:20px">Vos offres de la semaine</h1>
      <p>Voici les offres publiées cette semaine qui correspondent à vos alertes :</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.join('')}</table>${more}
      ${emailNote('Gérez vos alertes depuis la page Offres d\'emploi d\'AfriDev Hub.')}`;
  }
}
