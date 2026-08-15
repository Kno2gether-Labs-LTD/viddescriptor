// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * `siteConfig` is a build-time singleton (frozen at module load from
 * `import.meta.env`), so exercising both the empty-default and
 * JSON-provided-quotes branches of Compare's testimonial gate in the same
 * file needs the config module mocked with a mutable object Compare reads
 * fresh on every render — see src/config.ts `testimonials` field.
 */
const configState: { testimonials: { quote: string; attribution: string }[] } = {
  testimonials: [],
};

vi.mock('../../src/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config')>();
  return {
    ...actual,
    siteConfig: new Proxy(actual.siteConfig, {
      get(target, prop, receiver) {
        if (prop === 'testimonials') return configState.testimonials;
        return Reflect.get(target, prop, receiver);
      },
    }),
  };
});

const { Compare } = await import('../../src/components/Compare');

afterEach(() => {
  cleanup();
  configState.testimonials = [];
});

describe('Compare testimonials (siteConfig.testimonials-driven)', () => {
  it('renders no testimonial cards when siteConfig.testimonials is empty (the default)', () => {
    configState.testimonials = [];
    const { container } = render(<Compare />);
    expect(container.querySelector('[data-testid="testimonials"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="testimonial-card"]')).not.toBeInTheDocument();
  });

  it('renders a testimonial card for every owner-supplied quote in siteConfig.testimonials', () => {
    configState.testimonials = [
      { quote: 'Cut our production time in half.', attribution: 'A REAL CUSTOMER' },
      { quote: 'Worth every credit.', attribution: 'ANOTHER REAL CUSTOMER' },
    ];
    const { container } = render(<Compare />);

    expect(container.querySelector('[data-testid="testimonials"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="testimonial-card"]').length).toBe(2);
    expect(screen.getByText('Cut our production time in half.')).toBeInTheDocument();
    expect(screen.getByText('A REAL CUSTOMER')).toBeInTheDocument();
    expect(screen.getByText('Worth every credit.')).toBeInTheDocument();
    expect(screen.getByText('ANOTHER REAL CUSTOMER')).toBeInTheDocument();
  });
});
