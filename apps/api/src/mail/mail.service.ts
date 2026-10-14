import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

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
    this.fromAddress =
      this.config.get<string>('MAIL_FROM_ADDRESS') ?? 'noreply@afridevhub.com';
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (process.env['NODE_ENV'] !== 'production') {
      this.logger.info({ to, subject }, 'Mail (sandbox): skipped send');
      return;
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const payload: ResendEmailPayload = {
      from: this.fromAddress,
      to: [to],
      subject,
      html,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey ?? ''}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Resend API error: ${response.status} ${response.statusText}`,
      );
    }
  }
}
