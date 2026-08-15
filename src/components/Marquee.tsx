import type { ReactElement } from 'react';

const ITEMS = [
  'Text → video',
  'Image → video',
  'Talking presenters',
  'Character lock',
  'Storyboards',
  'Voice + music',
  '4K stills',
  'Every ad size',
];

function Track(): ReactElement {
  return (
    <div style={{ display: 'flex', gap: 34, paddingRight: 34, font: "400 30px/1 var(--font-display)", textTransform: 'uppercase', color: 'rgba(245,243,238,.9)', whiteSpace: 'nowrap' }}>
      {ITEMS.map((item) => (
        <span key={item} style={{ display: 'inline-flex', gap: 34, alignItems: 'center' }}>
          {item}
          <span style={{ color: 'var(--color-accent)' }}>·</span>
        </span>
      ))}
    </div>
  );
}

/** Infinite-scroll capability marquee. Purely decorative, no headline. */
export function Marquee(): ReactElement {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,.09)',
        borderBottom: '1px solid rgba(255,255,255,.09)',
        background: 'var(--color-bg-raised)',
        padding: '16px 0',
      }}
    >
      <div className="hc-marquee-track">
        <Track />
        <Track />
      </div>
    </div>
  );
}
