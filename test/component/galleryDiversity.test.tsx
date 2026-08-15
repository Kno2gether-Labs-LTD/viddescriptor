// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, within, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { Gallery } from '../../src/components/Gallery';
import { MEDIA } from '../../src/lib/media';

// Load the *real* stylesheet into jsdom so `getComputedStyle`/`toBeVisible`
// reflect the actual cascade the browser sees — including the `.hc-
// gallery-more-row { display: grid }` rule that regressed the `hidden`
// attribute (see the `[hidden] { display: none !important; }` fix in
// styles.css).
beforeAll(() => {
  const css = fs.readFileSync(path.resolve(__dirname, '../../src/styles.css'), 'utf-8');
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);
});

afterEach(() => {
  cleanup();
});

describe('Gallery — wave-2 diversity retile', () => {
  it('renders 6 tiles pulling from diverse wave-2 subjects, with g4 kept as the one wave-1 (product) tile', () => {
    const { container } = render(<Gallery />);
    const gallery = within(document.getElementById('gallery')!);
    // The "more generations" expander row stays mounted-but-hidden (see the
    // aria-controls test below), so scope this to the main 6-tile grid.
    const more = document.getElementById('gallery-more-generations');
    const videos = Array.from(container.querySelectorAll('video')).filter((v) => !more!.contains(v));
    expect(videos.length).toBe(6);

    const srcs = videos.map((v) => v.getAttribute('src'));
    expect(srcs).toContain(MEDIA.w2expressions.src);
    expect(srcs).toContain(MEDIA.w2festival.src);
    expect(srcs).toContain(MEDIA.w2got.src);
    expect(srcs).toContain(MEDIA.g4.src);
    expect(srcs).toContain(MEDIA.w2baby.src);
    expect(srcs).toContain(MEDIA.w2emotional.src);

    // Short quoted prompt-style captions, not the old recipe-name subcaptions.
    expect(gallery.getByText('"five emotions, one take, no cuts"')).toBeInTheDocument();
    expect(gallery.getByText('"festival stage, six shots"')).toBeInTheDocument();
    expect(gallery.getByText('"battle at dawn, trailer cut"')).toBeInTheDocument();
    expect(gallery.getByText('"product hero, macro, studio light"')).toBeInTheDocument();
    expect(gallery.getByText("\"her first steps, mother's POV\"")).toBeInTheDocument();
    expect(gallery.getByText('"field hospital, one take"')).toBeInTheDocument();

    // No recipe-name subcaptions here anymore — that pairing moved to the
    // "One character. Every recipe." section.
    expect(gallery.queryByText('Impossible Transition')).not.toBeInTheDocument();
    expect(gallery.queryByText('Perform as my Character')).not.toBeInTheDocument();
    expect(gallery.queryByText('Caught Moment')).not.toBeInTheDocument();
  });

  it('every tile video loops', () => {
    const { container } = render(<Gallery />);
    const videos = Array.from(container.querySelectorAll('video'));
    expect(videos.length).toBeGreaterThan(0);
    videos.forEach((video) => {
      expect((video as HTMLVideoElement).loop).toBe(true);
    });
  });

  it('"More generations" starts collapsed and expands to reveal 3 more tiles', () => {
    const { container } = render(<Gallery />);
    const button = document.querySelector('button[aria-controls="gallery-more-generations"]') as HTMLButtonElement;
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // The expander target stays mounted (so aria-controls always resolves
    // to a real element) but is hidden via the `hidden` attribute while
    // collapsed, rather than being absent from the DOM.
    const more = document.getElementById('gallery-more-generations');
    expect(more).toBeInTheDocument();
    expect(more).toHaveProperty('hidden', true);
    expect(container.querySelectorAll('video').length).toBe(9);

    // Collapsed: `.hc-gallery-more-row` sets `display: grid`, which would
    // silently win over the `hidden` attribute's UA default without the
    // `[hidden] { display: none !important; }` guard — assert the *computed*
    // style, not just the DOM property, so a regression there is caught.
    expect(more).not.toBeVisible();
    expect(more).toHaveStyle({ display: 'none' });

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(more).toHaveProperty('hidden', false);
    // Expanded: the panel is back in the layout (participating, not just
    // present in the DOM) at its aspect-aware grid.
    expect(more).toBeVisible();
    expect(more).toHaveStyle({ display: 'grid' });

    const moreSrcs = Array.from(more!.querySelectorAll('video')).map((v) => v.getAttribute('src'));
    expect(moreSrcs).toEqual([MEDIA.showcaseAerial.src, MEDIA.emberCity.src, MEDIA.rainGlass.src]);
    expect(container.querySelectorAll('video').length).toBe(9);

    expect(within(more!).getByText('"sunrise over the range, one prompt"')).toBeInTheDocument();

    Array.from(more!.querySelectorAll('video')).forEach((video) => {
      expect((video as HTMLVideoElement).loop).toBe(true);
    });
  });

  it('the expander row is aspect-aware: the two 16:9 tiles keep their own aspect box, the 9:16 tile fills its spanned cell instead of forcing a uniform grid height', () => {
    const { container } = render(<Gallery />);
    const button = document.querySelector('button[aria-controls="gallery-more-generations"]') as HTMLButtonElement;
    fireEvent.click(button);

    const more = document.getElementById('gallery-more-generations')!;
    // Aspect-aware masonry layout, not the uniform 6-col grid used elsewhere.
    expect(more.className).toContain('hc-gallery-more-row');

    const videos = Array.from(more.querySelectorAll('video')) as HTMLVideoElement[];
    const [aerial, ember, glass] = videos;

    // Landscape tiles: each keeps its own 16:9 box via inline aspect-ratio,
    // and is NOT the row-spanning "fill" tile.
    expect(aerial!.style.aspectRatio).toBe('16/9');
    expect(ember!.style.aspectRatio).toBe('16/9');
    expect(aerial!.closest('[class*="hc-gallery-more-a"]')).toBeTruthy();
    expect(ember!.closest('[class*="hc-gallery-more-b"]')).toBeTruthy();

    // Portrait tile: no inline aspect-ratio (that would fight the CSS class
    // that fills the spanned cell on desktop and reverts to 9/16 on mobile),
    // sits in the dedicated spanning column, and carries the fill video class.
    expect(glass!.style.aspectRatio).toBe('');
    expect(glass!.className).toContain('hc-gallery-more-c-video');
    expect(glass!.closest('[class*="hc-gallery-more-c"]')).toBeTruthy();

    // None of the three use the uniform grid's column-span mechanism.
    Array.from(container.querySelectorAll('#gallery-more-generations > div')).forEach((el) => {
      expect((el as HTMLElement).style.gridColumn).toBe('');
    });
  });
});
