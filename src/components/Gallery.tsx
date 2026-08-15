import { useState, type ReactElement } from 'react';
import { MEDIA, type SlotId } from '../lib/media';

type GalleryCard = {
  slot: SlotId;
  /** Column span in the uniform 6-col grid. Omitted for the mixed-aspect
   *  expander row, which is positioned via `.hc-gallery-more-*` CSS classes
   *  instead (see below). */
  span?: number;
  ratio: string;
  /** Quoted, prompt-style description of the shot. No recipe name here —
   *  that pairing lives in the "One character. Every recipe." section
   *  below, so a subject can't be double-labeled two different ways. */
  caption: string;
};

/**
 * Diverse-subject retile (wave-2 owner directive): rows 1-2 mirror the
 * original 2/2/2 + 3/3 span pattern, with a new full-width closer for the
 * 6th tile so the grid still totals 6 columns per row. `g4` (product macro)
 * is the one tile that intentionally keeps its wave-1 media — the rest pull
 * from the wave-2 diversity batch (see `PENDING_MEDIA` in `lib/media.ts`;
 * these will 404 without posters until the wave-2 swap task lands the
 * encoded files, which is expected on dev).
 */
const CARDS: GalleryCard[] = [
  { slot: 'w2expressions', span: 2, ratio: '4/5', caption: '"five emotions, one take, no cuts"' },
  { slot: 'w2festival', span: 2, ratio: '4/5', caption: '"festival stage, six shots"' },
  { slot: 'w2got', span: 2, ratio: '4/5', caption: '"battle at dawn, trailer cut"' },
  { slot: 'g4', span: 3, ratio: '16/9', caption: '"product hero, macro, studio light"' },
  { slot: 'w2baby', span: 3, ratio: '16/9', caption: "\"her first steps, mother's POV\"" },
  { slot: 'w2emotional', span: 6, ratio: '21/9', caption: '"field hospital, one take"' },
];

/**
 * Progressive-disclosure expander row (owner directive, round-3): fresher
 * variety over character repetition — an aerial showcase, a rain-lit
 * cityscape plate, and a rain-on-glass macro. No recipe-name subcaptions,
 * same as the main grid.
 *
 * Round-4 owner fix: the two 16:9 clips and the 9:16 clip used to render in
 * equal-height uniform grid cells (CSS Grid stretches items to the row
 * height by default), leaving a black void under the landscape tiles. This
 * row is laid out separately via the `.hc-gallery-more-*` classes in
 * styles.css instead of the uniform 6-col grid: left column stacks the two
 * 16:9 tiles at their own aspect; right column holds the 9:16 tile spanning
 * both rows, filled with object-fit: cover to absorb the residual height
 * difference. Single column, natural aspect per tile, below 720px.
 */
const MORE_CARDS: GalleryCard[] = [
  { slot: 'showcaseAerial', ratio: '16/9', caption: '"sunrise over the range, one prompt"' },
  { slot: 'emberCity', ratio: '16/9', caption: '"ember city, rain-slick streets, one plate"' },
  { slot: 'rainGlass', ratio: '9/16', caption: '"rain on glass, macro bokeh"' },
];

const MORE_GENERATIONS_ID = 'gallery-more-generations';

function GalleryTile({ card, fill, wrapClassName }: { card: GalleryCard; fill?: boolean; wrapClassName?: string }) {
  const className = wrapClassName ? `hc-card-hover ${wrapClassName}` : 'hc-card-hover';
  return (
    <div
      className={className}
      style={{ gridColumn: card.span ? `span ${card.span}` : undefined, position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.09)' }}
    >
      <video
        src={MEDIA[card.slot].src}
        poster={MEDIA[card.slot].poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        // `fill` tiles (the spanning 9:16 in the expander row) get their box
        // size from the CSS class (`.hc-gallery-more-c-video`), which is
        // aspect-agnostic on desktop (fills whatever height the left column
        // produces) and reverts to a natural 9/16 aspect-ratio on mobile —
        // an inline aspectRatio here would fight that at both breakpoints.
        className={fill ? 'hc-gallery-more-c-video' : undefined}
        style={
          fill
            ? { objectFit: 'cover', display: 'block', transform: 'scale(1.34)', transformOrigin: 'center 22%' }
            : { width: '100%', aspectRatio: card.ratio, objectFit: 'cover', display: 'block', transform: 'scale(1.34)', transformOrigin: 'center 22%' }
        }
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 55%,rgba(10,10,9,.92))' }} />
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, font: "400 11.5px/1.5 var(--font-mono)", color: 'rgba(245,243,238,.85)' }}>
        {card.caption}
      </div>
    </div>
  );
}

/** Curated example-output grid, with a progressive-disclosure expander for more. */
export function Gallery(): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [aerialCard, emberCard, glassCard] = MORE_CARDS;

  return (
    <div id="gallery" style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '84px 28px 0', scrollMarginTop: 130 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, font: "400 clamp(38px,5.6vw,80px)/0.92 var(--font-display)", textTransform: 'uppercase' }}>
          Made <span style={{ color: 'var(--color-accent)' }}>this morning</span>
          <br />
          by people like you
        </h2>
        <div style={{ font: "400 13px/1.6 var(--font-mono)", color: 'rgba(245,243,238,.45)', maxWidth: 310 }}>
          One recipe, one click, no editing pass. Nothing below was touched after it rendered.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginTop: 30 }}>
        {CARDS.map((card) => (
          <GalleryTile key={card.slot} card={card} />
        ))}
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={MORE_GENERATIONS_ID}
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
          {expanded ? 'Show fewer generations ←' : 'More generations →'}
        </button>
      </div>

      {/* Kept mounted (not conditionally rendered) so `aria-controls` above
          always resolves to a real element — visibility toggles via the
          `hidden` attribute instead, which also keeps it out of the
          accessibility tree while collapsed. Aspect-aware layout: see the
          `.hc-gallery-more-*` classes in styles.css and the MORE_CARDS
          comment above. */}
      <div id={MORE_GENERATIONS_ID} hidden={!expanded} className="hc-gallery-more-row" style={{ marginTop: 16 }}>
        <GalleryTile card={aerialCard!} wrapClassName="hc-gallery-more-a" />
        <GalleryTile card={emberCard!} wrapClassName="hc-gallery-more-b" />
        <GalleryTile card={glassCard!} fill wrapClassName="hc-gallery-more-c" />
      </div>
    </div>
  );
}
