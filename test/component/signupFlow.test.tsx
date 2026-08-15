// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupFlow, useSignupFlow } from '../../src/components/SignupFlow';
import { siteConfig } from '../../src/config';

/**
 * Mirrors how App (Task 6) will wire the modal: a single `useSignupFlow()`
 * instance lifted above the component, so external triggers (sticky CTAs,
 * the entry popup) and the modal itself share one state machine.
 */
function Harness() {
  const flow = useSignupFlow();
  return (
    <div>
      <button onClick={flow.openFlow}>open signup</button>
      <SignupFlow
        open={flow.state.open}
        step={flow.state.step}
        state={flow.state}
        onClose={flow.closeFlow}
        onSubmitEmail={flow.submitEmail}
        onContinueToUpsell={flow.continueToUpsell}
        onStartCheckout={flow.startCheckout}
        onSkipUpsell={flow.skipUpsell}
        onRetry={flow.retry}
      />
    </div>
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function openAndSubmitEmail(email: string) {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: /open signup/i }));
  await user.type(screen.getByRole('textbox', { name: /email address/i }), email);
  await user.click(screen.getByRole('button', { name: /claim credits/i }));
  return user;
}

describe('SignupFlow', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('submitEmail happy path advances email -> granted', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('/api/signup');
      expect(JSON.parse(init.body as string)).toEqual({ email: 'user@example.com' });
      return jsonResponse({ customerId: 'cust_1' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await openAndSubmitEmail('user@example.com');

    expect(await screen.findByRole('heading', { name: /credits added/i })).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('duplicate email shows welcome-back copy and still advances to granted', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ customerId: 'cust_dup', alreadyExisted: true }));
    vi.stubGlobal('fetch', fetchMock);

    await openAndSubmitEmail('dup@example.com');

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
    // Still on the granted step (progressed), not stuck on email.
    expect(screen.queryByRole('textbox', { name: /email address/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('a signup API failure shows a retryable error state, not a dead end', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'A valid email address is required.' }, 400));
    vi.stubGlobal('fetch', fetchMock);

    const user = await openAndSubmitEmail('fail@example.com');

    expect(await screen.findByText(/a valid email address is required/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    // Retrying returns to the email step so the user can resubmit — not a dead end.
    await user.click(retryButton);
    expect(await screen.findByRole('textbox', { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claim credits/i })).toBeInTheDocument();
  });

  it('skip path reaches done without ever calling checkout', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ customerId: 'cust_skip' }));
    vi.stubGlobal('fetch', fetchMock);

    const user = await openAndSubmitEmail('skip@example.com');
    await screen.findByRole('heading', { name: /credits added/i });

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByRole('button', { name: /skip, start with/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /skip, start with/i }));

    const portalLink = await screen.findByRole('link', { name: /log in to your portal/i });
    expect(portalLink).toHaveAttribute('href', `${siteConfig.portalUrl}/login`);
    expect(fetchMock).toHaveBeenCalledTimes(1); // signup only, never checkout
    // Reaching 'done' clears any recovered customerId — it no longer needs
    // to survive a reload.
    expect(window.sessionStorage.getItem('vd_customer_id')).toBeNull();
  });

  it('reopening mid-flow (e.g. granted) preserves progress instead of resetting', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ customerId: 'cust_resume' }));
    vi.stubGlobal('fetch', fetchMock);

    const user = await openAndSubmitEmail('resume@example.com');
    await screen.findByRole('heading', { name: /credits added/i });

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open signup/i }));

    // Still on 'granted' — no re-fetch, no email step shown.
    expect(await screen.findByRole('heading', { name: /credits added/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /email address/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reopening after a terminal step (done) resets to a fresh email step', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ customerId: 'cust_fresh' }));
    vi.stubGlobal('fetch', fetchMock);

    const user = await openAndSubmitEmail('fresh@example.com');
    await screen.findByRole('heading', { name: /credits added/i });
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /skip, start with/i }));
    await screen.findByRole('link', { name: /log in to your portal/i });

    await user.click(screen.getByRole('button', { name: /close/i }));
    await user.click(screen.getByRole('button', { name: /open signup/i }));

    expect(await screen.findByRole('textbox', { name: /email address/i })).toHaveValue('');
    expect(screen.getByRole('button', { name: /claim credits/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log in to your portal/i })).not.toBeInTheDocument();
  });

  it('guards startCheckout against a rapid double-click: only one /api/checkout call fires', async () => {
    const signupFetch = vi.fn(async () => jsonResponse({ customerId: 'cust_double' }));
    vi.stubGlobal('fetch', signupFetch);

    const user = await openAndSubmitEmail('double@example.com');
    await screen.findByRole('heading', { name: /credits added/i });
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('button', { name: /double my credits/i });

    let resolveCheckout: (() => void) | undefined;
    const checkoutFetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveCheckout = () => resolve(jsonResponse({ url: 'https://checkout.stripe.com/x', intentId: 'intent_x' }));
        }),
    );
    vi.stubGlobal('fetch', checkoutFetch);

    const checkoutButton = screen.getByRole('button', { name: /double my credits/i });
    // Two SYNCHRONOUS clicks, back to back with no await in between — before
    // React has re-rendered the `disabled` attribute from the first click's
    // state update. This is exactly the race `state.submitting`/`disabled`
    // alone can't catch; only the ref-based in-flight guard can.
    act(() => {
      fireEvent.click(checkoutButton);
      fireEvent.click(checkoutButton);
    });

    expect(checkoutFetch).toHaveBeenCalledTimes(1);
    resolveCheckout?.();
  });

  it('deep-link return (?pay=success) verifies -> paid, showing the portal login button', async () => {
    window.sessionStorage.setItem('vd_intent', 'intent_abc');
    window.sessionStorage.setItem('vd_customer_id', 'cust_abc');
    window.history.pushState({}, '', '/?pay=success');

    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('/api/verify?intent=intent_abc');
      return jsonResponse({ status: 'paid' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness />);

    const portalLink = await screen.findByRole('link', { name: /log in to your portal/i });
    expect(portalLink).toHaveAttribute('href', `${siteConfig.portalUrl}/login`);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Terminal answer (paid) — both stashed keys are cleared so a stale
    // back-button/bookmark revisit to ?pay=success can't replay the poll.
    expect(window.sessionStorage.getItem('vd_intent')).toBeNull();
    expect(window.sessionStorage.getItem('vd_customer_id')).toBeNull();
  });

  it('stops polling when the modal is closed mid-verification', async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem('vd_intent', 'intent_close');
    window.history.pushState({}, '', '/?pay=success');

    const fetchMock = vi.fn(async () => jsonResponse({ status: 'pending' }));
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Close mid-poll.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Advance well past several would-be poll intervals — no further fetches.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing on ?pay=success boot when sessionStorage has no stashed intent (also covers: a stale back-button/bookmark revisit after a terminal answer already cleared vd_intent)', async () => {
    window.history.pushState({}, '', '/?pay=success');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('?pay=cancelled returns to the upsell step with a "no charge made" note', async () => {
    window.sessionStorage.setItem('vd_customer_id', 'cust_recovered');
    window.history.pushState({}, '', '/?pay=cancelled');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness />);

    expect(await screen.findByText(/no charge was made/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /double my credits/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip, start with/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    // vd_customer_id is KEPT (not cleared) here — it's exactly what lets
    // "Double my credits" retry checkout after a cancelled Stripe visit.
    expect(window.sessionStorage.getItem('vd_customer_id')).toBe('cust_recovered');
  });

  it('polls verify every 2.5s up to 8 tries while pending, then shows a still-confirming state with the portal button', async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem('vd_intent', 'intent_poll');
    window.history.pushState({}, '', '/?pay=success');

    const fetchMock = vi.fn(async () => jsonResponse({ status: 'pending' }));
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness />);

    // Initial check fires on mount.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 7 more polls at 2.5s apart => 8 total attempts.
    for (let i = 0; i < 7; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(8);

    expect(screen.getByText(/still confirming/i)).toBeInTheDocument();
    const portalLink = screen.getByRole('link', { name: /log in to your portal/i });
    expect(portalLink).toHaveAttribute('href', `${siteConfig.portalUrl}/login`);

    // No further polling once capped.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('resolves to paid mid-poll without waiting for all 8 attempts', async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem('vd_intent', 'intent_paid_later');
    window.history.pushState({}, '', '/?pay=success');

    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      return jsonResponse({ status: call < 3 ? 'pending' : 'paid' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/you're in/i)).toBeInTheDocument();
  });
});

describe('showreel panel crop (round-2 owner fix)', () => {
  afterEach(() => cleanup());

  it('sets object-position so the m1 clip keeps her face in frame in the tall right panel', () => {
    const flow = { open: true, step: 'email', email: '', submitting: false, retryTo: 'email', verifyAttempts: 0, stillConfirming: false } as const;
    render(
      <SignupFlow
        open
        step="email"
        state={flow}
        onClose={() => {}}
        onSubmitEmail={() => {}}
        onContinueToUpsell={() => {}}
        onStartCheckout={() => {}}
        onSkipUpsell={() => {}}
        onRetry={() => {}}
      />,
    );

    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.loop).toBe(true);
    expect(video.style.objectPosition).toBe('center 18%');
  });
});
