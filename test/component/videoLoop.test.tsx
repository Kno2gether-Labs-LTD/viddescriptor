// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import App from '../../src/App';

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
});

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * Page-wide regression guard (round-2 owner directive): every <video> on
 * the page — including ones that only mount later, like the entry-overlay
 * popup and the signup-flow modal — must loop. This is a structural
 * assertion over the fully-mounted DOM, not a spot check of one component.
 */
describe('every rendered video loops', () => {
  it('holds for the static page (hero wall, gallery, character-lock, image→video, recipes)', () => {
    const { container } = render(<App />);
    const videos = Array.from(container.querySelectorAll('video'));
    expect(videos.length).toBeGreaterThan(0);
    videos.forEach((video) => {
      expect((video as HTMLVideoElement).loop, `video src=${video.getAttribute('src')} is missing loop`).toBe(true);
    });
  });

  it('holds once the late-mounting entry-overlay popup and signup-flow modal are open', () => {
    vi.useFakeTimers();
    const { container } = render(<App />);

    act(() => {
      vi.advanceTimersByTime(45000);
    });
    expect(screen.getByRole('dialog', { name: /free credits offer/i })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /claim my credits/i }));
    });
    expect(screen.getByRole('dialog', { name: /signup/i })).toBeInTheDocument();

    const videos = Array.from(container.querySelectorAll('video'));
    expect(videos.length).toBeGreaterThan(0);
    videos.forEach((video) => {
      expect((video as HTMLVideoElement).loop, `video src=${video.getAttribute('src')} is missing loop`).toBe(true);
    });
  });
});
