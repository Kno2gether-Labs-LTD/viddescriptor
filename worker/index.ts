import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from './env';
import { partnerFetch } from './partnerApi';
import { checkRate } from './rateLimit';

const app = new Hono<{ Bindings: Env }>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const SIGNUP_LIMIT = 5;
const CHECKOUT_LIMIT = 5;
const VERIFY_LIMIT = 30;

const FRIENDLY_UNAVAILABLE = 'The signup service is temporarily unavailable. Please try again shortly.';
const FRIENDLY_RATE_LIMITED = 'Too many requests. Please try again in a few minutes.';
const MAX_EMAIL_LENGTH = 254;

function clientIp(c: Context<{ Bindings: Env }>): string {
  return c.req.header('CF-Connecting-IP') || 'unknown';
}

/** Reads and discards the partner error body so it never reaches the client; logs it. */
async function logPartnerError(context: string, res: Response): Promise<void> {
  const text = await res.text().catch(() => '<unreadable body>');
  console.error(`${context}: partner API returned ${res.status}`, text);
}

type PartnerFailureKind = 'rate-limited' | 'unavailable' | 'validation';

/**
 * Classifies a non-ok partner API status into how the client should see it.
 * 401/403 mean OUR credential is bad, not that the customer's input is bad —
 * surfacing "check the email" for those would be misleading, so they (and any
 * 5xx) become a generic 502 "temporarily unavailable" instead. 429 gets its
 * own friendly rate-limit message. Only genuine validation-shaped 4xx
 * (400/404/409/422/...) keep the "check the email" style copy.
 */
function classifyPartnerFailure(status: number): PartnerFailureKind {
  if (status === 429) return 'rate-limited';
  if (status === 401 || status === 403 || status >= 500) return 'unavailable';
  return 'validation';
}

app.get('/api/health', (c) => c.json({ ok: true }));

/**
 * POST /api/signup { email } → 200 { customerId, alreadyExisted? } | 400 | 429 | 502
 *
 * Proxies POST {PARTNER_API_BASE}/api/partner/customers/onboard. The partner
 * API answers a duplicate email with HTTP 200 + `existing: true` (there is no
 * 409 path) — that maps to `alreadyExisted: true` here, still a 200.
 */
app.post('/api/signup', async (c) => {
  const ip = clientIp(c);
  if (!checkRate(ip, 'signup', SIGNUP_LIMIT, RATE_WINDOW_MS)) {
    return c.json({ error: FRIENDLY_RATE_LIMITED }, 429);
  }

  const raw = await c.req.json().catch(() => null);
  const email =
    raw && typeof raw === 'object' && 'email' in raw ? (raw as Record<string, unknown>).email : undefined;
  if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return c.json({ error: 'A valid email address is required.' }, 400);
  }

  const env = c.env;
  const payload: Record<string, unknown> = {
    email,
    experienceType: env.EXPERIENCE_TYPE,
    initialAiCredits: Number(env.FREE_CREDITS),
    idempotencyKey: email,
    sendWelcomeEmail: true,
    ...(env.FREE_PLAN_ID ? { planId: env.FREE_PLAN_ID } : {}),
  };

  let res: Response;
  try {
    res = await partnerFetch(env, '/api/partner/customers/onboard', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('signup: partner onboard request failed', err);
    return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
  }

  if (!res.ok) {
    await logPartnerError('signup', res);
    const kind = classifyPartnerFailure(res.status);
    if (kind === 'rate-limited') {
      return c.json({ error: FRIENDLY_RATE_LIMITED }, 429);
    }
    if (kind === 'unavailable') {
      return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
    }
    return c.json({ error: 'We could not complete that signup. Please check the email and try again.' }, 400);
  }

  const data = (await res.json().catch(() => null)) as { customerId?: unknown; existing?: unknown } | null;
  if (!data || typeof data.customerId !== 'string') {
    console.error('signup: partner onboard returned an unexpected body', data);
    return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
  }

  return c.json(
    {
      customerId: data.customerId,
      ...(data.existing === true ? { alreadyExisted: true } : {}),
    },
    200,
  );
});

/**
 * POST /api/checkout { customerId } → 200 { url, intentId } | 400 | 429 | 502
 *
 * Mints a partner payment link (POST /api/partner/payment-links) for the
 * upsell. IMPORTANT: the partner API's successUrl cannot be pre-templated
 * with the minted intentId — the intent doesn't exist until AFTER the mint
 * call returns it, and the partner API does not substitute placeholders into
 * successUrl. So successUrl/cancelUrl here are static (`?pay=success` /
 * `?pay=cancelled`), and this endpoint instead RETURNS intentId to the
 * caller. The client must stash intentId (e.g. sessionStorage) BEFORE
 * redirecting to `url`, then read it back on return and call
 * GET /api/verify?intent=<intentId> to confirm payment — never trust the
 * redirect itself, only the verify call.
 */
