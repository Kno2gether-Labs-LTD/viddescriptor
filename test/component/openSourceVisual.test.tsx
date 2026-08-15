// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.doUnmock('../../src/config');
  vi.resetModules();
});

describe('OpenSource — right column never empty', () => {
  it('shows a looping MEDIA.p1 video panel with the brand mark when stats are gated off (the default)', async () => {
    const { OpenSource } = await import('../../src/components/OpenSource');
    const { container } = render(<OpenSource />);

    const panel = container.querySelector('[data-testid="opensource-video-panel"]');
    expect(panel).toBeInTheDocument();

    const video = panel!.querySelector('video');
    expect(video).toBeInTheDocument();
    expect((video as HTMLVideoElement).loop).toBe(true);

    const mark = panel!.querySelector('img[src="/brand/mark.svg"]');
    expect(mark).toBeInTheDocument();
  });

  it('shows the stats grid instead of the video panel when showSampleSocialProof is true', async () => {
    vi.doMock('../../src/config', async () => {
      const actual = await vi.importActual<typeof import('../../src/config')>('../../src/config');
      return { ...actual, siteConfig: actual.buildConfig({ VITE_SHOW_SAMPLE_SOCIAL_PROOF: 'true' }) };
    });
    const { OpenSource } = await import('../../src/components/OpenSource');
    const { container, getByText } = render(<OpenSource />);

    expect(container.querySelector('[data-testid="opensource-video-panel"]')).not.toBeInTheDocument();
    expect(getByText('8.4k')).toBeInTheDocument();
  });
});
