// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, within, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { CharacterLock } from '../../src/components/CharacterLock';
import { MEDIA } from '../../src/lib/media';

// Load the real stylesheet so `getComputedStyle`/`toBeVisible` reflect the
// actual cascade (see the same fix + rationale in galleryDiversity.test.tsx).
beforeAll(() => {
  const css = fs.readFileSync(path.resolve(__dirname, '../../src/styles.css'), 'utf-8');
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);
});

afterEach(() => {
  cleanup();
});

describe('CharacterLock — owner-character-led, progressive disclosure', () => {
  it('renders under the #characters anchor with the header, body copy, and the Character Sheet still (step 1)', () => {
    const { container } = render(<CharacterLock />);
    const section = within(document.getElementById('characters')!);
    expect(section.getByRole('heading', { name: /every recipe/i })).toBeInTheDocument();

    const sheetImg = container.querySelector('img[src="/media/character-sheet.jpg"]');
    expect(sheetImg).toBeInTheDocument();
    expect(section.getByText(/character sheet · the recipe output that locks a face/i)).toBeInTheDocument();
  });

  it('shows exactly 3 consistency tiles on initial render (own6/own4/own3), each with a real recipe name + quote', () => {
    const { container } = render(<CharacterLock />);
    // The "more worlds" expander row stays mounted-but-hidden (see the
    // aria-controls tests below), so scope this to the featured row.
    const moreWorlds = document.getElementById('character-more-worlds');
    const videos = Array.from(container.querySelectorAll('video')).filter((v) => !moreWorlds!.contains(v));
    expect(videos.length).toBe(3);

    const srcs = videos.map((v) => v.getAttribute('src'));
    expect(srcs).toEqual([MEDIA.own6.src, MEDIA.own4.src, MEDIA.own3.src]);

    expect(container).toHaveTextContent('Impossible Transition');
    expect(container).toHaveTextContent('Effects Without the Budget');
    expect(container).toHaveTextContent('Caught Moment');
  });

  it('the expander button starts collapsed (aria-expanded=false) and the extra rows are hidden', () => {
    render(<CharacterLock />);
    const button = document.querySelector('button[aria-controls="character-more-worlds"]') as HTMLButtonElement;
    expect(button).toHaveAttribute('aria-expanded', 'false');
    // Stays mounted (so aria-controls always resolves to a real element)
    // but hidden via the `hidden` attribute while collapsed.
    const moreWorlds = document.getElementById('character-more-worlds');
    expect(moreWorlds).toBeInTheDocument();
    expect(moreWorlds).toHaveProperty('hidden', true);
    // Computed style, not just the DOM property — this element carries no
    // conflicting `display`-setting class today, but the assertion pins
    // that down so a future className addition can't quietly regress it.
    expect(moreWorlds).not.toBeVisible();
    expect(moreWorlds).toHaveStyle({ display: 'none' });
  });

  it('clicking the expander reveals the "more worlds" row and the "any character" row', () => {
    const { container } = render(<CharacterLock />);
    const button = document.querySelector('button[aria-controls="character-more-worlds"]') as HTMLButtonElement;

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const moreWorlds = document.getElementById('character-more-worlds');
    expect(moreWorlds).toBeInTheDocument();
    expect(moreWorlds).toHaveProperty('hidden', false);
    expect(moreWorlds).toBeVisible();

    const videos = Array.from(container.querySelectorAll('video'));
    // 3 featured + 3 more-worlds + 3 any-character = 9.
    expect(videos.length).toBe(9);

    const srcs = videos.map((v) => v.getAttribute('src'));
    expect(srcs).toEqual(
      expect.arrayContaining([
        MEDIA.own5.src,
        MEDIA.own2.src,
        MEDIA.own1.src,
        MEDIA.m1.src,
        MEDIA.g5.src,
        MEDIA.ownAlley.src,
      ]),
    );
    // b1 must NOT reappear here — it already stars in the ImageToVideo slider.
    expect(srcs).not.toContain(MEDIA.b1.src);

    expect(within(moreWorlds!).getByText('Change the World')).toBeInTheDocument();
    expect(within(moreWorlds!).getByText('Change the Location')).toBeInTheDocument();
    expect(within(moreWorlds!).getByText('Just There')).toBeInTheDocument();
    expect(within(moreWorlds!).getByText(/it works for any character/i)).toBeInTheDocument();
    expect(within(moreWorlds!).getByText('Perform as my Character')).toBeInTheDocument();
    expect(within(moreWorlds!).getByText('Establishing Shot of Anywhere')).toBeInTheDocument();
  });

  it('every rendered clip loops (the still image is exempt — it is not a video)', () => {
    const { container } = render(<CharacterLock />);
    const button = document.querySelector('button[aria-controls="character-more-worlds"]') as HTMLButtonElement;
    fireEvent.click(button);

    Array.from(container.querySelectorAll('video')).forEach((video) => {
      expect((video as HTMLVideoElement).loop).toBe(true);
    });
  });
});
