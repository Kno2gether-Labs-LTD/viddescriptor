import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { siteConfig } from '../config';
import { ApiError, signup, startCheckout as apiStartCheckout, verifyPayment } from '../lib/api';
import { MEDIA } from '../lib/media';

/**
 * Signup modal state machine + presentational component.
 *
 * `useSignupFlow()` owns the reducer (and the return-from-Stripe deep-link
 * boot logic) so it can be lifted to App level — sticky CTAs and the entry
 * popup elsewhere on the page open the SAME modal instance via `openFlow()`.
 * `SignupFlow` itself is a controlled, presentational component: it renders
 * whatever `state`/`step`/`open` say and calls back through the `on*` props.
 */

export type FlowStep = 'email' | 'granted' | 'upsell' | 'cancelled' | 'verifying' | 'paid' | 'done' | 'error';

export type SignupFlowState = {
  open: boolean;
  step: FlowStep;
  email: string;
  customerId?: string;
  alreadyExisted?: boolean;
  submitting: boolean;
  error?: string;
  /** Which step "Try again" returns to from the `error` step. */
  retryTo: FlowStep;
  intentId?: string;
  verifyAttempts: number;
  stillConfirming: boolean;
};

const SESSION_INTENT_KEY = 'vd_intent';
const SESSION_CUSTOMER_KEY = 'vd_customer_id';
const VERIFY_POLL_MS = 2500;
const VERIFY_MAX_ATTEMPTS = 8;
const GENERIC_ERROR = 'Something went wrong. Please try again.';

const initialState: SignupFlowState = {
  open: false,
  step: 'email',
  email: '',
  submitting: false,
  retryTo: 'email',
  verifyAttempts: 0,
  stillConfirming: false,
};

type Action =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SUBMIT_EMAIL_START'; email: string }
  | { type: 'SUBMIT_EMAIL_SUCCESS'; customerId: string; alreadyExisted: boolean }
  | { type: 'SUBMIT_EMAIL_ERROR'; error: string }
  | { type: 'CONTINUE_TO_UPSELL' }
  | { type: 'START_CHECKOUT_START' }
  | { type: 'START_CHECKOUT_ERROR'; error: string }
  | { type: 'SKIP_UPSELL' }
  | { type: 'RETRY' }
  | { type: 'BOOT_VERIFY'; intentId: string }
  | { type: 'BOOT_CANCELLED'; customerId?: string }
  | { type: 'VERIFY_PENDING'; attempts: number }
  | { type: 'VERIFY_STILL_CONFIRMING' }
  | { type: 'VERIFY_PAID' }
  | { type: 'VERIFY_ERROR'; error: string };

/** Terminal steps: reopening from one of these starts a fresh flow rather than resuming. */
function isTerminalStep(step: FlowStep): boolean {
  return step === 'done' || step === 'paid' || step === 'cancelled';
}

