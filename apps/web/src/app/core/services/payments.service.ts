import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PaymentProductCode = 'RECRUITER_PREMIUM_MONTHLY';
export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

/** `GET /api/payments/products` — le prix est fixé par le serveur. */
export interface PaymentProduct {
  code: PaymentProductCode;
  label: string;
  amount: number;
  currency: string;
  durationDays: number;
}

/** `POST /api/payments/initiate` — rediriger le navigateur vers `redirectUrl` (page hébergée par Bictorys). */
export interface PaymentInitiated {
  paymentId: string;
  amount: number;
  currency: string;
  redirectUrl: string;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/payments`;

  getProducts(): Observable<PaymentProduct[]> {
    return this.http.get<PaymentProduct[]>(`${this.base}/products`);
  }

  /** Sans moyen de paiement ni pays : l'acheteur les choisit sur la page Bictorys. */
  initiate(product: PaymentProductCode): Observable<PaymentInitiated> {
    return this.http.post<PaymentInitiated>(`${this.base}/initiate`, { product });
  }

  getPayment(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
