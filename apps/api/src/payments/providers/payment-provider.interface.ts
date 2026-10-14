// Interface d'agrégateur de paiement (AD-4). Une implémentation en Phase 1 : Bictorys.

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
  paymentType:        string;   // wave_money, orange_money, card, …
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
  initiate(request: ChargeRequest): Promise<ChargeResponse>;
  getStatus(transactionId: string): Promise<string>;
  refund(transactionId: string): Promise<void>;
}
