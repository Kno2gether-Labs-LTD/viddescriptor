// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { Hero } from '../../src/components/Hero';

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Hero — config-driven copy + accent placement', () => {
  beforeEach(() => stubMatchMedia(false));

  it('renders the three configured lines with the accent word highlighted only at its first occurrence', () => {
    const { container } = render(<Hero onOpenFlow={() => {}} />);
    const heading = screen.getByRole('heading', { level: 1 });
    // Default config: line1 "Describe your film." carries the only "film"
    // occurrence — the accent span should wrap exactly that word.
    expect(heading).toHaveTextContent(/describe your film\.\s*get it back\s*in minutes\./i);

    const accentSpans = Array.from(container.querySelectorAll('h1 span')).filter(
      (el) => (el as HTMLElement).style.color === 'var(--color-accent)',
    );
    expect(accentSpans).toHaveLength(1);
    expect(accentSpans[0]).toHaveTextContent('film');
  });

  it('renders the configured subtext beneath the headline', () => {
    render(<Hero onOpenFlow={() => {}} />);
    expect(
      screen.getByText(/describe the shot in a sentence — a finished, film-grade video comes back/i),
    ).toBeInTheDocument();
  });
});

describe('Hero — typing effect (line 3, config-driven length)', () => {
  beforeEach(() => stubMatchMedia(false));

  it('has not started typing before the configured start delay', () => {
    vi.useFakeTimers();
    render(<Hero onOpenFlow={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(1000); // < TYPE_START_DELAY_MS (1400ms)
    });
    const typedNode = document.querySelector('h1 span span') as HTMLElement;
    // Before the delay elapses, the clip-path still masks the whole line —
    // `inset(..., 100%, ...)` hides everything.
    expect(typedNode.style.clipPath).toContain('100%');
  });

  it('finishes typing the full configured line 3 well before the fallback fires', () => {
    vi.useFakeTimers();
    render(<Hero onOpenFlow={() => {}} />);
    act(() => {
      // 1400ms start delay + "in minutes.".length (11) * 62ms ≈ 2082ms.
      vi.advanceTimersByTime(2200);
    });
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/in minutes\./i);
    const typedNode = document.querySelector('h1 span span') as HTMLElement;
    expect(typedNode.style.clipPath).toBe('none');
  });
});

describe('Hero — premium entrance staging', () => {
  beforeEach(() => stubMatchMedia(false));

  it('starts the video wall at higher opacity with a mostly-transparent scrim, headline hidden', () => {
    vi.useFakeTimers();
    const { container } = render(<Hero onOpenFlow={() => {}} />);

    const wall = container.querySelector('div[style*="grid-template-columns"]') as HTMLElement;
    expect(wall.style.opacity).toBe('0.85');

    const headlineWrap = screen.getByRole('heading', { level: 1 }).closest('div') as HTMLElement;
    expect(headlineWrap.style.opacity).toBe('0');
    expect(headlineWrap.style.transform).toBe('translateY(20px)');
  });

  it('eases the wall/scrim to final values and rises the headline in once stage B starts (~1.2s)', () => {
    vi.useFakeTimers();
    const { container } = render(<Hero onOpenFlow={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    const wall = container.querySelector('div[style*="grid-template-columns"]') as HTMLElement;
    expect(wall.style.opacity).toBe('0.62');

    const headlineWrap = screen.getByRole('heading', { level: 1 }).closest('div') as HTMLElement;
    expect(headlineWrap.className).toContain('hc-rise');
  });

  it('staggers the prompt box and stats row in after the headline, 150ms apart', () => {
    vi.useFakeTimers();
    render(<Hero onOpenFlow={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // The prompt box's animation-delay is staggered a step after the
    // headline's (which has no delay).
    const promptWrap = screen.getByLabelText('Prompt').closest('div')!.parentElement!.parentElement!;
    expect(promptWrap.className).toContain('hc-rise');
    expect(promptWrap.style.animationDelay).toBe('150ms');

    const statsHeading = screen.getByText('FREE CREDITS ON SIGNUP').closest('div')!.parentElement!;
    expect(statsHeading.className).toContain('hc-rise');
    expect(statsHeading.style.animationDelay).toBe('300ms');
  });
});

describe('Hero — prefers-reduced-motion', () => {
  it('skips the staged reveal and renders the final state immediately, with no typing animation', () => {
    stubMatchMedia(true);
    const { container } = render(<Hero onOpenFlow={() => {}} />);

    const wall = container.querySelector('div[style*="grid-template-columns"]') as HTMLElement;
    expect(wall.style.opacity).toBe('0.62');

    const headlineWrap = screen.getByRole('heading', { level: 1 }).closest('div') as HTMLElement;
    expect(headlineWrap.className ?? '').not.toContain('hc-rise');
    expect(headlineWrap.style.opacity).toBe('');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/in minutes\./i);
    const typedNode = document.querySelector('h1 span span') as HTMLElement;
    expect(typedNode.style.clipPath).toBe('none');
  });
});
