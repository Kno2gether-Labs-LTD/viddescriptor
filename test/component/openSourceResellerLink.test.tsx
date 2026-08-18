// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.doUnmock('../../src/config');
  vi.resetModules();
});

describe('OpenSource — AI Reseller Club secondary link', () => {
  it('renders the reseller-club link by default, pointed at the Skool community, opened in a new tab safely', async () => {
    const { OpenSource } = await import('../../src/components/OpenSource');
    const { container } = render(<OpenSource />);

    const link = container.querySelector('[data-testid="reseller-club-link"]');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://www.skool.com/voice-ai-mastery-5847');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('hides the link entirely when VITE_RESELLER_CLUB_URL is set to an empty string', async () => {
    vi.doMock('../../src/config', async () => {
      const actual = await vi.importActual<typeof import('../../src/config')>('../../src/config');
      return { ...actual, siteConfig: actual.buildConfig({ VITE_RESELLER_CLUB_URL: '' }) };
    });
    const { OpenSource } = await import('../../src/components/OpenSource');
    const { container } = render(<OpenSource />);

    expect(container.querySelector('[data-testid="reseller-club-link"]')).not.toBeInTheDocument();
  });
});
