// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Isolated from test/component/signupFlow.test.tsx on purpose: this file
 * mocks `siteConfig.turnstileSiteKey` to a non-empty value for every test in
 * it, which would otherwise leak into (and break) the default-disabled
 * assertions in the main SignupFlow test suite.
 */
vi.mock('../../src/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config')>();
  return {
    ...actual,
    siteConfig: { ...actual.siteConfig, turnstileSiteKey: 'test-sitekey-123' },
  };
});

import { SignupFlow, useSignupFlow } from '../../src/components/SignupFlow';

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

describe('SignupFlow with Turnstile enabled', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    window.turnstile = undefined;
  });

  it('renders the widget explicitly, captures the token via the render callback, and includes it in the signup body', async () => {
    const renderMock = vi.fn((_container: HTMLElement | string, options: { callback?: (token: string) => void }) => {
      // Mirrors a widget that resolves non-interactively (managed mode) —
      // the callback fires immediately with a token.
      options.callback?.('tok');
      return 'widget-1';
    });
    window.turnstile = { render: renderMock, remove: vi.fn(), reset: vi.fn() };

    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('/api/signup');
      expect(JSON.parse(init.body as string)).toEqual({ email: 'user@example.com', turnstileToken: 'tok' });
      return jsonResponse({ customerId: 'cust_ts' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /open signup/i }));

    expect(renderMock).toHaveBeenCalledTimes(1);
    const widgetDiv = document.querySelector('.cf-turnstile');
    expect(widgetDiv).toHaveAttribute('data-sitekey', 'test-sitekey-123');
    expect(widgetDiv).toHaveAttribute('data-action', 'turnstile-spin-v2');
    expect(widgetDiv).toHaveAttribute('data-theme', 'dark');

    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /claim credits/i }));

    expect(await screen.findByRole('heading', { name: /credits added/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('holds submission until the widget resolves a token (button stays disabled)', async () => {
    const pendingRenderMock = vi.fn(() => 'widget-2');
    window.turnstile = { render: pendingRenderMock, remove: vi.fn(), reset: vi.fn() };
    vi.stubGlobal('fetch', vi.fn());

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /open signup/i }));

    expect(pendingRenderMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /claim credits/i })).toBeDisabled();
  });
});
