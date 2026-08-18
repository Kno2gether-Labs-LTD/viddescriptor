/**
 * Thin typed fetch wrappers for the Worker's `/api/*` JSON endpoints.
 *
 * Every function throws `ApiError` on a non-2xx response (or an unreadable
 * body) so callers can drive UI state off a single `try/catch`, matching the
 * shape defined by `worker/index.ts`.
 */

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type SignupResponse = {
  customerId: string;
  alreadyExisted?: boolean;
};

export type CheckoutResponse = {
  url: string;
  intentId: string;
};

export type VerifyStatus = 'paid' | 'pending' | 'expired' | 'cancelled';

export type VerifyResponse = {
  status: VerifyStatus;
};

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Body wasn't valid JSON — fall through to the generic error below.
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : DEFAULT_ERROR_MESSAGE;
    throw new ApiError(message, res.status);
  }

  if (data === null || typeof data !== 'object') {
    throw new ApiError(DEFAULT_ERROR_MESSAGE, res.status);
  }

  return data as T;
}

/**
 * `turnstileToken` is included in the request body only when provided —
 * callers on a deployment with Turnstile disabled (`siteConfig.turnstileSiteKey`
 * unset) never pass one, keeping the body byte-for-byte identical to the
 * pre-Turnstile shape.
 */
export async function signup(email: string, turnstileToken?: string): Promise<SignupResponse> {
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(turnstileToken ? { email, turnstileToken } : { email }),
  });
  return parseJsonOrThrow<SignupResponse>(res);
}

export async function startCheckout(customerId: string): Promise<CheckoutResponse> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customerId }),
  });
  return parseJsonOrThrow<CheckoutResponse>(res);
}

export async function verifyPayment(intentId: string): Promise<VerifyResponse> {
  const res = await fetch(`/api/verify?intent=${encodeURIComponent(intentId)}`, {
    method: 'GET',
  });
  return parseJsonOrThrow<VerifyResponse>(res);
}
