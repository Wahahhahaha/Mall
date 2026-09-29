import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Thin client for the Midtrans Snap Transaction API.
 *
 * Credentials come from MIDTRANS_SERVER_KEY / MIDTRANS_IS_PRODUCTION in .env.
 * Without a server key every call reports isConfigured() === false, so the
 * tenant app falls back to the local "mark as paid" flow.
 */
@Injectable()
export class MidtransService {
  private get key(): string {
    return process.env.MIDTRANS_SERVER_KEY?.trim() ?? '';
  }

  isConfigured(): boolean {
    return this.key.length > 0;
  }

  private isProduction(): boolean {
    return process.env.MIDTRANS_IS_PRODUCTION === 'true';
  }

  private baseSnap(): string {
    return this.isProduction()
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  private baseApi(): string {
    return this.isProduction()
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Midtrans is not configured (missing MIDTRANS_SERVER_KEY)');
    }
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.key}:`).toString('base64')}`,
        ...init?.headers,
      },
    });
    const body = (await res.json().catch(() => ({}))) as {
      status_code?: string;
      status_message?: string;
    };
    if (!res.ok) {
      throw new BadRequestException(
        body.status_message ?? `Midtrans error (HTTP ${res.status})`,
      );
    }
    return body as T;
  }

  /** Create a Snap transaction and return the hosted payment URL. */
  async createSnap(payload: {
    orderId: string;
    grossAmount: number;
    customer?: { name?: string; email?: string };
    returnUrl?: string;
  }): Promise<{ token: string; redirect_url: string }> {
    const res = await this.request<{ token: string; redirect_url: string }>(
      `${this.baseSnap()}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify({
          transaction_details: {
            order_id: payload.orderId,
            gross_amount: payload.grossAmount,
          },
          customer_details: {
            first_name: payload.customer?.name ?? '',
            email: payload.customer?.email ?? '',
          },
          item_details: [
            {
              id: 'lease',
              price: payload.grossAmount,
              quantity: 1,
              name: 'Mall unit lease',
            },
          ],
          credit_card: { secure: true, save_card: false },
          usage_limit: 1,
          enabled_payments: [
            'credit_card',
            'bank_transfer',
            'echannel',
            'qris',
            'gopay',
            'shopeepay',
          ],
        }),
      },
    );
    if (!res.token || !res.redirect_url) {
      throw new BadRequestException('Midtrans returned an incomplete response');
    }
    return res;
  }

  /**
   * Query the transaction status for an order id and map the Midtrans
   * transaction_status to our local payment status.
   */
  async getStatus(orderId: string): Promise<{
    midtransStatus: string | null;
    paymentStatus: 'Paid' | 'Unpaid';
    paymentType: string | null;
  }> {
    const res = await this.request<{
      status_code: string;
      transaction_status: string;
      payment_type?: string;
    }>(`${this.baseApi()}/${orderId}/status`);

    const s = res.transaction_status;
    const isPaid = s === 'settlement' || s === 'capture';
    return {
      midtransStatus: s ?? null,
      paymentStatus: isPaid ? 'Paid' : 'Unpaid',
      paymentType: res.payment_type ?? null,
    };
  }
}