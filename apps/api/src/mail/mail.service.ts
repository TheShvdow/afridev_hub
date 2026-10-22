import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { emailLayout } from './email-layout';

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly fromAddress: string;

  constructor(
    @InjectPinoLogger(MailService.name)
    private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {
    // || et non ?? : une variable définie mais vide sur l'hébergeur donnerait un expéditeur vide.
    this.fromAddress =
      this.config.get<string>('MAIL_FROM_ADDRESS') || 'noreply@afridevhub.com';
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (process.env['NODE_ENV'] !== 'production') {
      this.logger.info({ to, subject }, 'Mail (sandbox): skipped send');
      return;
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY manquante : aucun email ne peut partir.');
    const payload: ResendEmailPayload = {
      from: this.fromAddress,
      to: [to],
      subject,
      html: emailLayout(html, subject),
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Le corps de Resend dit pourquoi l'envoi est refusé (domaine non vérifié, expéditeur invalide…).
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Resend API error: ${response.status} ${response.statusText} (from ${this.fromAddress}) ${detail}`,
      );
    }
  }
}
