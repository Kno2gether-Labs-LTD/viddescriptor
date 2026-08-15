import { useState, type ReactElement } from 'react';
import { MEDIA, type SlotId } from '../lib/media';

type CharacterCard = {
  slot: SlotId;
  /** The real recipe that produced this shot. */
  recipe: string;
  /** Quoted, prompt-style one-liner. Omitted for the compact "any character" row. */
  quote?: string;
};

/**
 * Step 2, row 1 — always visible. Owner directive: premium taste, don't
 * overuse the reveal — 2-3 tiles up front, more on click.
 */
const FEATURED: CharacterCard[] = [
  { slot: 'own6', recipe: 'Impossible Transition', quote: '"slot canyon, one continuous move"' },
  { slot: 'own4', recipe: 'Effects Without the Budget', quote: '"aurora sky, night run, practical light"' },
  { slot: 'own3', recipe: 'Caught Moment', quote: '"reaction shot, handheld, in the room"' },
];

/** Step 2, row 2 — revealed by the "more worlds" expander. */
const MORE_WORLDS: CharacterCard[] = [
  { slot: 'own5', recipe: 'Change the World', quote: '"jellyfish dive, bioluminescent blue"' },
  { slot: 'own2', recipe: 'Change the Location', quote: '"ancient temple, wandering wide shot"' },
  { slot: 'own1', recipe: 'Just There', quote: '"jungle vlog, selfie climb"' },
];

/**
 * Compact generality proof, also behind the expander: the SAME recipes work
 * on a different, already-familiar character (wave-1 character A) — `b1` is
 * deliberately excluded here since it already stars in the ImageToVideo
 * before/after slider.
 */
const OTHER_CHARACTER: CharacterCard[] = [
  { slot: 'm1', recipe: 'Effects Without the Budget' },
  { slot: 'g5', recipe: 'Perform as my Character' },
  { slot: 'ownAlley', recipe: 'Establishing Shot of Anywhere' },
];

const MORE_WORLDS_ID = 'character-more-worlds';

function CharacterTile({ card, ratio }: { card: CharacterCard; ratio: string }): ReactElement {
  return (
    <div
      className="hc-card-hover"
      style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,.09)' }}
    >
      <video
        src={MEDIA[card.slot].src}
        poster={MEDIA[card.slot].poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', display: 'block', transform: 'scale(1.34)', transformOrigin: 'center 22%' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 42%,rgba(10,10,9,.94))' }} />
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ font: "700 12.5px/1.3 var(--font-mono)", color: 'var(--color-accent)' }}>{card.recipe}</span>
        {card.quote && (
          <span style={{ font: "400 11px/1.4 var(--font-mono)", color: 'rgba(245,243,238,.7)' }}>{card.quote}</span>
        )}
      </div>
    </div>
  );
}

/**
 * "One character. Every recipe." — owner-character-led with progressive
 * disclosure: step 1 (train the sheet) shows the real Character Sheet
 * recipe output; step 2 (same face, any world) opens with 3 curated tiles
 * and expands to 3 more plus a compact "it works for any character" proof.
 */
export function CharacterLock(): ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      id="characters"
      style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '96px 28px 0', scrollMarginTop: 130 }}
    >
      <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-accent)' }}>
        CHARACTER LOCK
      </div>
      <h2 style={{ margin: '14px 0 0', font: "400 clamp(38px,5.6vw,80px)/0.92 var(--font-display)", textTransform: 'uppercase' }}>
        One character.
        <br />
        <span style={{ color: 'var(--color-accent)' }}>Every recipe.</span>
      </h2>

      {/* Step 1 — train the sheet: intro copy paired with the actual
          Character Sheet recipe output (a still, not a generated clip). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 38, marginTop: 30, alignItems: 'center' }}>
        <div>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.1em', color: 'rgba(245,243,238,.45)' }}>
            01 — TRAIN THE SHEET
          </div>
          <p style={{ margin: '12px 0 0', maxWidth: 480, font: "400 16.5px/1.6 var(--font-body)", color: 'rgba(245,243,238,.66)' }}>
            One trained character sheet. The same face holds in a slot canyon, atop an aurora ridge, or caught off
            guard at home — whatever world or recipe you point it at. No re-training, no drift, no swapped face
            halfway through.
          </p>
        </div>
        <div
          style={{
            justifySelf: 'center',
            maxWidth: 300,
            width: '100%',
            background: '#f2ece0',
            border: '1px solid rgba(0,0,0,.14)',
            borderRadius: 10,
            padding: 12,
            transform: 'rotate(-1.6deg)',
            boxShadow: '0 26px 60px -26px rgba(0,0,0,.65)',
          }}
        >
          <img
            src={MEDIA.charSheet.src}
            alt="Character Sheet — the recipe output that locks a face"
            style={{ width: '100%', display: 'block', borderRadius: 4 }}
          />
          <div style={{ marginTop: 10, textAlign: 'center', font: "400 10.5px/1.4 var(--font-mono)", color: 'rgba(10,10,9,.62)' }}>
            Character Sheet · the recipe output that locks a face
          </div>
        </div>
      </div>

      {/* Step 2 — same face, any world. */}
      <div style={{ marginTop: 44 }}>
        <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.1em', color: 'rgba(245,243,238,.45)' }}>
          02 — SAME FACE, ANY WORLD
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginTop: 16 }}>
          {FEATURED.map((card) => (
            <CharacterTile key={card.slot} card={card} ratio="9/16" />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={MORE_WORLDS_ID}
          onClick={() => setExpanded((v) => !v)}
          style={{
            cursor: 'pointer',
            padding: '11px 20px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,.2)',
            background: 'transparent',
            color: 'rgba(245,243,238,.72)',
            font: "600 13px/1 var(--font-body)",
          }}
        >
          {expanded ? 'Show fewer worlds ←' : 'See the same character in more worlds →'}
        </button>
      </div>

      {/* Kept mounted (not conditionally rendered) so `aria-controls` above
          always resolves to a real element — visibility toggles via the
          `hidden` attribute instead, which also keeps it out of the
          accessibility tree while collapsed. */}
      <div id={MORE_WORLDS_ID} hidden={!expanded}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginTop: 22 }}>
          {MORE_WORLDS.map((card) => (
            <CharacterTile key={card.slot} card={card} ratio="9/16" />
          ))}
        </div>

        <div style={{ marginTop: 34 }}>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.1em', color: 'rgba(245,243,238,.45)' }}>
            It works for any character —
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginTop: 14 }}>
            {OTHER_CHARACTER.map((card) => (
              <CharacterTile key={card.slot} card={card} ratio="4/5" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
