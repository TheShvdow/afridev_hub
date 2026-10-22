import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { DomainException } from '../../common/errors/domain.exception';
import type { ChargeRequest, ChargeResponse, IPaymentProvider } from './payment-provider.interface';

const REQUEST_TIMEOUT_MS = 30_000;
const WAF_MAX_RETRIES = 3;

// Client HTTP de l'API Bictorys — doc « Guide d'intégration » (§3, §5, §7 pour le remboursement).
// Clé publique (X-Api-Key) : charges et statut. Remboursement : voir la note dans `refund`.
@Injectable()
export class BictorysProvider implements IPaymentProvider {
  readonly name = PaymentProvider.BICTORYS;
  private readonly logger = new Logger(BictorysProvider.name);

  constructor(private readonly config: ConfigService) {}

  async initiate(request: ChargeRequest): Promise<ChargeResponse> {
    const apiKey = this.requirePublicKey();
    const query = request.paymentType === 'card'
      ? 'payment_type=card&payment_category=card'
      : `payment_type=${encodeURIComponent(request.paymentType)}`;

    const body: Record<string, unknown> = {
      amount:             request.amount,
      currency:           request.currency,
      country:            request.country,
      paymentReference:   request.paymentReference,
      successRedirectUrl: request.successRedirectUrl,
      ErrorRedirectUrl:   request.errorRedirectUrl,   // E majuscule : tel que dans la doc
    };
    if (request.customer) body['customerObject'] = request.customer;

    const response = await this.send(`/pay/v1/charges?${query}`, {
      method:  'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    return (await response.json()) as ChargeResponse;
  }

  async getStatus(transactionId: string): Promise<string> {
    const response = await this.send(`/pay/v1/transactions/${encodeURIComponent(transactionId)}/status`, {
      method:  'GET',
      headers: { 'X-Api-Key': this.requirePublicKey() },
    });
    const data = (await response.json()) as { status: string };
    return data.status;
  }

  // Doc de référence : PUT /pay/v1/transactions/{id}/refund (réponse 202).
  // Ambiguïté documentée : l'opération déclare bearerAuth, les composants déclarent X-API-Key.
  // Choix : X-API-Key avec la clé publique, à valider en sandbox.
  async refund(transactionId: string): Promise<void> {
    await this.send(`/pay/v1/transactions/${encodeURIComponent(transactionId)}/refund`, {
      method:  'PUT',
      headers: { 'X-Api-Key': this.requirePublicKey() },
    });
  }

  private requirePublicKey(): string {
    const key = this.config.get<string>('BICTORYS_API_KEY');
    if (!key) {
      throw new DomainException('PAYMENTS_PROVIDER_NOT_CONFIGURED', 'Le fournisseur de paiement n\'est pas configuré.', 503);
    }
    return key;
  }

  // Appel avec timeout et nouvelle tentative sur le 403 HTML du WAF (rate limit), backoff exponentiel.
  private async send(path: string, init: RequestInit): Promise<Response> {
    const baseUrl = this.config.get<string>('BICTORYS_API_URL', 'https://api.test.bictorys.com');

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
        if (response.ok) return response;

        const text = await response.text();
        const isWafBlock = response.status === 403 && !text.trimStart().startsWith('{');
        if (isWafBlock && attempt < WAF_MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 2 ** (attempt + 1) * 1000));
          continue;
        }

        this.logger.warn(`Bictorys ${init.method} ${path} → ${response.status}: ${text.slice(0, 300)}`);
        throw new DomainException('PAYMENTS_PROVIDER_ERROR', 'Le fournisseur de paiement a refusé la requête.', 502);
      } catch (error) {
        if (error instanceof DomainException) throw error;
        this.logger.error(`Bictorys injoignable (${init.method} ${path})`, error instanceof Error ? error.stack : String(error));
        throw new DomainException('PAYMENTS_PROVIDER_ERROR', 'Le fournisseur de paiement est injoignable.', 502);
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
