// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useVideoObserver } from '../../src/hooks/useVideoObserver';
import { CharacterLock } from '../../src/components/CharacterLock';

/**
 * jsdom has no IntersectionObserver implementation. This mock records every
 * element `.observe()`/`.unobserve()` is called with, per instance, so tests
 * can assert on exactly what the hook wired up — it never actually reports
 * an intersection.
 */
class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  observed = new Set<Element>();
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    IntersectionObserverMock.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  takeRecords() {
    return [];
  }
}

function Harness({ extraVideo }: { extraVideo: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useVideoObserver(ref);
  return (
    <div ref={ref}>
      <video data-testid="v1" muted loop playsInline preload="none" src="a.mp4" />
      {extraVideo && <video data-testid="v2" muted loop playsInline preload="none" src="b.mp4" />}
    </div>
  );
}

/** A late-mounting popup-style component, entirely outside the initial container render. */
function LateMountHarness({ mounted }: { mounted: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useVideoObserver(ref);
  return (
    <div ref={ref}>
      <div>static content, no video yet</div>
      {mounted && (
        <div>
          <video data-testid="popup-video" muted loop playsInline preload="none" src="popup.mp4" />
        </div>
      )}
    </div>
  );
}

/**
 * Mirrors how `App.tsx` wires the hook — a single `containerRef` on a div
 * that wraps every section, `CharacterLock` included. Regression guard for
 * the "clips never play" report: the observer container must actually wrap
 * the section, not sit next to it.
 */
function CharacterLockHarness() {
  const ref = useRef<HTMLDivElement>(null);
  useVideoObserver(ref);
  return (
    <div ref={ref}>
      <CharacterLock />
    </div>
  );
}

beforeEach(() => {
  IntersectionObserverMock.instances = [];
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
});

afterEach(() => {
  cleanup();
});

describe('useVideoObserver', () => {
  it('observes every video present at mount', () => {
    render(<Harness extraVideo={false} />);
    const instance = IntersectionObserverMock.instances[0]!;
    expect(instance.observed.size).toBe(1);
  });

  it('re-wires and observes a video mounted later via a MutationObserver on the container (e.g. EntryOverlay/SignupFlow popups)', async () => {
    const { rerender } = render(<LateMountHarness mounted={false} />);
    const instance = IntersectionObserverMock.instances[0]!;
    expect(instance.observed.size).toBe(0);

    rerender(<LateMountHarness mounted={true} />);

    // MutationObserver callbacks land as a microtask, not synchronously.
    await waitFor(() => {
      expect(instance.observed.size).toBe(1);
    });
  });

  it('unobserves a video that is removed from the container', async () => {
    const { rerender } = render(<Harness extraVideo={true} />);
    const instance = IntersectionObserverMock.instances[0]!;
    await waitFor(() => expect(instance.observed.size).toBe(2));

    rerender(<Harness extraVideo={false} />);

    await waitFor(() => expect(instance.observed.size).toBe(1));
  });

  it('force-mutes every observed video the same way the reference deck does', async () => {
    const { container } = render(<LateMountHarness mounted={true} />);
    const video = container.querySelector('video') as HTMLVideoElement;

    await waitFor(() => {
      expect(video.muted).toBe(true);
      expect(video.defaultMuted).toBe(true);
      expect(video.hasAttribute('muted')).toBe(true);
    });
  });

  it('observes every CharacterLock video — the initially-visible "featured" row AND the mounted-but-hidden "more worlds"/"any character" rows — so all of them get the play() call once scrolled into view, matching every other section', () => {
    const { container } = render(<CharacterLockHarness />);
    const instance = IntersectionObserverMock.instances[0]!;
    const videos = Array.from(container.querySelectorAll('video'));

    // 3 featured + 3 more-worlds + 3 any-character = 9, all observed even
    // though the latter two rows sit inside a `hidden` container at mount.
    expect(videos.length).toBe(9);
    videos.forEach((video) => {
      expect(instance.observed.has(video)).toBe(true);
    });
  });
});
