import type { ReactElement } from 'react';
import { siteConfig } from '../config';

export type FreeFilmProps = {
  onOpenFlow: () => void;
};

const STATS: { value: string; label: string; accent?: boolean }[] = [
  { value: '1.2M', label: 'VIEWS ON YOUR\nLAST RECIPE', accent: true },
  { value: '+4,180', label: 'FOLLOWERS\nTHIS WEEK' },
  { value: '9.4%', label: 'SAVE RATE\nVS 2.1% AVG' },
  { value: '$0', label: 'SPENT TO\nGET THERE' },
];

/**
 * "Make it, keep it, watch it travel" — the free first film pitch. The
 * per-user activity stats (views, followers, save rate) are fabricated
 * illustrative numbers, not real telemetry for any given account, so — like
 * the testimonials in Compare.tsx — they render only when
 * `siteConfig.showSampleSocialProof` is explicitly true (default false).
 */
export function FreeFilm({ onOpenFlow }: FreeFilmProps): ReactElement {
  const showStats = siteConfig.showSampleSocialProof;

  return (
    <div style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '96px 28px 0' }}>
      <div
        style={{
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 22,
          background: 'linear-gradient(160deg,oklch(0.7 0.23 300 / .1),#0d0d0b 55%)',
          padding: 40,
          display: 'grid',
          gridTemplateColumns: showStats ? 'repeat(auto-fit,minmax(320px,1fr))' : '1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-accent)' }}>YOUR FREE FILM</div>
          <h2 style={{ margin: '14px 0 0', font: "400 clamp(32px,4vw,56px)/0.94 var(--font-display)", textTransform: 'uppercase' }}>
            Make it. Keep it.
            <br />
            Then watch it <span style={{ color: 'var(--color-accent)' }}>travel</span>.
          </h2>
          <p style={{ margin: '16px 0 0', font: "400 16.5px/1.6 var(--font-body)", color: 'rgba(245,243,238,.68)', maxWidth: 440 }}>
            The first film you make on the free tier is yours outright, in crisp 1080p, with the commercial license
            attached.
            Post it from {siteConfig.brandName} and the views, saves and follows come back into your dashboard, so
            you can see which recipe actually performs before you spend a credit on the next one.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenFlow}
              style={{ border: 0, cursor: 'pointer', padding: '15px 26px', borderRadius: 999, background: 'var(--color-accent)', color: 'var(--color-bg)', font: "700 15px/1 var(--font-body)" }}
            >
              Make my free film →
            </button>
            <span style={{ alignSelf: 'center', font: "400 11.5px/1.4 var(--font-mono)", color: 'rgba(245,243,238,.45)' }}>
              NO CARD · KEEP THE FILE · KEEP THE RIGHTS
            </span>
          </div>
        </div>
        {showStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
            {STATS.map((stat) => (
              <div key={stat.label} style={{ padding: 20, borderRadius: 14, background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ font: "400 40px/0.9 var(--font-display)", color: stat.accent ? 'var(--color-accent)' : 'inherit' }}>{stat.value}</div>
                <div style={{ marginTop: 7, font: "400 11px/1.4 var(--font-mono)", color: 'rgba(245,243,238,.5)', whiteSpace: 'pre-line' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