function reducer(state: SignupFlowState, action: Action): SignupFlowState {
  switch (action.type) {
    case 'OPEN':
      // Mid-flow (email/granted/upsell/verifying/error) resumes where it left
      // off. Reopening from a terminal step (done/paid/cancelled) — the user
      // has already seen that outcome — starts over from a clean email step.
      return isTerminalStep(state.step) ? { ...initialState, open: true } : { ...state, open: true };
    case 'CLOSE':
      return { ...state, open: false };
    case 'SUBMIT_EMAIL_START':
      return { ...state, email: action.email, submitting: true, error: undefined };
    case 'SUBMIT_EMAIL_SUCCESS':
      return {
        ...state,
        submitting: false,
        step: 'granted',
        customerId: action.customerId,
        alreadyExisted: action.alreadyExisted,
      };
    case 'SUBMIT_EMAIL_ERROR':
      return { ...state, submitting: false, step: 'error', error: action.error, retryTo: 'email' };
    case 'CONTINUE_TO_UPSELL':
      return { ...state, step: 'upsell' };
    case 'START_CHECKOUT_START':
      return { ...state, submitting: true, error: undefined };
    case 'START_CHECKOUT_ERROR':
      return {
        ...state,
        submitting: false,
        step: 'error',
        error: action.error,
        retryTo: state.step === 'cancelled' ? 'cancelled' : 'upsell',
      };
    case 'SKIP_UPSELL':
      return { ...state, step: 'done' };
    case 'RETRY':
      return { ...state, step: state.retryTo, error: undefined };
    case 'BOOT_VERIFY':
      return {
        ...state,
        open: true,
        step: 'verifying',
        intentId: action.intentId,
        verifyAttempts: 0,
        stillConfirming: false,
      };
    case 'BOOT_CANCELLED':
      return {
        ...state,
        open: true,
        step: 'cancelled',
        customerId: action.customerId ?? state.customerId,
      };
    case 'VERIFY_PENDING':
      return { ...state, verifyAttempts: action.attempts };
    case 'VERIFY_STILL_CONFIRMING':
      return { ...state, stillConfirming: true };
    case 'VERIFY_PAID':
      return { ...state, step: 'paid' };
    case 'VERIFY_ERROR':
      return { ...state, step: 'error', error: action.error, retryTo: 'verifying' };
    default:
      return state;
  }
}

function readSessionItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    // sessionStorage can throw in locked-down/private contexts — treat as absent.
    return null;
  }
}

function writeSessionItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Non-fatal: worst case, a page reload can't recover this value later.
  }
}

function clearSessionItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Non-fatal — nothing to clean up if storage is unavailable in the first place.
  }
}

export type UseSignupFlowResult = {
  state: SignupFlowState;
  openFlow: () => void;
  closeFlow: () => void;
  submitEmail: (email: string) => void;
  continueToUpsell: () => void;
  startCheckout: () => void;
  skipUpsell: () => void;
  retry: () => void;
};

