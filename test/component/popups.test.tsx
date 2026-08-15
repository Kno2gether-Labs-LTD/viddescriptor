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

function setScrollY(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
}

/**
 * The scroll-percent calculation in App.tsx is
 * `scrollY / (documentElement.scrollHeight - innerHeight) * 100`. jsdom
 * doesn't compute real layout, so scrollHeight/innerHeight are stubbed here
 * to fixed values a test can reason about.
 */
function setScrollGeometry({ scrollHeight, innerHeight }: { scrollHeight: number; innerHeight: number }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true, writable: true });
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
});

beforeEach(() => {
  window.history.pushState({}, '', '/');
  setScrollY(0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('entry overlay', () => {
  it('appears 45s after mount when the signup flow has never been opened', () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(44999);
    });
    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole('dialog', { name: /free credits offer/i })).toBeInTheDocument();
  });

  it('does not appear if a CTA already opened the signup flow before the 45s mark', () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /start free/i })[0]!);
    });
    expect(screen.getByRole('dialog', { name: /signup/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(45000);
    });

    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();
  });

  it('"Just browsing" dismisses the overlay without opening the signup flow', () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(45000);
    });
    expect(screen.getByRole('dialog', { name: /free credits offer/i })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /just browsing/i }));
    });

    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /^signup$/i })).not.toBeInTheDocument();
  });

  it('appears as soon as the visitor scrolls past 60% of the page, before the 45s timer fires', () => {
    render(<App />);
    setScrollGeometry({ scrollHeight: 10000, innerHeight: 1000 });
    // scrollable = 10000 - 1000 = 9000; 59% of that is below the 60% trigger.
    setScrollY(9000 * 0.59);
    fireEvent.scroll(window);
    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();

    setScrollY(9000 * 0.6);
    fireEvent.scroll(window);

    expect(screen.getByRole('dialog', { name: /free credits offer/i })).toBeInTheDocument();
  });

  it('does not appear from scroll if a CTA already opened the signup flow', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /start free/i })[0]!);
    expect(screen.getByRole('dialog', { name: /signup/i })).toBeInTheDocument();

    setScrollGeometry({ scrollHeight: 10000, innerHeight: 1000 });
    setScrollY(9000);
    fireEvent.scroll(window);

    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();
  });

  it('the 45s timer no-ops once the scroll trigger has already fired the overlay (fires once, ever)', () => {
    vi.useFakeTimers();
    render(<App />);
    setScrollGeometry({ scrollHeight: 10000, innerHeight: 1000 });
    setScrollY(9000);
    act(() => {
      fireEvent.scroll(window);
    });
    expect(screen.getByRole('dialog', { name: /free credits offer/i })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /just browsing/i }));
    });
    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(45000);
    });
    expect(screen.queryByRole('dialog', { name: /free credits offer/i })).not.toBeInTheDocument();
  });
});

describe('exit intent', () => {
  it('opens the signup flow the first time the mouse leaves the top of the viewport', () => {
    render(<App />);

    expect(screen.queryByRole('dialog', { name: /signup/i })).not.toBeInTheDocument();

    fireEvent.mouseOut(document, { clientY: -1 });

    expect(screen.getByRole('dialog', { name: /signup/i })).toBeInTheDocument();
  });

  it('never reopens the flow on a later exit-intent, even after the modal is closed', () => {
    render(<App />);

    fireEvent.mouseOut(document, { clientY: -1 });
    expect(screen.getByRole('dialog', { name: /signup/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog', { name: /signup/i })).not.toBeInTheDocument();

    fireEvent.mouseOut(document, { clientY: -1 });
    expect(screen.queryByRole('dialog', { name: /signup/i })).not.toBeInTheDocument();
  });

  it('does not fire for an ordinary mouseout inside the page (clientY > 0)', () => {
    render(<App />);

    fireEvent.mouseOut(document, { clientY: 400 });

    expect(screen.queryByRole('dialog', { name: /signup/i })).not.toBeInTheDocument();
  });
});

describe('sticky CTA', () => {
  // The top bar's banner and the sticky CTA both render `siteConfig.bannerText`
  // ("...FREE CREDITS ON SIGNUP"), so presence is asserted via match count
  // (1 = top bar only, 2 = top bar + sticky CTA) rather than by absence,
  // which the top bar's own always-on banner would falsify.
  it('appears once scrollY passes 900px', () => {
    render(<App />);

    expect(screen.getAllByText(/open source.*free credits on signup/i)).toHaveLength(1);

    setScrollY(950);
    fireEvent.scroll(window);

    expect(screen.getAllByText(/open source.*free credits on signup/i)).toHaveLength(2);
  });

  it('is dismissible and stays hidden after dismissal', () => {
    render(<App />);

    setScrollY(950);
    fireEvent.scroll(window);
    expect(screen.getAllByText(/open source.*free credits on signup/i)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.getAllByText(/open source.*free credits on signup/i)).toHaveLength(1);

    setScrollY(950);
    fireEvent.scroll(window);
    expect(screen.getAllByText(/open source.*free credits on signup/i)).toHaveLength(1);
  });

  it('is hidden while the signup flow is open', () => {
    render(<App />);

    setScrollY(950);
    fireEvent.scroll(window);
    expect(screen.getAllByText(/open source.*free credits on signup/i)).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: /start free/i })[0]!);
    expect(screen.getAllByText(/open source.*free credits on signup/i)).toHaveLength(1);
  });
});
