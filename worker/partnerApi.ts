import type { Env } from './env';

/**
 * Thin fetch wrapper for calls to the partner platform API.
 *
 * Adds the `x-api-key` credential and a JSON content-type to every request so
 * route handlers never have to remember the header shape. Callers still pass
 * a `body` (already stringified) and any method/other init they need.
 *
 * Kept for direct-style callers; `partnerCall` below is the transport-aware
 * entry point route handlers should use.
 */
export function partnerFetch(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('x-api-key', env.PARTNER_API_KEY);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return fetch(`${env.PARTNER_API_BASE}${path}`, { ...init, headers });
}

/** Logical partner-platform operations the Worker needs, independent of transport. */
export type PartnerOp = 'onboard' | 'paymentLinkCreate' | 'paymentLinkStatus';

type PartnerCallPayload = Record<string, unknown>;

type TransportStyle = 'gateway' | 'direct';

function resolveStyle(env: Env): TransportStyle {
  return env.PARTNER_API_STYLE === 'direct' ? 'direct' : 'gateway';
}

/**
 * Maps a logical op + transport style to a concrete (method, path, body).
 *
 * Both styles authenticate with the same pkt_ key and use the same request
 * field names / response shape — only the URL, header, and (for
 * paymentLinkStatus only) HTTP method/body shape differ:
 *  - direct:  POST/GET straight to /api/partner/... routes.
 *  - gateway: POST to the MCP gateway's /api/partner-rest/tools/<tool>
 *    REST wrappers. paymentLinkStatus in particular has no GET-with-path-
 *    param equivalent on the gateway, so it becomes a POST with
 *    `{ intentId }` in the body instead of a GET with intentId in the URL.
 */
function buildRequest(
  style: TransportStyle,
  op: PartnerOp,
  payload: PartnerCallPayload,
): { method: string; path: string; body?: string } {
  if (op === 'paymentLinkStatus') {
    if (style === 'direct') {
      const intentId = String(payload.intentId);
      return { method: 'GET', path: `/api/partner/payment-links/${encodeURIComponent(intentId)}` };
    }
    return {
      method: 'POST',
      path: '/api/partner-rest/tools/payment_links_status',
      body: JSON.stringify({ intentId: payload.intentId }),
    };
  }

  if (op === 'onboard') {
    return {
      method: 'POST',
      path:
        style === 'direct' ? '/api/partner/customers/onboard' : '/api/partner-rest/tools/customers_onboard',
      body: JSON.stringify(payload),
    };
  }

  // op === 'paymentLinkCreate'
  return {
    method: 'POST',
    path: style === 'direct' ? '/api/partner/payment-links' : '/api/partner-rest/tools/payment_links_create',
    body: JSON.stringify(payload),
  };
}

/**
 * Calls the partner platform for one logical operation, using whichever
 * transport style (`env.PARTNER_API_STYLE`, default 'gateway') the Worker is
 * configured for. Attaches the right credential header for that style
 * (`x-api-key` for direct, `Authorization: Bearer` for gateway) and returns
 * the raw Response untouched — callers keep doing their own res.ok / status
 * handling exactly as before. This function owns only "which URL, which
 * header, which body shape," never response parsing.
 *
 * IMPORTANT: never forward the partner's raw error body to the client (see
 * `logPartnerError` in index.ts) — that rule is unaffected by transport
 * style, since gateway errors (`{success:false,error,code}`) are just as
 * unsafe to leak as direct ones, and are classified the same way by HTTP
 * status (401/403/5xx → 502, 429 → 429, 400 → validation-shaped 400).
 */
export function partnerCall(env: Env, op: PartnerOp, payload: PartnerCallPayload = {}): Promise<Response> {
  const style = resolveStyle(env);
  const { method, path, body } = buildRequest(style, op, payload);

  const headers = new Headers();
  headers.set('content-type', 'application/json');
  if (style === 'direct') {
    headers.set('x-api-key', env.PARTNER_API_KEY);
  } else {
    headers.set('authorization', `Bearer ${env.PARTNER_API_KEY}`);
  }

  return fetch(`${env.PARTNER_API_BASE}${path}`, { method, headers, ...(body !== undefined ? { body } : {}) });
}
