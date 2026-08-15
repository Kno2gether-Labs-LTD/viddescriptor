import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../worker/index';
import type { Env } from '../../worker/env';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    ASSETS: {} as Fetcher,
    PARTNER_API_BASE: 'https://partner.example.com',
    PARTNER_API_KEY: 'test-key',
    EXPERIENCE_TYPE: 'viddescriptor',
    FREE_CREDITS: '300',
    UPSELL_AMOUNT_CENTS: '900',
    UPSELL_CURRENCY: 'usd',
    UPSELL_CREDITS: '500',
    SITE_URL: 'https://viddescriptor.com',
    ...overrides,
  };
}

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('mints a payment link with the exact body/headers and returns {url, intentId}', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://partner.example.com/api/partner/payment-links');
      const headers = new Headers(init.headers);
      expect(headers.get('x-api-key')).toBe('test-key');
      expect(headers.get('content-type')).toBe('application/json');
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        customerId: 'cust_123',
        amount: 900,
        currency: 'usd',
        interval: 'one_time',
        successUrl: 'https://viddescriptor.com/?pay=success',
        cancelUrl: 'https://viddescriptor.com/?pay=cancelled',
        description: 'Viddescriptor credit doubler',
        features: { initialAiCredits: 500 },
      });
      return new Response(
        JSON.stringify({ intentId: 'intent_abc', url: 'https://checkout.stripe.com/xyz', status: 'created' }),
        { status: 201 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-1' },
        body: JSON.stringify({ customerId: 'cust_123' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/xyz', intentId: 'intent_abc' });
  });

  it('omits the features key entirely when UPSELL_CREDITS is "0"', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body).not.toHaveProperty('features');
      expect(body).toEqual({
        customerId: 'cust_zero',
        amount: 900,
        currency: 'usd',
        interval: 'one_time',
        successUrl: 'https://viddescriptor.com/?pay=success',
        cancelUrl: 'https://viddescriptor.com/?pay=cancelled',
        description: 'Viddescriptor credit doubler',
      });
      return new Response(
        JSON.stringify({ intentId: 'intent_zero', url: 'https://checkout.stripe.com/zero', status: 'created' }),
        { status: 201 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-zero-credits' },
        body: JSON.stringify({ customerId: 'cust_zero' }),
      },
      makeEnv({ UPSELL_CREDITS: '0' }),
    );

    expect(res.status).toBe(200);
  });

  it('rejects a missing customerId with 400 without calling the partner API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-2' },
        body: JSON.stringify({}),
      },
      makeEnv(),
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a partner 500 to a friendly 502', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'boom', internal: 'stack trace here' }), { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-3' },
        body: JSON.stringify({ customerId: 'cust_x' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(JSON.stringify(json)).not.toContain('stack trace here');
  });

  it('maps a partner 401 to a friendly 502, not a generic "could not start checkout" 400', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-401' },
        body: JSON.stringify({ customerId: 'cust_401' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('The signup service is temporarily unavailable. Please try again shortly.');
  });

  it('maps a partner 403 to a friendly 502', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-403' },
        body: JSON.stringify({ customerId: 'cust_403' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(502);
  });

  it('maps a partner 429 to our own 429 friendly rate-limit message', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-partner-429' },
        body: JSON.stringify({ customerId: 'cust_429' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(429);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('Too many requests. Please try again in a few minutes.');
  });

  it('maps a genuine partner validation 400 to the "could not start checkout" 400', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Unknown customer' }), { status: 400 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-checkout-validation-400' },
        body: JSON.stringify({ customerId: 'cust_bad' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('We could not start checkout for that account.');
  });

  it('returns 429 on the 6th checkout request from the same IP within the window', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ intentId: 'i', url: 'https://x' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const env = makeEnv();
    const ip = 'ip-checkout-ratelimit';

    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        '/api/checkout',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
          body: JSON.stringify({ customerId: `cust_${i}` }),
        },
        env,
      );
      expect(res.status).toBe(200);
    }

    const sixth = await app.request(
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ customerId: 'cust_over' }),
      },
      env,
    );
    expect(sixth.status).toBe(429);
  });
});

describe('GET /api/verify', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  const statusCases: Array<[string, string]> = [
    ['paid', 'paid'],
    ['succeeded', 'paid'],
    ['completed', 'paid'],
    ['expired', 'expired'],
    ['cancelled', 'cancelled'],
    ['canceled', 'cancelled'],
    ['pending', 'pending'],
    ['created', 'pending'],
    ['minted', 'pending'],
    ['open', 'pending'],
  ];

  statusCases.forEach(([partnerStatus, expected], idx) => {
    it(`maps partner status "${partnerStatus}" to "${expected}"`, async () => {
      const fetchMock = vi.fn(async (url: string) => {
        expect(url).toBe('https://partner.example.com/api/partner/payment-links/intent_abc');
        return new Response(JSON.stringify({ status: partnerStatus }), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await app.request(
        '/api/verify?intent=intent_abc',
        { headers: { 'CF-Connecting-IP': `ip-verify-status-${idx}` } },
        makeEnv(),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: expected });
    });
  });

  it('returns 400 for a missing intent param without calling the partner API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/verify',
      { headers: { 'CF-Connecting-IP': 'ip-verify-missing' } },
      makeEnv(),
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps an unknown/malformed intent (partner 404) to 400', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Payment link not found' }), { status: 404 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/verify?intent=does-not-exist',
      { headers: { 'CF-Connecting-IP': 'ip-verify-notfound' } },
      makeEnv(),
    );

    expect(res.status).toBe(400);
  });

  it('maps a partner 500 to a friendly 502', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/verify?intent=intent_abc',
      { headers: { 'CF-Connecting-IP': 'ip-verify-500' } },
      makeEnv(),
    );

    expect(res.status).toBe(502);
  });

  it('returns 429 on the 31st verify request from the same IP within the window', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ status: 'pending' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const env = makeEnv();
    const ip = 'ip-verify-ratelimit';

    for (let i = 0; i < 30; i++) {
      const res = await app.request(
        '/api/verify?intent=intent_abc',
        { headers: { 'CF-Connecting-IP': ip } },
        env,
      );
      expect(res.status).toBe(200);
    }

    const overLimit = await app.request(
      '/api/verify?intent=intent_abc',
      { headers: { 'CF-Connecting-IP': ip } },
      env,
    );
    expect(overLimit.status).toBe(429);
  });
});
