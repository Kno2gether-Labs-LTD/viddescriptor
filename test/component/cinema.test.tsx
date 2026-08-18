// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { Cinema } from '../../src/components/Cinema';
import { MEDIA } from '../../src/lib/media';

afterEach(() => {
  cleanup();
});

describe('Cinema — Director agent showcase', () => {
  it('renders under the #cinema anchor with the headline and three real film tiles', () => {
    const onOpenFlow = vi.fn();
    const { container } = render(<Cinema onOpenFlow={onOpenFlow} />);
    const section = within(document.getElementById('cinema')!);

    expect(section.getByRole('heading', { name: /a film/i })).toBeInTheDocument();

    expect(section.getByText('The Paper Boat')).toBeInTheDocument();
    expect(section.getByText('The Lighthouse Keeper')).toBeInTheDocument();
    expect(section.getByText('The Cave on the Mountainside')).toBeInTheDocument();

    const videos = Array.from(container.querySelectorAll('video'));
    expect(videos.length).toBe(3);
    const srcs = videos.map((v) => v.getAttribute('src'));
    expect(srcs).toEqual([MEDIA.filmPaperBoat.src, MEDIA.filmLighthouse.src, MEDIA.filmCave.src]);
  });

  it('every film clip loops, is muted, and has a poster', () => {
    const { container } = render(<Cinema onOpenFlow={vi.fn()} />);
    Array.from(container.querySelectorAll('video')).forEach((video) => {
      const el = video as HTMLVideoElement;
      expect(el.loop).toBe(true);
      expect(el.muted).toBe(true);
      expect(el.getAttribute('poster')).toBeTruthy();
    });
  });

  it('shows the 4-step "how the Director works" strip, with sheets and contact-sheet artefacts', () => {
    const { container } = render(<Cinema onOpenFlow={vi.fn()} />);
    const section = within(document.getElementById('cinema')!);

    expect(section.getByText('Plan the scenes')).toBeInTheDocument();
    expect(section.getByText('Cast from sheets')).toBeInTheDocument();
    expect(section.getByText('Render takes with sound')).toBeInTheDocument();
    expect(section.getByText('Assemble the cut')).toBeInTheDocument();
    expect(section.getByText('01')).toBeInTheDocument();
    expect(section.getByText('02')).toBeInTheDocument();
    expect(section.getByText('03')).toBeInTheDocument();
    expect(section.getByText('04')).toBeInTheDocument();

    expect(container.querySelector(`img[src="${MEDIA.filmSheetBoat.src}"]`)).toBeInTheDocument();
    expect(container.querySelector(`img[src="${MEDIA.filmSheetDuck.src}"]`)).toBeInTheDocument();
    expect(container.querySelector(`img[src="${MEDIA.filmContact.src}"]`)).toBeInTheDocument();
    expect(container.querySelector(`img[src="${MEDIA.filmStoryboard.src}"]`)).toBeInTheDocument();
  });

  it('never quotes credit prices, render times, or provider/model names', () => {
    const { container } = render(<Cinema onOpenFlow={vi.fn()} />);
    const text = (container.textContent ?? '').toLowerCase();
    // The footnote legitimately says "same credits" (no number attached) —
    // only a priced/numbered credit amount is disallowed.
    expect(text).not.toMatch(/\d+\s*credits?/);
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toMatch(/openai|anthropic|claude(?!\scode)|gpt|sora|runway|kling|veo/);
  });

  it('the CTA button opens the signup flow', () => {
    const onOpenFlow = vi.fn();
    const { getByRole } = render(<Cinema onOpenFlow={onOpenFlow} />);
    getByRole('button', { name: /make a film free/i }).click();
    expect(onOpenFlow).toHaveBeenCalledTimes(1);
  });
});
