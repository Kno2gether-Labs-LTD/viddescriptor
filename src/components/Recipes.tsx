import { useMemo, useState, type ReactElement } from 'react';
import { MEDIA, type SlotId } from '../lib/media';
import { CATEGORY_LABELS, RECIPE_CHIPS, type RecipeChip } from '../data/recipes';

export type RecipesProps = {
  onOpenFlow: () => void;
};

type CuratedCard = {
  slot: SlotId;
  name: string;
};

const CURATED: CuratedCard[] = [
  { slot: 'r1', name: 'Caught Moment' },
  { slot: 'r2', name: 'Talking-Head Ad' },
  { slot: 'r3', name: 'Logo Sting' },
  { slot: 'r4', name: 'Product Reveal' },
];

/**
 * Chip rows show a hand-picked, demo-able spread of the catalog by default
 * (with a "+N more inside" count derived from the real total), and the full
 * matching set once a category filter is chosen. Deliberately spread across
 * categories (~6 marketing, ~6 video effects, ~5 bring-to-life, all 3 audio)
 * rather than just the first 20 in array order, so the default view isn't
 * accidentally skewed toward whichever category happens to sort first.
 */
const CURATED_CHIP_NAMES: string[] = [
  // Marketing (6)
  'Talking-Head Ad',
  'Logo Sting',
  'Product Reveal',
  'Establishing Shot of Anywhere',
  'Movie Poster',
  'Scroll-Stopping Thumbnail',
  // Video effects (6)
  'Impossible Transition',
  'Change the Weather',
  'Green Screen, Gone',
  'Swap an Object',
  'Two Photos, One Camera Move',
  'Effects Without the Budget',
  // Bring to life (5)
  'Bring a Photo to Life',
  'Character Sheet',
  'Cartoon Episode',
  'Talking Presenter From a Photo',
  'Twenty Years in Six Seconds',
  // Audio (all 3)
  'Voice-Over From a Script',
  'Sound Effect',
  'Background Music',
];

const RECIPE_CHIP_BY_NAME = new Map(RECIPE_CHIPS.map((chip) => [chip.name, chip]));
const CURATED_CHIPS: RecipeChip[] = CURATED_CHIP_NAMES.map((name) => RECIPE_CHIP_BY_NAME.get(name)).filter(
  (chip): chip is RecipeChip => chip !== undefined,
);

/** One-click recipe catalog: category filter, curated grid, chip list. */
export function Recipes({ onOpenFlow }: RecipesProps): ReactElement {
  const [cat, setCat] = useState(0);

  const filtered = useMemo(
    () => (cat === 0 ? CURATED_CHIPS : RECIPE_CHIPS.filter((r) => r.cat === cat)),
    [cat],
  );
  const moreCount = cat === 0 ? RECIPE_CHIPS.length - CURATED_CHIPS.length : 0;

  return (
    <div id="recipes" style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '96px 28px 0', scrollMarginTop: 130 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-accent)' }}>ONE-CLICK RECIPES</div>
          <h2 style={{ margin: '14px 0 0', font: "400 clamp(38px,5.6vw,80px)/0.92 var(--font-display)", textTransform: 'uppercase' }}>
            {RECIPE_CHIPS.length} recipes.
            <br />
            <span style={{ color: 'var(--color-accent)' }}>Zero prompt</span> writing.
          </h2>
        </div>
        <p style={{ margin: 0, maxWidth: 340, font: "400 15px/1.6 var(--font-body)", color: 'rgba(245,243,238,.6)' }}>
          Pick a recipe, drop in your subject, hit go. Each one is a locked-in camera move, lighting setup and grade
          that already works.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 26 }}>
        <button
          type="button"
          onClick={() => setCat(0)}
          style={{
            cursor: 'pointer',
            padding: '9px 16px',
            borderRadius: 999,
            border: `1px solid ${cat === 0 ? 'var(--color-accent)' : 'rgba(255,255,255,.14)'}`,
            background: cat === 0 ? 'var(--color-accent)' : 'transparent',
            color: cat === 0 ? 'var(--color-bg)' : 'rgba(245,243,238,.72)',
            font: "600 13px/1 var(--font-body)",
          }}
        >
          {CATEGORY_LABELS[0]}
        </button>
        {CATEGORY_LABELS.slice(1).map((label, i) => {
          const value = i + 1;
          const active = cat === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setCat(value)}
              style={{
                cursor: 'pointer',
                padding: '9px 16px',
                borderRadius: 999,
                border: `1px solid ${active ? 'var(--color-accent)' : 'rgba(255,255,255,.14)'}`,
                background: active ? 'var(--color-accent)' : 'transparent',
                color: active ? 'var(--color-bg)' : 'rgba(245,243,238,.72)',
                font: "600 13px/1 var(--font-body)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 20 }}>
        {CURATED.map((card) => (
          <button
            type="button"
            key={card.slot}
            className="hc-card-hover"
            style={{
              position: 'relative',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,.09)',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              background: 'transparent',
              display: 'block',
              width: '100%',
            }}
            onClick={onOpenFlow}
          >
            <video
              src={MEDIA[card.slot].src}
              poster={MEDIA[card.slot].poster}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block', transform: 'scale(1.34)', transformOrigin: 'center 22%' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                // Stronger, earlier-starting gradient than the rest of the
                // page's video tiles — these titles sit directly on bright
                // recipe frames and were getting swallowed by them.
                background: 'linear-gradient(180deg,transparent 40%,rgba(10,10,9,.95))',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 16,
                gap: 6,
              }}
            >
              <span
                style={{
                  font: "400 24px/0.95 var(--font-display)",
                  textTransform: 'uppercase',
                  textShadow: '0 2px 12px rgba(0,0,0,.8)',
                }}
              >
                {card.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginTop: 14 }}>
        {filtered.map((recipe) => (
          <button
            type="button"
            key={recipe.name}
            className="hc-recipe-row-hover"
            onClick={onOpenFlow}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '13px 15px',
              borderRadius: 11,
              border: '1px solid rgba(255,255,255,.1)',
              background: 'var(--color-bg-raised)',
              cursor: 'pointer',
            }}
          >
            <span style={{ font: "500 13.5px/1.2 var(--font-body)", color: 'rgba(245,243,238,.88)' }}>{recipe.name}</span>
            <span style={{ font: "400 10.5px/1 var(--font-mono)", color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>
              {CATEGORY_LABELS[recipe.cat]}
            </span>
          </button>
        ))}
        {moreCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '13px 15px',
              borderRadius: 11,
              border: '1px dashed rgba(255,255,255,.2)',
              font: "400 12.5px/1 var(--font-mono)",
              color: 'rgba(245,243,238,.5)',
            }}
          >
            {moreCount} more inside
          </div>
        )}
      </div>
    </div>
  );
}
