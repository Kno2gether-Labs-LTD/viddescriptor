// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { ImageToVideo } from '../../src/components/ImageToVideo';
import { MEDIA } from '../../src/lib/media';

afterEach(() => {
  cleanup();
});

/**
 * Round-2 owner fix: the before/after wipe used to fake "before" with a
 * grayscale CSS filter over the SAME video. It's now the ACTUAL still image
 * the clip was generated from, shown as a real <img>, clipped to the slider
 * position — no filter trick.
 */
describe('ImageToVideo — honest before/after slider', () => {
  it('shows the real still image (not a filtered video) as the BEFORE layer, and the real video as the AFTER layer', () => {
    const { container } = render(<ImageToVideo onOpenFlow={() => {}} />);

    const stillImg = container.querySelector('img[src="/media/b1-still.jpg"]');
    expect(stillImg).toBeInTheDocument();

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', MEDIA.b1.src);
    expect((video as HTMLVideoElement).loop).toBe(true);

    // The old implementation applied a grayscale/contrast/brightness filter
    // as the "before" trick — that must be gone.
    const clip = screen.getByTestId('b1-still-clip');
    expect(clip.style.backdropFilter).toBe('');

    expect(screen.getByText(/before · still frame/i)).toBeInTheDocument();
    expect(screen.getByText(/after · finished shot/i)).toBeInTheDocument();
  });

  it('dragging the slider resizes the still-image clip width to match', () => {
    render(<ImageToVideo onOpenFlow={() => {}} />);

    const slider = screen.getByLabelText(/drag to compare/i);
    const clip = screen.getByTestId('b1-still-clip');

    fireEvent.change(slider, { target: { value: '70' } });
    expect(clip.style.width).toBe('70%');

    fireEvent.change(slider, { target: { value: '20' } });
    expect(clip.style.width).toBe('20%');
  });

  it('scales the still image back up inside its narrower clip wrapper so it reads as one continuous frame', () => {
    render(<ImageToVideo onOpenFlow={() => {}} />);

    const slider = screen.getByLabelText(/drag to compare/i);
    fireEvent.change(slider, { target: { value: '50' } });

    const stillImg = document.querySelector('img[src="/media/b1-still.jpg"]') as HTMLImageElement;
    // At 50% clip width, the image must be scaled to 200% to still span the
    // full container width under the wipe.
    expect(stillImg.style.width).toBe('200%');
  });
});