app.post('/api/checkout', async (c) => {
  const ip = clientIp(c);
  if (!checkRate(ip, 'checkout', CHECKOUT_LIMIT, RATE_WINDOW_MS)) {
    return c.json({ error: FRIENDLY_RATE_LIMITED }, 429);
  }

  const raw = await c.req.json().catch(() => null);
  const customerId =
    raw && typeof raw === 'object' && 'customerId' in raw
      ? (raw as Record<string, unknown>).customerId
      : undefined;
  if (typeof customerId !== 'string' || customerId.trim() === '') {
    return c.json({ error: 'A valid customerId is required.' }, 400);
  }

  const env = c.env;
  const upsellCredits = Number(env.UPSELL_CREDITS);
  const payload = {
    customerId,
    amount: Number(env.UPSELL_AMOUNT_CENTS),
    currency: env.UPSELL_CURRENCY,
    interval: 'one_time',
    successUrl: `${env.SITE_URL}/?pay=success`,
    cancelUrl: `${env.SITE_URL}/?pay=cancelled`,
    description: 'Viddescriptor credit doubler',
    // Grant is read off the intent row by the (separately-extended) payment
    // webhook — see docs/notes/upsell-grant.md. Omitted entirely at 0 rather
    // than sent as {initialAiCredits: 0}, since the webhook's feature-apply
    // pipeline treats presence as "grant this."
    ...(upsellCredits > 0 ? { features: { initialAiCredits: upsellCredits } } : {}),
  };

  let res: Response;
  try {
    res = await partnerFetch(env, '/api/partner/payment-links', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('checkout: partner payment-link mint failed', err);
    return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
  }

  if (!res.ok) {
    await logPartnerError('checkout', res);
    const kind = classifyPartnerFailure(res.status);
    if (kind === 'rate-limited') {
      return c.json({ error: FRIENDLY_RATE_LIMITED }, 429);
    }
    if (kind === 'unavailable') {
      return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
    }
    return c.json({ error: 'We could not start checkout for that account.' }, 400);
  }

  const data = (await res.json().catch(() => null)) as { intentId?: unknown; url?: unknown } | null;
  if (!data || typeof data.intentId !== 'string' || typeof data.url !== 'string') {
    console.error('checkout: partner payment-link mint returned an unexpected body', data);
    return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
  }

  return c.json({ url: data.url, intentId: data.intentId }, 200);
});

type VerifyStatus = 'paid' | 'pending' | 'expired' | 'cancelled';

/** Conservative mapping from the partner's raw intent status to our four states. */
function mapPaymentStatus(rawStatus: string): VerifyStatus {
  const status = rawStatus.toLowerCase();
  if (status === 'paid' || status === 'succeeded' || status === 'completed') return 'paid';
  if (status === 'expired') return 'expired';
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  // pending/created/minted/open, and anything else unrecognized — pending.
  return 'pending';
}

/**
 * GET /api/verify?intent=… → 200 { status } | 400 | 429 | 502
 *
 * Proxies GET {PARTNER_API_BASE}/api/partner/payment-links/{intentId}.
 */
app.get('/api/verify', async (c) => {
  const ip = clientIp(c);
  if (!checkRate(ip, 'verify', VERIFY_LIMIT, RATE_WINDOW_MS)) {
    return c.json({ error: FRIENDLY_RATE_LIMITED }, 429);
  }

  const intentId = c.req.query('intent');
  if (!intentId || intentId.trim() === '') {
    return c.json({ error: 'A valid payment intent id is required.' }, 400);
  }

  const env = c.env;
  let res: Response;
  try {
    res = await partnerFetch(env, `/api/partner/payment-links/${encodeURIComponent(intentId)}`, {
      method: 'GET',
    });
  } catch (err) {
    console.error('verify: partner payment-link lookup failed', err);
    return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
  }

  if (res.status === 400 || res.status === 404) {
    await logPartnerError('verify', res);
    return c.json({ error: 'That payment could not be found.' }, 400);
  }
  if (!res.ok) {
    await logPartnerError('verify', res);
    return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
  }

  const data = (await res.json().catch(() => null)) as { status?: unknown } | null;
  if (!data || typeof data.status !== 'string') {
    console.error('verify: partner payment-link lookup returned an unexpected body', data);
    return c.json({ error: FRIENDLY_UNAVAILABLE }, 502);
  }

  return c.json({ status: mapPaymentStatus(data.status) }, 200);
});

export default app;