export function useSignupFlow(): UseSignupFlowResult {
  const [state, dispatch] = useReducer(reducer, initialState);

  const openFlow = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const closeFlow = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  const submitEmail = useCallback((email: string) => {
    dispatch({ type: 'SUBMIT_EMAIL_START', email });
    void (async () => {
      try {
        const res = await signup(email);
        writeSessionItem(SESSION_CUSTOMER_KEY, res.customerId);
        dispatch({
          type: 'SUBMIT_EMAIL_SUCCESS',
          customerId: res.customerId,
          alreadyExisted: res.alreadyExisted === true,
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : GENERIC_ERROR;
        dispatch({ type: 'SUBMIT_EMAIL_ERROR', error: message });
      }
    })();
  }, []);

  const continueToUpsell = useCallback(() => {
    // Upsell safety valve: until the platform-side credit grant for the
    // upsell payment ships, `siteConfig.upsell.credits <= 0` means the
    // one-time "double my credits" offer wouldn't actually grant anything if
    // shown. Rather than present an offer that silently pays out nothing,
    // skip the upsell step entirely and go straight to 'done' — same as an
    // explicit skip.
    if (siteConfig.upsell.credits <= 0) {
      clearSessionItem(SESSION_CUSTOMER_KEY);
      dispatch({ type: 'SKIP_UPSELL' });
      return;
    }
    dispatch({ type: 'CONTINUE_TO_UPSELL' });
  }, []);
  const skipUpsell = useCallback(() => {
    // Reached 'done' without paying — the recovered customerId from a prior
    // ?pay=cancelled visit no longer needs to survive a reload.
    clearSessionItem(SESSION_CUSTOMER_KEY);
    dispatch({ type: 'SKIP_UPSELL' });
  }, []);
  const retry = useCallback(() => dispatch({ type: 'RETRY' }), []);

  const { customerId } = state;
  // Synchronous guard against a rapid double-click firing two checkout
  // requests: `state.submitting` alone isn't enough because React can batch
  // both clicks into the same tick before a re-render reflects it.
  const checkoutInFlightRef = useRef(false);
  const startCheckout = useCallback(() => {
    if (!customerId || checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    dispatch({ type: 'START_CHECKOUT_START' });
    void (async () => {
      try {
        const res = await apiStartCheckout(customerId);
        // MUST persist before redirecting — the page navigates away entirely
        // and this is the only way to recover the intent on return.
        writeSessionItem(SESSION_INTENT_KEY, res.intentId);
        window.location.assign(res.url);
      } catch (err) {
        checkoutInFlightRef.current = false;
        const message = err instanceof ApiError ? err.message : GENERIC_ERROR;
        dispatch({ type: 'START_CHECKOUT_ERROR', error: message });
      }
    })();
  }, [customerId]);

  // Boot: interpret the return-from-Stripe deep link (`/?pay=success` or
  // `/?pay=cancelled`) once, on first mount. The intent/customer ids come
  // from sessionStorage, never the URL — the worker's successUrl/cancelUrl
  // are static and can't carry them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pay = params.get('pay');
    if (pay === 'success') {
      const intentId = readSessionItem(SESSION_INTENT_KEY);
      if (intentId) {
        dispatch({ type: 'BOOT_VERIFY', intentId });
      }
    } else if (pay === 'cancelled') {
      dispatch({ type: 'BOOT_CANCELLED', customerId: readSessionItem(SESSION_CUSTOMER_KEY) ?? undefined });
    }
  }, []);

  // Poll GET /api/verify while step === 'verifying' AND the modal is open:
  // check immediately, then every 2.5s, up to 8 total attempts before
  // falling back to a "still confirming" message that still offers the
  // portal login. Closing the modal stops the poll outright — the deep-link
  // boot path reopens it fresh on any future ?pay=success visit, so nothing
  // user-visible is lost by not polling in the background while closed.
  useEffect(() => {
    if (!state.open || state.step !== 'verifying' || !state.intentId) return;
    const intentId = state.intentId;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      attempts += 1;
      try {
        const res = await verifyPayment(intentId);
        if (cancelled) return;
        if (res.status === 'paid') {
          // Terminal answer — this intent is settled, and vd_customer_id no
          // longer needs to survive a reload once credits have landed.
          clearSessionItem(SESSION_INTENT_KEY);
          clearSessionItem(SESSION_CUSTOMER_KEY);
          dispatch({ type: 'VERIFY_PAID' });
          return;
        }
        if (res.status === 'pending') {
          if (attempts >= VERIFY_MAX_ATTEMPTS) {
            // Not terminal — the payment may still confirm later (e.g. via
            // webhook), so the stashed intent stays put for a possible
            // future poll instead of being cleared here.
            dispatch({ type: 'VERIFY_STILL_CONFIRMING' });
            return;
          }
          dispatch({ type: 'VERIFY_PENDING', attempts });
          timer = setTimeout(check, VERIFY_POLL_MS);
          return;
        }
        // expired/cancelled from the verify call itself — terminal.
        clearSessionItem(SESSION_INTENT_KEY);
        dispatch({
          type: 'VERIFY_ERROR',
          error: 'That payment could not be confirmed. Please contact support if you were charged.',
        });
      } catch {
        if (!cancelled) {
          // Network/parse failure — terminal for this poll; a stale intent
          // shouldn't be replayed by a later bookmark/back-button revisit.
          clearSessionItem(SESSION_INTENT_KEY);
          dispatch({ type: 'VERIFY_ERROR', error: 'Something went wrong confirming your payment. Please try again.' });
        }
      }
    };

    void check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [state.open, state.step, state.intentId]);

  return { state, openFlow, closeFlow, submitEmail, continueToUpsell, startCheckout, skipUpsell, retry };
}

function progressPosition(step: FlowStep, retryTo: FlowStep): 1 | 2 | 3 {
  if (step === 'email') return 1;
  if (step === 'granted') return 2;
  if (step === 'error') return retryTo === 'email' ? 1 : 3;
  return 3; // upsell, cancelled, verifying, paid, done
}

function stepCopy(step: FlowStep, state: SignupFlowState): { kicker: string; title: string; body: string } {
  switch (step) {
    case 'email':
      return {
        kicker: 'GET STARTED',
        title: 'Claim your free credits',
        body: `No card required. ${siteConfig.freeCredits} credits land on your account the moment you sign up.`,
      };
    case 'granted':
      return state.alreadyExisted
        ? {
            kicker: 'WELCOME BACK',
            title: 'Good to see you again',
            body: 'This email already has an account, so no new credits were added — you can keep going with what you have.',
          }
        : {
            kicker: "YOU'RE IN",
            title: `${siteConfig.freeCredits} credits added`,
            body: `Sent to ${state.email}. Yours to keep — they never expire.`,
          };
    case 'upsell':
    case 'cancelled':
      // Same copy for both — the "no charge was made" note for the
      // cancelled-return case is rendered once, in the component, rather
      // than duplicated here too.
      return {
        kicker: 'OPTIONAL',
        title: `${siteConfig.upsell.fromTo} credits`,
        body: `One-time payment of ${siteConfig.upsell.amountLabel} for ${siteConfig.upsell.credits} extra credits — yours to keep, no subscription.`,
      };
    case 'verifying':
      return state.stillConfirming
        ? {
            kicker: 'ALMOST THERE',
            title: 'Still confirming',
            body: 'This is taking longer than usual, but your credits will appear shortly. You can head to your portal now.',
          }
        : {
            kicker: 'ONE MOMENT',
            title: 'Confirming your payment',
            body: 'This usually takes a few seconds.',
          };
    case 'paid':
      return {
        kicker: 'PAYMENT CONFIRMED',
        title: "You're in",
        body: 'Your extra credits are on your account. Log in to your portal to start creating.',
      };
    case 'done':
      return {
        kicker: 'ALL SET',
        title: 'Your credits are ready',
        body: 'Log in to your portal to start creating with your free credits.',
      };
    case 'error':
      return {
        kicker: 'SOMETHING WENT WRONG',
        title: "Let's try that again",
        body: state.error ?? GENERIC_ERROR,
      };
    default:
      return { kicker: '', title: '', body: '' };
  }
}

const ACCENT = 'oklch(0.78 0.19 85)';

export type SignupFlowProps = {
  open: boolean;
  step: FlowStep;
  state: SignupFlowState;
  onClose: () => void;
  onSubmitEmail: (email: string) => void;
  onContinueToUpsell: () => void;
  onStartCheckout: () => void;
  onSkipUpsell: () => void;
  onRetry: () => void;
};

export function SignupFlow(props: SignupFlowProps): ReactElement | null {
  const { open, step, state, onClose, onSubmitEmail, onContinueToUpsell, onStartCheckout, onSkipUpsell, onRetry } = props;
  const [emailInput, setEmailInput] = useState(state.email);

  useEffect(() => {
    setEmailInput(state.email);
  }, [state.email]);

  if (!open) return null;

  const progress = progressPosition(step, state.retryTo);
  const copy = stepCopy(step, state);
  const portalLoginUrl = `${siteConfig.portalUrl}/login`;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = emailInput.trim();
    if (trimmed === '') return;
    onSubmitEmail(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Signup"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(6,6,5,.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(940px, 100%)',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid oklch(0.78 0.19 85 / .45)',
          background: '#0e0e0c',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          boxShadow: '0 40px 130px -30px oklch(0.78 0.19 85 / .55)',
          color: '#f5f3ee',
        }}
      >
        <div style={{ padding: 38 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
            <span style={{ height: 3, flex: 1, borderRadius: 9, background: progress >= 1 ? ACCENT : 'rgba(255,255,255,.14)' }} />
            <span style={{ height: 3, flex: 1, borderRadius: 9, background: progress >= 2 ? ACCENT : 'rgba(255,255,255,.14)' }} />
            <span style={{ height: 3, flex: 1, borderRadius: 9, background: progress >= 3 ? ACCENT : 'rgba(255,255,255,.14)' }} />
          </div>

          <div style={{ font: '700 11px/1 var(--font-mono, monospace)', letterSpacing: '.14em', color: ACCENT }}>
            {copy.kicker}
          </div>
          <h3
            style={{
              margin: '14px 0 0',
              font: '400 clamp(32px,3.8vw,50px)/0.92 var(--font-display, sans-serif)',
              textTransform: 'uppercase',
            }}
          >
            {copy.title}
          </h3>
          <p style={{ margin: '14px 0 0', font: '400 15.5px/1.55 var(--font-body, sans-serif)', color: 'rgba(245,243,238,.68)' }}>
            {copy.body}
          </p>

          {step === 'email' && (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  aria-label="Email address"
                  placeholder="you@studio.com"
                  value={emailInput}
                  disabled={state.submitting}
                  onChange={(event) => setEmailInput(event.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '15px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,.16)',
                    background: '#0a0a09',
                    color: '#f5f3ee',
                    font: '400 15px/1 var(--font-body, sans-serif)',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={state.submitting}
                  style={{
                    border: 0,
                    cursor: 'pointer',
                    padding: '15px 24px',
                    borderRadius: 12,
                    background: ACCENT,
                    color: '#0a0a09',
                    font: '700 15px/1 var(--font-body, sans-serif)',
                  }}
                >
                  {state.submitting ? 'Claiming…' : 'Claim credits'}
                </button>
              </div>
              <div style={{ marginTop: 14, font: "400 11.5px/1.6 var(--font-mono, monospace)", color: 'rgba(245,243,238,.42)' }}>
                NO CARD · NO WATERMARK · CREDITS NEVER EXPIRE
              </div>
            </form>
          )}

          {step === 'granted' && (
            <div>
              <div
                style={{
                  marginTop: 24,
                  padding: 22,
                  borderRadius: 16,
                  border: `1px solid ${ACCENT}`,
                  background: 'rgba(255,209,102,.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                }}
              >
                <div style={{ font: '400 62px/0.85 var(--font-display, sans-serif)', color: ACCENT }}>
                  {siteConfig.freeCredits}
                </div>
                <div style={{ font: '400 14px/1.5 var(--font-body, sans-serif)', color: 'rgba(245,243,238,.8)' }}>
                  credits added to
                  <br />
                  <strong>{state.email}</strong>
                </div>
              </div>
              <button
                onClick={onContinueToUpsell}
                style={{
                  marginTop: 20,
                  width: '100%',
                  border: 0,
                  cursor: 'pointer',
                  padding: 16,
                  borderRadius: 12,
                  background: ACCENT,
                  color: '#0a0a09',
                  font: '700 15px/1 var(--font-body, sans-serif)',
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {(step === 'upsell' || step === 'cancelled') && (
            <div>
              {step === 'cancelled' && (
                <p style={{ marginTop: 18, font: '400 13px/1.5 var(--font-body, sans-serif)', color: 'rgba(245,243,238,.6)' }}>
                  No charge was made — you can try again anytime.
                </p>
              )}
              <div
                style={{
                  marginTop: 22,
                  padding: 22,
                  borderRadius: 16,
                  border: `1px solid ${ACCENT}`,
                  background: `linear-gradient(180deg, rgba(255,209,102,.16), transparent)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ font: '400 46px/0.9 var(--font-display, sans-serif)' }}>{siteConfig.upsell.fromTo}</div>
                  <div style={{ font: '400 26px/1 var(--font-display, sans-serif)', color: ACCENT }}>
                    {siteConfig.upsell.amountLabel}
                  </div>
                </div>
                <div style={{ marginTop: 10, font: '400 14px/1.55 var(--font-body, sans-serif)', color: 'rgba(245,243,238,.72)' }}>
                  One payment. {siteConfig.upsell.credits} extra credits, yours to keep — no subscription, no
                  expiration.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <button
                  onClick={onStartCheckout}
                  disabled={state.submitting}
                  style={{
                    flex: 1,
                    minWidth: 180,
                    border: 0,
                    cursor: 'pointer',
                    padding: 16,
                    borderRadius: 12,
                    background: ACCENT,
                    color: '#0a0a09',
                    font: '700 15px/1 var(--font-body, sans-serif)',
                  }}
                >
                  {state.submitting ? 'Redirecting…' : 'Double my credits →'}
                </button>
                <button
                  onClick={onSkipUpsell}
                  style={{
                    border: '1px solid rgba(255,255,255,.18)',
                    background: 'transparent',
                    color: 'rgba(245,243,238,.6)',
                    cursor: 'pointer',
                    padding: '16px 20px',
                    borderRadius: 12,
                    font: '500 14px/1 var(--font-body, sans-serif)',
                  }}
                >
                  Skip, start with {siteConfig.freeCredits}
                </button>
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div style={{ marginTop: 22 }}>
              {state.stillConfirming ? (
                <a
                  href={portalLoginUrl}
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    border: 0,
                    cursor: 'pointer',
                    padding: '16px 24px',
                    borderRadius: 12,
                    background: ACCENT,
                    color: '#0a0a09',
                    font: '700 15px/1 var(--font-body, sans-serif)',
                    textDecoration: 'none',
                  }}
                >
                  Log in to your portal
                </a>
              ) : (
                <p style={{ font: '400 13px/1.5 var(--font-mono, monospace)', color: 'rgba(245,243,238,.5)' }}>
                  Checking…
                </p>
              )}
            </div>
          )}

          {step === 'paid' && (
            <div style={{ marginTop: 22 }}>
              <a
                href={portalLoginUrl}
                style={{
                  display: 'inline-block',
                  border: 0,
                  cursor: 'pointer',
                  padding: '16px 24px',
                  borderRadius: 12,
                  background: ACCENT,
                  color: '#0a0a09',
                  font: '700 15px/1 var(--font-body, sans-serif)',
                  textDecoration: 'none',
                }}
              >
                Log in to your portal
              </a>
            </div>
          )}

          {step === 'done' && (
            <div style={{ marginTop: 22 }}>
              <a
                href={portalLoginUrl}
                style={{
                  display: 'inline-block',
                  border: 0,
                  cursor: 'pointer',
                  padding: '16px 24px',
                  borderRadius: 12,
                  background: ACCENT,
                  color: '#0a0a09',
                  font: '700 15px/1 var(--font-body, sans-serif)',
                  textDecoration: 'none',
                }}
              >
                Log in to your portal
              </a>
            </div>
          )}

          {step === 'error' && (
            <div style={{ marginTop: 22 }}>
              <button
                onClick={onRetry}
                style={{
                  border: 0,
                  cursor: 'pointer',
                  padding: '16px 24px',
                  borderRadius: 12,
                  background: ACCENT,
                  color: '#0a0a09',
                  font: '700 15px/1 var(--font-body, sans-serif)',
                }}
              >
                Try again
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              marginTop: 16,
              border: 0,
              background: 'transparent',
              color: 'rgba(245,243,238,.35)',
              cursor: 'pointer',
              font: '400 12.5px/1 var(--font-body, sans-serif)',
              padding: 0,
              display: 'block',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ position: 'relative', borderLeft: '1px solid rgba(255,255,255,.1)', minHeight: 420 }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={MEDIA.m1.src}
            poster={MEDIA.m1.poster}
            muted
            loop
            playsInline
            preload="none"
            // The m1 clip frames her face in the upper third; a plain
            // `cover` centers vertically and crops it out of this tall
            // panel. `18%` keeps the face in frame across the panel's
            // typical rendered heights — verified against the clip's
            // framing, not a guess.
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(200deg, transparent 35%, rgba(10,10,9,.85))',
            }}
          />
          <div style={{ position: 'absolute', left: 20, bottom: 18, font: '400 11px/1.5 var(--font-mono, monospace)', color: 'rgba(245,243,238,.75)' }}>
            RENDERED ON {siteConfig.brandName.toUpperCase()}
            <br />
            20s · one click
          </div>
        </div>
      </div>
    </div>
  );
}
