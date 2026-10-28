import type { PaymentProvider } from '@prisma/client';

// Interface d'agrégateur de paiement (AD-4, AD-8). Une implémentation en Phase 1 : Bictorys.
// PaymentsService la reçoit par le jeton PAYMENT_PROVIDER : changer d'agrégateur = changer
// la liaison dans PaymentsModule, sans toucher aux modules métier.
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface ChargeCustomer {
  name?:    string;
  phone?:   string;   // format +INDICATIF NUMERO, sans espaces
  email?:   string;
  country?: string;
}

export interface ChargeRequest {
  paymentReference:   string;   // notre Payment.id
  amount:             number;   // entier, XOF, minimum 100
  currency:           'XOF';
  country:            string;
  paymentType?:       string;   // wave_money, orange_money, card, … ; absent = checkout hébergé
  successRedirectUrl: string;
  errorRedirectUrl:   string;
  customer?:          ChargeCustomer;
}

export interface ChargeResponse {
  transactionId: string;
  redirectUrl:   string;
  link?:         string;
  qrCode?:       string;
  message?:      string;
}

export interface IPaymentProvider {
  readonly name: PaymentProvider;
  initiate(request: ChargeRequest): Promise<ChargeResponse>;
  getStatus(transactionId: string): Promise<string>;
  refund(transactionId: string): Promise<void>;
}
