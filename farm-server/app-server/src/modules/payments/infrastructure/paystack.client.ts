import axios from 'axios';

const PAYSTACK_BASE_URL = (process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co').replace(/\/$/, '');

/**
 * Thin Paystack REST wrapper — no SDK needed; the server already depends on
 * axios. Secret-key resolution follows the platform's config pattern:
 * PlatformConfig `paystack.secret_key` (console-editable, masked on read)
 * wins over the `PAYSTACK_SECRET_KEY` env var.
 *
 * Every call surfaces Paystack's own `message` so operators see the real
 * reason a checkout/enable/disable failed.
 */
export class PaystackClient {
  async getSecretKey(): Promise<string> {
    try {
      const { prisma } = await import('../../../kernel/database');
      const cfg = await prisma.platformConfig.findUnique({ where: { key: 'paystack.secret_key' } });
      const dbKey = typeof cfg?.value === 'string' ? cfg.value.trim() : '';
      if (dbKey) return dbKey;
    } catch {
      // Config table unreachable — fall through to the env var.
    }
    const envKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (envKey) return envKey;
    throw new Error(
      'Paystack is not configured — set paystack.secret_key in the platform config or PAYSTACK_SECRET_KEY'
    );
  }

  async isConfigured(): Promise<boolean> {
    try {
      await this.getSecretKey();
      return true;
    } catch {
      return false;
    }
  }

  private async request(method: 'get' | 'post', path: string, body?: Record<string, any>) {
    const secret = await this.getSecretKey();
    try {
      const res = await axios({
        method,
        url: `${PAYSTACK_BASE_URL}${path}`,
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        data: body,
        timeout: 15000,
      });
      return res.data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Paystack request failed';
      throw new Error(`Paystack ${method.toUpperCase()} ${path} failed: ${msg}`);
    }
  }

  /** Returns `{ authorization_url, access_code, reference }`. */
  async initializeTransaction(payload: {
    email: string;
    amount: number; // smallest currency unit (kobo/cents)
    currency: string;
    reference: string;
    callback_url?: string;
    plan?: string; // PLN_* — present for recurring checkouts
    metadata?: Record<string, any>;
  }) {
    const res = await this.request('post', '/transaction/initialize', payload);
    if (!res?.status || !res.data?.authorization_url) {
      throw new Error(`Paystack initialize failed: ${res?.message || 'no authorization_url'}`);
    }
    return res.data as { authorization_url: string; access_code: string; reference: string };
  }

  /** Full transaction payload (`data.status`: success|failed|abandoned|reversed|ongoing|pending). */
  async verifyTransaction(reference: string) {
    const res = await this.request('get', `/transaction/verify/${encodeURIComponent(reference)}`);
    if (!res?.status || !res.data) {
      throw new Error(`Paystack verify failed: ${res?.message || 'unknown reference'}`);
    }
    return res.data;
  }

  /** Creates (or returns an existing) Paystack plan for recurring billing. */
  async createPlan(payload: {
    name: string;
    interval: 'daily' | 'weekly' | 'monthly' | 'annually';
    amount: number;
    currency: string;
    description?: string;
  }) {
    const res = await this.request('post', '/plan', payload);
    if (!res?.status || !res.data?.plan_code) {
      throw new Error(`Paystack plan create failed: ${res?.message || 'no plan_code'}`);
    }
    return res.data as { plan_code: string; [k: string]: any };
  }

  async disableSubscription(code: string, token: string) {
    const res = await this.request('post', '/subscription/disable', { code, token });
    if (!res?.status) throw new Error(`Paystack disable failed: ${res?.message || ''}`);
    return res.data;
  }

  async enableSubscription(code: string, token: string) {
    const res = await this.request('post', '/subscription/enable', { code, token });
    if (!res?.status) throw new Error(`Paystack enable failed: ${res?.message || ''}`);
    return res.data;
  }

  /**
   * Subscriptions for this Paystack account — used to recover a subscription
   * `token` (needed by enable/disable) when our stored copy is missing.
   */
  async listSubscriptions(): Promise<Array<{ subscription_code: string; token?: string; [k: string]: any }>> {
    const res = await this.request('get', '/subscription?limit=100');
    return res?.data ?? [];
  }

  async findSubscriptionToken(code: string): Promise<string | null> {
    try {
      const subs = await this.listSubscriptions();
      const found = subs.find((s) => s.subscription_code === code);
      return found?.token || null;
    } catch {
      return null;
    }
  }
}

export const paystackClient = new PaystackClient();
