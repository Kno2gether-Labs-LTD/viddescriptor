// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Upsell safety net (see docs/notes/upsell-grant.md): until the platform-side
 * payment-link webhook actually grants `features.initialAiCredits`, a
 * white-label deploy MUST ship with `VITE_UPSELL_CREDITS=0` so the "double my
 * credits" step never shows an offer that silently pays out nothing. This
 * file mocks `siteConfig` directly (rather than relying on env at test-run
 * time) so it exercises that `upsell.credits <= 0` branch in isolation,
 * without disturbing the normal-upsell-flow assertions in signupFlow.test.tsx.
 */
vi.mock('../../src/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config')>();
  return {
    ...actual,
    siteConfig: { ...actual.siteConfig, upsell: { ...actual.siteConfig.upsell, credits: 0 } },
  };
});

const { SignupFlow, useSignupFlow } = await import('../../src/components/SignupFlow');
const { siteConfig } = await import('../../src/config');

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

describe('SignupFlow with siteConfig.upsell.credits <= 0', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
  });

  it('skips the upsell step entirely: granted -> done directly, no checkout call ever fires', async () => {
    expect(siteConfig.upsell.credits).toBe(0);

    const fetchMock = vi.fn(async () => jsonResponse({ customerId: 'cust_no_upsell' }));
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /open signup/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'no-upsell@example.com');
    await user.click(screen.getByRole('button', { name: /claim credits/i }));

    await screen.findByRole('heading', { name: /credits added/i });
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Straight to 'done' — never shows the upsell offer or its CTA.
    const portalLink = await screen.findByRole('link', { name: /log in to your portal/i });
    expect(portalLink).toHaveAttribute('href', `${siteConfig.portalUrl}/login`);
    expect(screen.queryByRole('button', { name: /double my credits/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();

    // Only the signup call happened — checkout was never invoked.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Same session cleanup as an explicit skip.
    expect(window.sessionStorage.getItem('vd_customer_id')).toBeNull();
  });
});
