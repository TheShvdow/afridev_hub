import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../mail/escape-html';
import { emailButton } from '../mail/email-layout';
import { CurrencyService } from '../currency/currency.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS_BEFORE_EXPIRY = 10; // rappel à J50 d'une offre de 60 jours (FR-33)

// Tâches planifiées du job board : expiration, rappel J50 et salaires convertis en USD.
@Injectable()
export class JobsScheduler {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly currency: CurrencyService,
  ) {}

  // FR-33 : une offre arrivée à échéance passe en EXPIRED. La liste filtre déjà sur la date,
  // ce passage rend le statut exact pour le recruteur et l'admin.
  @Cron(CronExpression.EVERY_HOUR, { name: 'jobs-expire' })
  async expireOffers(now = new Date()): Promise<number> {
    const { count } = await this.prisma.jobOffer.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data:  { status: 'EXPIRED' },
    });
    if (count) this.logger.log(`${count} offre(s) expirée(s)`);
    return count;
  }

  @Cron('0 9 * * *', { name: 'jobs-expiry-reminder' })
  async sendExpiryReminders(now = new Date()): Promise<number> {
    const offers = await this.prisma.jobOffer.findMany({
      where: {
        status:               'ACTIVE',
        expiryReminderSentAt: null,
        expiresAt:            { gt: now, lte: new Date(now.getTime() + REMINDER_DAYS_BEFORE_EXPIRY * DAY_MS) },
      },
      include: { recruiter: { select: { email: true } } },
    });

    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:4200';
    let sent = 0;
    // Envois un par un, volontairement : chaque échec reste isolé et le fournisseur
    // d'emails n'est pas sollicité en rafale.
    for (const offer of offers) {
      try {
        const date = offer.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const url = `${webUrl}/jobs/${offer.id}`;
        await this.mail.send(
          offer.recruiter.email,
          `Votre offre « ${offer.title} » expire bientôt`,
          `<h1 style="margin:0 0 16px;font-size:20px">Votre offre expire bientôt</h1>
           <p>Votre offre <strong>${escapeHtml(offer.title)}</strong> expirera le ${escapeHtml(date)}.</p>
           <p>Renouvelez-la pour 60 jours supplémentaires depuis votre tableau de bord.</p>
           ${emailButton(url, 'Voir l\'offre')}`,
        );
        await this.prisma.jobOffer.update({ where: { id: offer.id }, data: { expiryReminderSentAt: now } });
        sent += 1;
      } catch (error) {
        this.logger.error(`Rappel d'expiration non envoyé (offre ${offer.id})`, error instanceof Error ? error.stack : String(error));
      }
    }
    return sent;
  }

  // Les montants en USD servent au filtre salaire entre devises : on les recalcule aux nouveaux taux.
  @OnEvent('currency.rates.updated')
  async refreshSalaryUsd(): Promise<number> {
    const [offers, rates] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where:  { status: { in: ['ACTIVE', 'PENDING_REVIEW'] } },
        select: { id: true, salaryMin: true, salaryMax: true, currency: true },
      }),
      this.currency.getRates(),
    ]);

    await this.prisma.$transaction(offers.map((offer) =>
      this.prisma.jobOffer.update({
        where: { id: offer.id },
        data:  {
          salaryMinUsd: this.currency.toUsd(offer.salaryMin, offer.currency, rates),
          salaryMaxUsd: this.currency.toUsd(offer.salaryMax, offer.currency, rates),
        },
      }),
    ));
    return offers.length;
  }
}
