import type { Env } from './env';

/**
 * Thin fetch wrapper for calls to the partner platform API.
 *
 * Adds the `x-api-key` credential and a JSON content-type to every request so
 * route handlers never have to remember the header shape. Callers still pass
 * a `body` (already stringified) and any method/other init they need.
 */
export function partnerFetch(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('x-api-key', env.PARTNER_API_KEY);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return fetch(`${env.PARTNER_API_BASE}${path}`, { ...init, headers });
}
