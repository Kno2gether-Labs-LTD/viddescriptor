import type { ReactElement } from 'react';
import { siteConfig } from '../config';

/** Minimal footer: brand, support contact, socials, GitHub. */
export function Footer(): ReactElement {
  const year = new Date().getFullYear();

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        borderTop: '1px solid rgba(255,255,255,.09)',
        padding: 28,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        font: "400 12px/1 var(--font-mono)",
        color: 'rgba(245,243,238,.4)',
      }}
    >
      <span>
        {siteConfig.brandName.toUpperCase()} © {year}
      </span>
      <span>BUILT IN THE OPEN</span>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <a href={`mailto:${siteConfig.supportEmail}`} style={{ color: 'inherit' }}>
          {siteConfig.supportEmail}
        </a>
        <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
          GitHub
        </a>
        {siteConfig.socials.map((social) => (
          <a key={social.href} href={social.href} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
            {social.label}
          </a>
        ))}
      </div>
    </div>
  );
}
