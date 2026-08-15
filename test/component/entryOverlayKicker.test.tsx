// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * EntryOverlay's kicker line must never imply an event that may not exist
 * (round-1 review fix). It has two truthful branches, both exercised here
 * directly against the component (not through App) so each can control
 * `siteConfig.offerEndsAt` independently via a per-test config mock.
 */

afterEach(() => {
  cleanup();
  vi.doUnmock('../../src/config');
  vi.resetModules();
});

describe('EntryOverlay kicker — truth-rule branches', () => {
  it('reads "FREE START · N CREDITS" (no event language) when offerEndsAt is unset', async () => {
    vi.doMock('../../src/config', async () => {
      const actual = await vi.importActual<typeof import('../../src/config')>('../../src/config');
      return { ...actual, siteConfig: actual.buildConfig({}) };
    });
    const { EntryOverlay } = await import('../../src/components/EntryOverlay');

    const { container } = render(<EntryOverlay visible onOpenFlow={() => {}} onClose={() => {}} />);

    expect(screen.getByText(/free start · 300 credits/i)).toBeInTheDocument();
    expect(screen.queryByText(/launch week/i)).not.toBeInTheDocument();

    // Screen-reader users get the same honesty: no aria-label anywhere in
    // this render (default config, no countdown) may say "launch week" —
    // covers the dialog's own aria-label, now "Free credits offer".
    const launchWeekAriaLabels = Array.from(container.querySelectorAll('[aria-label]')).filter((el) =>
      /launch week/i.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(launchWeekAriaLabels).toHaveLength(0);
  });

  it('reads "LIMITED OFFER · ENDS IN {countdown}" when offerEndsAt is set to a future date', async () => {
    vi.doMock('../../src/config', async () => {
      const actual = await vi.importActual<typeof import('../../src/config')>('../../src/config');
      return { ...actual, siteConfig: actual.buildConfig({ VITE_OFFER_ENDS_AT: '2099-01-01T00:00:00Z' }) };
    });
    const { EntryOverlay } = await import('../../src/components/EntryOverlay');

    render(<EntryOverlay visible onOpenFlow={() => {}} onClose={() => {}} />);

    expect(screen.getByText(/limited offer · ends in/i)).toBeInTheDocument();
    expect(screen.queryByText(/free start/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/launch week/i)).not.toBeInTheDocument();
  });
});
