import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../worker/index';
import type { Env } from '../../worker/env';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    ASSETS: {} as Fetcher,
    PARTNER_API_BASE: 'https://partner.example.com',
    PARTNER_API_KEY: 'test-key',
    PARTNER_API_STYLE: 'direct',
    EXPERIENCE_TYPE: 'viddescriptor',
    FREE_CREDITS: '300',
    UPSELL_AMOUNT_CENTS: '900',
    UPSELL_CURRENCY: 'usd',
    UPSELL_CREDITS: '500',
    SITE_URL: 'https://viddescriptor.com',
    ...overrides,
  };
}

describe('POST /api/signup', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls partner onboard with the exact body/headers and returns customerId', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://partner.example.com/api/partner/customers/onboard');
      const headers = new Headers(init.headers);
      expect(headers.get('x-api-key')).toBe('test-key');
      expect(headers.get('content-type')).toBe('application/json');
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        email: 'user@example.com',
        experienceType: 'viddescriptor',
        initialAiCredits: 300,
        idempotencyKey: 'user@example.com',
        sendWelcomeEmail: true,
        // binding the experience alone leaves the studio nav OFF — the default toggle
        // is what stops a fresh signup landing on "Media Studio Not Enabled"
        features: { showMediaStudio: true },
      });
      return new Response(
        JSON.stringify({ customerId: 'cust_123', created: true, existing: false }),
        { status: 201 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-1' },
        body: JSON.stringify({ email: 'user@example.com' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ customerId: 'cust_123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('includes planId in the onboard body only when FREE_PLAN_ID is set', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.planId).toBe('plan_free');
      return new Response(JSON.stringify({ customerId: 'cust_1' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-2' },
        body: JSON.stringify({ email: 'plan@example.com' }),
      },
      makeEnv({ FREE_PLAN_ID: 'plan_free' }),
    );

    expect(res.status).toBe(200);
  });

  it('rejects an invalid email with 400 without calling the partner API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-3' },
        body: JSON.stringify({ email: 'not-an-email' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing email with 400 without calling the partner API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-4' },
        body: JSON.stringify({}),
      },
      makeEnv(),
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a duplicate customer (partner 200 + existing:true) to alreadyExisted:true', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          customerId: 'cust_dup',
          created: false,
          existing: true,
          warnings: ['A customer with this email already exists'],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-5' },
        body: JSON.stringify({ email: 'dup@example.com' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ customerId: 'cust_dup', alreadyExisted: true });
  });

  it('maps a partner 500 to a friendly 502 without forwarding the raw body', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: 'Internal Server Error', stack: 'super-secret-internal-detail' }),
        { status: 500 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-6' },
        body: JSON.stringify({ email: 'fail@example.com' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBeTruthy();
    expect(JSON.stringify(json)).not.toContain('super-secret-internal-detail');
  });

  it('maps a partner 401 to a friendly 502, not a "check the email" 400', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-401' },
        body: JSON.stringify({ email: 'user@example.com' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('The signup service is temporarily unavailable. Please try again shortly.');
  });

  it('maps a partner 403 to a friendly 502, not a "check the email" 400', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-403' },
        body: JSON.stringify({ email: 'user@example.com' }),
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
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-partner-429' },
        body: JSON.stringify({ email: 'user@example.com' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(429);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('Too many requests. Please try again in a few minutes.');
  });

  it('maps a genuine partner validation 400 to our "check the email" 400', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Invalid email domain' }), { status: 400 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-validation-400' },
        body: JSON.stringify({ email: 'user@example.com' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('We could not complete that signup. Please check the email and try again.');
  });

  it('rejects an email longer than 254 characters with 400 without calling the partner API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const longEmail = `${'a'.repeat(250)}@example.com`; // > 254 chars total
    expect(longEmail.length).toBeGreaterThan(254);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-long-email' },
        body: JSON.stringify({ email: longEmail }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 502 with a friendly error when the partner fetch throws', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network down');
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-7' },
        body: JSON.stringify({ email: 'network@example.com' }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(502);
  });

  it('returns 429 on the 6th signup request from the same IP within the window', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ customerId: 'cust_x' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const env = makeEnv();
    const ip = 'ip-signup-ratelimit';

    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        '/api/signup',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
          body: JSON.stringify({ email: `user${i}@example.com` }),
        },
        env,
      );
      expect(res.status).toBe(200);
    }

    const sixth = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ email: 'user6@example.com' }),
      },
      env,
    );
    expect(sixth.status).toBe(429);
    const json = (await sixth.json()) as { error: string };
    expect(json.error).toBeTruthy();
  });

  it('calls the gateway onboard tool with Bearer auth and the exact body (gateway style)', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://partner.example.com/api/partner-rest/tools/customers_onboard');
      const headers = new Headers(init.headers);
      expect(headers.get('authorization')).toBe('Bearer test-key');
      expect(headers.has('x-api-key')).toBe(false);
      expect(headers.get('content-type')).toBe('application/json');
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        email: 'gateway@example.com',
        experienceType: 'viddescriptor',
        initialAiCredits: 300,
        idempotencyKey: 'gateway@example.com',
        sendWelcomeEmail: true,
        features: { showMediaStudio: true },
      });
      return new Response(
        JSON.stringify({ customerId: 'cust_gw', created: true, existing: false }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-gateway' },
        body: JSON.stringify({ email: 'gateway@example.com' }),
      },
      makeEnv({ PARTNER_API_STYLE: 'gateway' }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ customerId: 'cust_gw' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('defaults to gateway style (mcp tool route, Bearer auth) when PARTNER_API_STYLE is unset', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://partner.example.com/api/partner-rest/tools/customers_onboard');
      const headers = new Headers(init.headers);
      expect(headers.get('authorization')).toBe('Bearer test-key');
      expect(headers.has('x-api-key')).toBe(false);
      return new Response(JSON.stringify({ customerId: 'cust_default' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      '/api/signup',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': 'ip-signup-default-style' },
        body: JSON.stringify({ email: 'default@example.com' }),
      },
      makeEnv({ PARTNER_API_STYLE: undefined }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ customerId: 'cust_default' });
  });
});


describe('ONBOARD_FEATURES_JSON', () => {
  const capture = () => {
    const seen: unknown[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      seen.push(JSON.parse(init.body as string));
      return new Response(JSON.stringify({ customerId: 'c1', created: true }), { status: 201 });
    }));
    return seen;
  };
  const post = (env: Record<string, unknown>) => app.request('/api/signup', {
    method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '9.9.9.' + Math.floor(Math.random()*250) },
    body: JSON.stringify({ email: 'f@example.com' }),
  }, env as never);

  it('overrides the default toggles when set to a JSON object', async () => {
    const seen = capture();
    await post({ ...makeEnv(), ONBOARD_FEATURES_JSON: '{"showWebsiteStudio":true,"showMediaStudio":false}' });
    expect((seen[0] as { features: unknown }).features).toEqual({ showWebsiteStudio: true, showMediaStudio: false });
  });
  it('sends no features key for an empty object', async () => {
    const seen = capture();
    await post({ ...makeEnv(), ONBOARD_FEATURES_JSON: '{}' });
    expect(seen[0]).not.toHaveProperty('features');
  });
  it('falls back to the default on invalid JSON', async () => {
    const seen = capture();
    await post({ ...makeEnv(), ONBOARD_FEATURES_JSON: 'not-json' });
    expect((seen[0] as { features: unknown }).features).toEqual({ showMediaStudio: true });
  });
});
