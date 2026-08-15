import type { ReactElement } from 'react';
import { siteConfig } from '../config';

const TYPICAL = [
  'Subscription before your first render',
  'Credits reset at the end of the month',
  'Watermark until you upgrade',
  "Queue times you can't see",
  'Commercial rights on the top plan only',
];

const OURS = [
  `${siteConfig.freeCredits} credits before you enter a card`,
  'Top-up credits never expire',
  'Sharp 1080p output from the first clip',
  'Commercial license on every tier, including free',
];

/**
 * "What you're used to vs. us" comparison, plus the testimonial cards —
 * the testimonial cards render only when `siteConfig.testimonials` is
 * non-empty (real, owner-supplied quotes via `VITE_TESTIMONIALS_JSON`;
 * default `[]` — no fabricated quotes ship for a fresh white-label deploy).
 */
export function Compare(): ReactElement {
  return (
    <>
      <div id="compare" style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '84px 28px 0', scrollMarginTop: 130 }}>
        <h2 style={{ margin: '0 0 26px', font: "400 clamp(30px,3.6vw,50px)/1 var(--font-display)", textTransform: 'uppercase' }}>
          What you&apos;re used to vs. {siteConfig.brandName}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
          <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: 28, background: 'var(--color-bg-raised)' }}>
            <div style={{ font: "700 12px/1 var(--font-mono)", letterSpacing: '.12em', color: 'rgba(245,243,238,.45)' }}>TYPICAL AI VIDEO TOOL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20, font: "400 16px/1.4 var(--font-body)", color: 'rgba(245,243,238,.58)' }}>
              {TYPICAL.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
          <div
            style={{
              border: '1px solid oklch(0.78 0.19 85 / .55)',
              borderRadius: 18,
              padding: 28,
              background: 'linear-gradient(180deg,oklch(0.78 0.19 85 / .1),#0d0d0b)',
            }}
          >
            <div style={{ font: "700 12px/1 var(--font-mono)", letterSpacing: '.12em', color: 'var(--color-accent)' }}>
              {siteConfig.brandName.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20, font: "400 16px/1.4 var(--font-body)", color: 'var(--color-ink)' }}>
              {OURS.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {siteConfig.testimonials.length > 0 && (
        <div
          data-testid="testimonials"
          style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '84px 28px 0' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            {siteConfig.testimonials.map((item) => (
              <div
                key={item.attribution}
                data-testid="testimonial-card"
                style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 24, background: 'var(--color-bg-raised)', font: "400 17px/1.5 var(--font-body)" }}
              >
                {item.quote}
                <div style={{ marginTop: 14, font: "400 12px/1 var(--font-mono)", color: 'rgba(245,243,238,.45)' }}>{item.attribution}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
