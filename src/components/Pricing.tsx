import { useState, type ReactElement } from 'react';
import { siteConfig, type Tier } from '../config';

export type PricingProps = {
  onOpenFlow: () => void;
};

const PAYG_CHECKLIST = ['NO SUBSCRIPTION', 'CREDITS NEVER EXPIRE', 'NO WATERMARK', 'COMMERCIAL LICENSE', '4K IMAGE UPSCALE · SHARP 1080P VIDEO'];
const PLAN_CHECKLIST = ['ROLLOVER CREDITS', 'KEEP CREDITS IF YOU CANCEL', 'NO WATERMARK', 'ANNUAL = 2 MONTHS FREE'];

function TierCard({ tier, onOpenFlow }: { tier: Tier; onOpenFlow: () => void }): ReactElement {
  const featured = tier.featured === true;
  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${featured ? 'var(--color-accent)' : 'rgba(255,255,255,.12)'}`,
        borderRadius: 18,
        padding: 26,
        background: featured ? 'linear-gradient(180deg,oklch(0.78 0.19 85 / .14),#0e0e0c)' : 'var(--color-bg-card)',
      }}
    >
      {featured && (
        <div
          style={{
            position: 'absolute',
            top: -11,
            left: 26,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            font: "700 10.5px/1 var(--font-mono)",
            padding: '6px 10px',
            borderRadius: 6,
            letterSpacing: '.1em',
          }}
        >
          BEST VALUE
        </div>
      )}
      <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.12em', color: featured ? 'var(--color-accent)' : 'rgba(245,243,238,.5)' }}>
        {tier.kicker}
      </div>
      <div style={{ marginTop: 14, font: "400 54px/0.9 var(--font-display)" }}>
        {tier.price}
        {tier.per && <span style={{ font: "400 16px/1 var(--font-body)", color: 'rgba(245,243,238,.5)' }}>{tier.per}</span>}
      </div>
      <div style={{ marginTop: 8, font: "400 14px/1.5 var(--font-body)", color: featured ? 'rgba(245,243,238,.78)' : 'rgba(245,243,238,.6)' }}>
        {tier.lines.map((line, i) => (
          <span key={line}>
            {line}
            {i < tier.lines.length - 1 && <br />}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenFlow}
        style={{
          marginTop: 22,
          width: '100%',
          cursor: 'pointer',
          border: featured ? 0 : '1px solid rgba(255,255,255,.2)',
          background: featured ? 'var(--color-accent)' : 'transparent',
          color: featured ? 'var(--color-bg)' : 'var(--color-ink)',
          padding: 13,
          borderRadius: 11,
          font: "700 14px/1 var(--font-body)",
        }}
      >
        {tier.cta}
      </button>
    </div>
  );
}

/** Pricing section: PAYG / plans toggle, both rendered entirely from `siteConfig.pricing`. */
export function Pricing({ onOpenFlow }: PricingProps): ReactElement {
  const [flavour, setFlavour] = useState<'payg' | 'plans'>('payg');
  const isPayg = flavour === 'payg';
  const tiers = isPayg ? siteConfig.pricing.payg : siteConfig.pricing.plans;
  const checklist = isPayg ? PAYG_CHECKLIST : PLAN_CHECKLIST;

  return (
    <div id="pricing" style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '96px 28px 0', scrollMarginTop: 130 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, font: "400 clamp(38px,5.6vw,80px)/0.92 var(--font-display)", textTransform: 'uppercase' }}>
          Pricing that
          <br />
          doesn&apos;t <span style={{ color: 'var(--color-accent)' }}>punish</span> you
        </h2>
        <div style={{ display: 'flex', padding: 5, borderRadius: 999, border: '1px solid rgba(255,255,255,.14)', background: 'var(--color-bg-raised)' }}>
          <button
            type="button"
            onClick={() => setFlavour('payg')}
            style={{
              cursor: 'pointer',
              border: 0,
              padding: '11px 20px',
              borderRadius: 999,
              font: "700 13px/1 var(--font-body)",
              background: isPayg ? 'var(--color-accent)' : 'transparent',
              color: isPayg ? 'var(--color-bg)' : 'rgba(245,243,238,.7)',
            }}
          >
            Pay as you go
          </button>
          <button
            type="button"
            onClick={() => setFlavour('plans')}
            style={{
              cursor: 'pointer',
              border: 0,
              padding: '11px 20px',
              borderRadius: 999,
              font: "700 13px/1 var(--font-body)",
              background: !isPayg ? 'var(--color-accent)' : 'transparent',
              color: !isPayg ? 'var(--color-bg)' : 'rgba(245,243,238,.7)',
            }}
          >
            Plans
          </button>
        </div>
      </div>

      <p style={{ margin: '18px 0 0', font: "400 17px/1.6 var(--font-body)", color: 'rgba(245,243,238,.66)', maxWidth: 640 }}>
        {isPayg
          ? `Sign up free, get ${siteConfig.freeCredits} credits. Buy more only when you need them. Credits never expire, and every render is watermark-free and commercially licensed — 4K image upscale, sharp 1080p video, including the free ones.`
          : "If you generate every day, a plan is cheaper. Monthly credits roll over while you're subscribed, and whatever is unused converts to permanent credits if you cancel."}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16, marginTop: 28 }}>
        {tiers.map((tier) => (
          <TierCard key={tier.kicker} tier={tier} onOpenFlow={onOpenFlow} />
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 26, flexWrap: 'wrap', font: "400 12.5px/1 var(--font-mono)", color: 'rgba(245,243,238,.5)' }}>
        {checklist.map((item) => (
          <span key={item}>✓ {item}</span>
        ))}
      </div>
    </div>
  );
}
