import type { ReactElement } from 'react';
import { siteConfig } from '../config';
import { useCountdown } from '../hooks/useCountdown';

export type FinalCtaProps = {
  onOpenFlow: () => void;
};

/**
 * Closing full-width CTA. Countdown line hides entirely when `countdown` is
 * null. `useCountdown` is called locally (not passed as a prop) so its 1Hz
 * tick only re-renders this section — see the note in TopBar.tsx.
 */
export function FinalCta({ onOpenFlow }: FinalCtaProps): ReactElement {
  const countdown = useCountdown(siteConfig.offerEndsAt);
  return (
    <div style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '100px 28px 150px', textAlign: 'center' }}>
      <h2 style={{ margin: 0, font: "400 clamp(46px,9vw,140px)/0.86 var(--font-display)", textTransform: 'uppercase' }}>
        Your first clip
        <br />
        is <span style={{ color: 'var(--color-accent)' }}>free</span>. Right now.
      </h2>
      <p style={{ margin: '18px auto 0', maxWidth: 520, font: "400 17px/1.6 var(--font-body)", color: 'rgba(245,243,238,.65)' }}>
        {siteConfig.freeCredits} credits, no card, no watermark. If you never spend a dollar, the credits still don&apos;t
        expire.
      </p>
      <button
        type="button"
        onClick={onOpenFlow}
        className="hc-glow-btn"
        style={{
          marginTop: 28,
          border: 0,
          cursor: 'pointer',
          padding: '19px 40px',
          borderRadius: 999,
          background: 'var(--color-accent)',
          color: 'var(--color-bg)',
          font: "700 18px/1 var(--font-body)",
        }}
      >
        Claim {siteConfig.freeCredits} credits →
      </button>
      {countdown && (
        <div style={{ marginTop: 16, font: "400 12px/1 var(--font-mono)", color: 'rgba(245,243,238,.4)' }}>
          LAUNCH WEEK ENDS IN {countdown}
        </div>
      )}
    </div>
  );
}
