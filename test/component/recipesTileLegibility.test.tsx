// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { Recipes } from '../../src/components/Recipes';

afterEach(() => {
  cleanup();
});

describe('Recipes — curated tiles', () => {
  it('no longer shows the amber duration label on the 4 curated tiles, but keeps the recipe-name title', () => {
    const { container } = render(<Recipes onOpenFlow={() => {}} />);
    // Curated-tile titles are the only recipe-name <span>s that sit inside a
    // <video>-containing <button> — the chip list below repeats some of the
    // same recipe names as plain rows, so scope to the curated grid buttons.
    const curatedTitles = Array.from(container.querySelectorAll('button video')).map(
      (video) => video.closest('button')!.querySelector('span')!.textContent,
    );
    expect(curatedTitles).toEqual(['Caught Moment', 'Talking-Head Ad', 'Logo Sting', 'Product Reveal']);

    const recipesSection = within(document.getElementById('recipes')!);
    expect(recipesSection.queryByText(/8s · one click/i)).not.toBeInTheDocument();
    expect(recipesSection.queryByText(/12s · one click/i)).not.toBeInTheDocument();
    expect(recipesSection.queryByText(/20s · one click/i)).not.toBeInTheDocument();
  });

  it('curated tile titles carry a strong bottom gradient and a text-shadow for legibility over bright frames', () => {
    render(<Recipes onOpenFlow={() => {}} />);
    const titleSpan = Array.from(document.querySelectorAll('span')).find((el) => el.textContent === 'Caught Moment')!;
    expect(titleSpan.style.textShadow).toBe('0 2px 12px rgba(0,0,0,.8)');

    const gradientDiv = titleSpan.parentElement as HTMLElement;
    expect(gradientDiv.style.background).toContain('rgba(10, 10, 9, 0.95)');
    expect(gradientDiv.style.background).toContain('40%');
  });
});
