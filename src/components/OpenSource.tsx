import type { ReactElement } from 'react';
import { siteConfig } from '../config';
import { MEDIA } from '../lib/media';

const STATS: { value: string; label: string; accent?: boolean }[] = [
  { value: 'OPEN', label: 'PUBLIC ROADMAP\nAND CHANGELOG', accent: true },
  { value: '8.4k', label: 'STARS ON\nGITHUB' },
  { value: '142', label: 'CREATORS SHAPING\nTHE RECIPES' },
  { value: '0', label: 'TELEMETRY\nCALLS' },
];

/**
 * "Built in the open" — links to `siteConfig.githubUrl`. The stat tiles
 * (GitHub stars, contributor count) are invented placeholder numbers, not
 * real repo metrics, so they render only when
 * `siteConfig.showSampleSocialProof` is explicitly true (default false) —
 * same rule as the testimonials in Compare.tsx and the activity stats in
 * FreeFilm.tsx. The right column never goes empty, though: when the stats
 * are gated off (the default), it shows a looping ambient video panel
 * (MEDIA.p1) with the brand mark centered instead, so the section always
 * has a visual.
 */
export function OpenSource(): ReactElement {
  const showStats = siteConfig.showSampleSocialProof;

  return (
    <div id="opensource" style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '96px 28px 0', scrollMarginTop: 130 }}>
      <div
        style={{
          border: '1px solid rgba(255,255,255,.14)',
          borderRadius: 22,
          background: 'var(--color-bg-raised)',
          padding: 38,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
          gap: 38,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-good)' }}>OPEN SOURCE</div>
          <h2 style={{ margin: '14px 0 0', font: "400 clamp(30px,3.8vw,52px)/0.94 var(--font-display)", textTransform: 'uppercase' }}>
            Built in
            <br />
            the <span style={{ color: 'var(--color-good)' }}>open</span>
          </h2>
          <p style={{ margin: '16px 0 0', font: "400 16.5px/1.6 var(--font-body)", color: 'rgba(245,243,238,.68)', maxWidth: 440 }}>
            {siteConfig.brandName} is built in the open. You can see how it&apos;s put together, follow the roadmap
            in public, and know that the people building this are accountable to the people using it.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <a
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="hc-link-hover"
              style={{
                border: '1px solid rgba(255,255,255,.22)',
                color: 'var(--color-ink)',
                padding: '14px 22px',
                borderRadius: 999,
                font: "700 14px/1 var(--font-body)",
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              View on GitHub →
            </a>
            {siteConfig.resellerClubUrl ? (
              <a
                href={siteConfig.resellerClubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hc-link-hover"
                data-testid="reseller-club-link"
                style={{
                  color: 'var(--color-good)',
                  padding: '14px 22px',
                  borderRadius: 999,
                  font: "700 14px/1 var(--font-body)",
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                AI Reseller Club — learn to sell AI media →
              </a>
            ) : null}
          </div>
        </div>
        {showStats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
            {STATS.map((stat) => (
              <div key={stat.label} style={{ padding: 20, borderRadius: 14, background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ font: "400 38px/0.9 var(--font-display)", color: stat.accent ? 'var(--color-good)' : 'inherit' }}>{stat.value}</div>
                <div style={{ marginTop: 7, font: "400 11px/1.4 var(--font-mono)", color: 'rgba(245,243,238,.5)', whiteSpace: 'pre-line' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div
            data-testid="opensource-video-panel"
            style={{ position: 'relative', minHeight: 220, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}
          >
            <video
              src={MEDIA.p1.src}
              poster={MEDIA.p1.poster}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,10,9,.35),rgba(10,10,9,.88))' }} />
            <img
              src="/brand/mark.svg"
              alt=""
              aria-hidden="true"
              width={56}
              height={56}
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.92 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
