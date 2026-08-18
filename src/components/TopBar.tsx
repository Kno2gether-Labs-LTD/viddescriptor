import type { ReactElement } from 'react';
import { siteConfig } from '../config';
import { useCountdown } from '../hooks/useCountdown';

export type TopBarProps = {
  onOpenFlow: () => void;
};

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '#gallery', label: 'Gallery' },
  { href: '#characters', label: 'Characters' },
  { href: '#cinema', label: 'Films' },
  { href: '#recipes', label: 'Recipes' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#compare', label: 'Compare' },
  { href: '#opensource', label: 'Open source' },
];

/**
 * Sticky top bar: the announcement strip (`siteConfig.bannerText`, with a
 * countdown segment appended only when `siteConfig.offerEndsAt` is set —
 * no implied "launch week" event ships by default) plus the wordmark/nav/CTA
 * row. The wordmark splits
 * on `siteConfig.brandAccentSplit` and renders `siteConfig.logoUrl` (or the
 * default `/brand/mark.svg`) as a small mark beside it.
 *
 * `useCountdown` is called HERE rather than lifted to App and passed down:
 * when `offerEndsAt` is set, this hook re-renders on a 1Hz tick, and doing
 * that at the App level would re-render the entire page (8-video hero wall
 * included) every second. Calling it in each of the four leaf consumers
 * (TopBar, FinalCta, EntryOverlay, StickyCta) confines that tick to just
 * the small subtree that actually displays it.
 */
export function TopBar({ onOpenFlow }: TopBarProps): ReactElement {
  const [accentPart, inkPart] = siteConfig.brandAccentSplit;
  const countdown = useCountdown(siteConfig.offerEndsAt);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        backdropFilter: 'blur(14px)',
        background: 'rgba(10,10,9,.72)',
        borderBottom: '1px solid rgba(255,255,255,.09)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '7px 18px',
          background: 'var(--color-accent)',
          color: 'var(--color-bg)',
          font: "700 12px/1 var(--font-mono)",
          letterSpacing: '.06em',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span
            className="hc-pulse-dot"
            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-bg)' }}
          />
          {siteConfig.bannerText}
        </span>
        {countdown && (
          <>
            <span style={{ opacity: 0.55 }}>/</span>
            <span>ENDS IN {countdown}</span>
          </>
        )}
      </div>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={siteConfig.logoUrl ?? '/brand/mark.svg'}
            alt=""
            width={26}
            height={26}
            style={{ display: 'block' }}
          />
          <div style={{ font: "400 26px/1 var(--font-display)", letterSpacing: '.02em' }}>
            <span style={{ color: 'var(--color-accent)' }}>{accentPart}</span>
            {inkPart}
          </div>
        </div>
        <nav
          className="topbar-nav"
          style={{ display: 'flex', gap: 22, font: "500 13.5px/1 var(--font-body)", color: 'rgba(245,243,238,.62)' }}
        >
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} style={{ color: 'inherit' }}>
              {link.label}
            </a>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <a
          href={`${siteConfig.portalUrl}/login`}
          style={{
            padding: '11px 18px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,.18)',
            color: 'rgba(245,243,238,.85)',
            font: "600 13.5px/1 var(--font-body)",
            textDecoration: 'none',
          }}
        >
          Log in
        </a>
        <button
          type="button"
          onClick={onOpenFlow}
          className="hc-glow-btn"
          style={{
            border: 0,
            cursor: 'pointer',
            padding: '11px 20px',
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            font: "700 13.5px/1 var(--font-body)",
          }}
        >
          Start free →
        </button>
      </div>
    </div>
  );
}
