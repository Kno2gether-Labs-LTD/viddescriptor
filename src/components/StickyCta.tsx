import type { ReactElement } from 'react';
import { siteConfig } from '../config';
import { useCountdown } from '../hooks/useCountdown';

export type StickyCtaProps = {
  /** Combines scroll threshold + not-dismissed; App additionally forces this
   *  false while the signup flow OR the entry overlay is showing, so the two
   *  conversion surfaces never stack. */
  visible: boolean;
  onOpenFlow: () => void;
  onDismiss: () => void;
};

/**
 * Bottom sticky bar shown past the scroll threshold; dismissible; hidden
 * while the signup flow or the entry overlay is open (see `visible`
 * contract above). `useCountdown` is called locally rather than threaded in
 * as a prop — see the note in TopBar.tsx.
 */
export function StickyCta({ visible, onOpenFlow, onDismiss }: StickyCtaProps): ReactElement | null {
  const countdown = useCountdown(siteConfig.offerEndsAt);
  if (!visible) return null;

  return (
    <div
      className="hc-slide-up"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 75,
        background: 'rgba(10,10,9,.93)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid oklch(0.78 0.19 85 / .4)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ font: "400 22px/1 var(--font-display)", textTransform: 'uppercase' }}>
        {siteConfig.bannerText}
      </div>
      {countdown && <div style={{ font: "700 12px/1 var(--font-mono)", color: 'var(--color-accent)' }}>{countdown} LEFT</div>}
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onOpenFlow}
        style={{ border: 0, cursor: 'pointer', padding: '13px 24px', borderRadius: 999, background: 'var(--color-accent)', color: 'var(--color-bg)', font: "700 14px/1 var(--font-body)" }}
      >
        Start free →
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ border: 0, background: 'transparent', color: 'rgba(245,243,238,.4)', cursor: 'pointer', font: "400 20px/1 var(--font-body)" }}
      >
        ×
      </button>
    </div>
  );
}
