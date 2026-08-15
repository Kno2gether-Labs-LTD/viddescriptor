import type { ReactElement } from 'react';
import { siteConfig } from '../config';
import { MEDIA } from '../lib/media';
import { useCountdown } from '../hooks/useCountdown';

export type EntryOverlayProps = {
  visible: boolean;
  onOpenFlow: () => void;
  onClose: () => void;
};

/**
 * Full-screen "hype" popup shown once — at 45s dwell OR once the visitor
 * scrolls past 60% of the page, whichever happens first (see App.tsx) — as
 * long as the signup flow hasn't been touched yet. The kicker line never
 * implies an event that may not exist: with a countdown it reads "LIMITED OFFER · ENDS
 * IN {countdown}"; with no countdown configured (the default) it reads
 * "FREE START · {freeCredits} CREDITS" — no "launch week" language either
 * way. `useCountdown` is called locally rather than threaded in as a prop —
 * see the note in TopBar.tsx.
 */
export function EntryOverlay({ visible, onOpenFlow, onClose }: EntryOverlayProps): ReactElement | null {
  const countdown = useCountdown(siteConfig.offerEndsAt);
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Free credits offer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: 'rgba(6,6,5,.86)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="hc-pop"
        style={{
          position: 'relative',
          width: 'min(760px,100%)',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid oklch(0.78 0.19 85 / .5)',
        }}
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,10,9,.55),rgba(10,10,9,.93))' }} />
        <div style={{ position: 'relative', zIndex: 5, padding: '46px 40px', textAlign: 'center' }}>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-accent)' }}>
            {countdown ? `LIMITED OFFER · ENDS IN ${countdown}` : `FREE START · ${siteConfig.freeCredits} CREDITS`}
          </div>
          <h3 style={{ margin: '14px 0 0', font: "400 clamp(38px,6vw,68px)/0.9 var(--font-display)", textTransform: 'uppercase' }}>
            {siteConfig.freeCredits} credits.
            <br />
            No card. Right now.
          </h3>
          <p style={{ margin: '14px auto 0', maxWidth: 420, font: "400 15.5px/1.55 var(--font-body)", color: 'rgba(245,243,238,.75)' }}>
            That&apos;s enough for dozens of clips in sharp 1080p, watermark-free, yours to use commercially. They
            never expire.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenFlow}
              className="hc-glow-btn-fast"
              style={{ border: 0, cursor: 'pointer', padding: '16px 30px', borderRadius: 999, background: 'var(--color-accent)', color: 'var(--color-bg)', font: "700 16px/1 var(--font-body)" }}
            >
              Claim my credits →
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: 'rgba(245,243,238,.6)', cursor: 'pointer', padding: '16px 22px', borderRadius: 999, font: "500 14px/1 var(--font-body)" }}
            >
              Just browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
