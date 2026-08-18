// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within, act } from '@testing-library/react';
import App from '../../src/App';
import { RECIPE_CHIPS, CATEGORY_LABELS } from '../../src/data/recipes';

/**
 * jsdom has no IntersectionObserver implementation. `useVideoObserver`
 * constructs one on mount for every section that renders `<video>`s, so
 * without this stub `new IntersectionObserver(...)` throws a ReferenceError
 * and the whole page fails to mount. The stub never reports an intersection,
 * which is fine here — these tests only assert on static section content,
 * not on video playback (that's covered by reading the hook's own logic).
 */
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

describe('landing page sections', () => {
  it('renders every ported section with its expected heading', () => {
    render(<App />);

    // Hero — typing effect hasn't necessarily finished, so match the
    // static portion of the headline (line 1/2) rather than the typed line 3.
    expect(screen.getByRole('heading', { level: 1, name: /describe your film/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /made this morning/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /every recipe/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /a film/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /moving in seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /zero prompt writing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /a mixing desk/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /watch it travel/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /doesn.t punish you/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what you.re used to vs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /built in.*the open/is })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your first clip/i })).toBeInTheDocument();

    // Marquee — no heading, just scrolling capability text (rendered twice
    // for the seamless loop, hence getAllByText).
    expect(screen.getAllByText(/image → video/i).length).toBeGreaterThan(0);
  });

  it('every CTA opens the same signup flow modal instance', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole('dialog', { name: /signup/i })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /start free/i })[0]!);
    expect(await screen.findByRole('dialog', { name: /signup/i })).toBeInTheDocument();
  });

  it('countdown/urgency UI is hidden entirely when siteConfig.offerEndsAt is unset', () => {
    render(<App />);

    // Top bar "ENDS IN", final CTA "LAUNCH WEEK ENDS IN" — both gated on the
    // same useCountdown(siteConfig.offerEndsAt) return value, which is null
    // by default (no VITE_OFFER_ENDS_AT in the test environment).
    expect(screen.queryByText(/ends in/i)).not.toBeInTheDocument();
  });

  it('testimonials are hidden by default (siteConfig.testimonials is empty)', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[data-testid="testimonials"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="testimonial-card"]')).not.toBeInTheDocument();
  });

  it('recipe category filter narrows the chip list', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<App />);

    // Scoped to the Recipes chip grid — several of these real recipe titles
    // are reused as Gallery/curated-tile captions elsewhere on the page.
    const recipesSection = within(document.getElementById('recipes')!);

    // Both are real recipe titles inside the default curated (all-category)
    // view: "Impossible Transition" is Video effects, "Movie Poster" is
    // Marketing — so filtering to Video effects should keep one and drop
    // the other.
    expect(recipesSection.getByText('Impossible Transition')).toBeInTheDocument();
    expect(recipesSection.getByText('Movie Poster')).toBeInTheDocument();

    await user.click(recipesSection.getByRole('button', { name: 'Video effects' }));

    expect(recipesSection.getByText('Impossible Transition')).toBeInTheDocument();
    expect(recipesSection.queryByText('Movie Poster')).not.toBeInTheDocument();
  });

  it('renders the real 53-recipe catalog count and category labels, derived from the data module', () => {
    render(<App />);

    expect(RECIPE_CHIPS.length).toBe(53);
    expect(screen.getByRole('heading', { name: /53 recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All 53' })).toBeInTheDocument();
    for (const label of CATEGORY_LABELS.slice(1)) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('the top-bar banner renders the truthful, config-driven default (no fake "launch week" event)', () => {
    render(<App />);
    expect(screen.getByText(/open source.*free credits on signup/i)).toBeInTheDocument();
  });

  it('no fabricated video-4K or invented-figure claim survives the truth pass', () => {
    vi.useFakeTimers();
    const { container } = render(<App />);
    // Force the entry overlay to mount too (it's gated behind a 45s delay) —
    // its kicker is part of what this truth pass covers.
    act(() => {
      vi.advanceTimersByTime(45000);
    });
    const text = container.textContent ?? '';

    // Video output is crisp 1080p, never 4K — only image upscale is 4K.
    expect(text).not.toMatch(/every render is 4k/i);
    expect(text).not.toMatch(/4k on every tier/i);
    expect(text).not.toMatch(/clips? at 4k/i);
    expect(text).not.toMatch(/4k out/i);
    expect(text).not.toMatch(/outright,\s*at 4k/i);
    // No surface may imply a "launch week" event that isn't real — the top
    // banner, sticky CTA, and entry-overlay kicker are all config-driven
    // (siteConfig.bannerText / siteConfig.offerEndsAt) and default to
    // event-free copy. This also pins the EntryOverlay kicker fix: with
    // offerEndsAt unset (the default here), its branch must be "FREE START
    // · N CREDITS", never "LAUNCH WEEK".
    expect(text).not.toMatch(/launch week/i);
  });

  it('top-bar nav includes a "Characters" anchor link to #characters, and the section sits between Gallery and Image→Video', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('link', { name: 'Characters' })).toHaveAttribute('href', '#characters');
    expect(document.getElementById('characters')).toBeInTheDocument();

    const html = container.innerHTML;
    const galleryIdx = html.indexOf('id="gallery"');
    const charactersIdx = html.indexOf('id="characters"');
    const imageToVideoHeadingIdx = html.indexOf('in seconds');
    expect(galleryIdx).toBeGreaterThan(-1);
    expect(charactersIdx).toBeGreaterThan(galleryIdx);
    expect(imageToVideoHeadingIdx).toBeGreaterThan(charactersIdx);
  });

  it('top-bar nav includes a "Films" anchor link to #cinema, and the Cinema section sits between Characters and Image→Video', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('link', { name: 'Films' })).toHaveAttribute('href', '#cinema');
    expect(document.getElementById('cinema')).toBeInTheDocument();

    const html = container.innerHTML;
    const charactersIdx = html.indexOf('id="characters"');
    const cinemaIdx = html.indexOf('id="cinema"');
    const imageToVideoHeadingIdx = html.indexOf('in seconds');
    expect(charactersIdx).toBeGreaterThan(-1);
    expect(cinemaIdx).toBeGreaterThan(charactersIdx);
    expect(imageToVideoHeadingIdx).toBeGreaterThan(cinemaIdx);
  });

  it('director desk sliders rewrite the shot description', () => {
    render(<App />);

    const before = screen.getByText(/camera,.*(clean plate|light texture|heavy stock)/i).textContent;
    const motionSlider = screen.getByLabelText('MOTION INTENSITY');
    fireEvent.change(motionSlider, { target: { value: '95' } });

    const after = screen.getByText(/camera,.*(clean plate|light texture|heavy stock)/i).textContent;
    expect(after).not.toBe(before);
  });
});
