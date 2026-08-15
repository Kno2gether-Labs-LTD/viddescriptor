import { useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { siteConfig } from '../config';
import { MEDIA, type SlotId } from '../lib/media';
import { RECIPE_CHIPS } from '../data/recipes';

export type HeroProps = {
  onOpenFlow: () => void;
};

const TYPED_TARGET = siteConfig.hero.line3;
const TYPE_INTERVAL_MS = 62;
// Premium entrance (owner directive, wave-3): the video wall gets ~1.2s to
// register as motion, unscrimmed, before anything else moves — see
// `HERO_STAGE_B_DELAY_MS` below, which gates both this and the headline
// rise. Typing starts a beat after that stage begins, not at first paint.
const TYPE_START_DELAY_MS = 1400;
// A generous fixed ceiling past the new, later typing start — long enough
// that a normal-length line 3 always finishes typing well before this
// fires, so the fallback stays a true safety net rather than a premature
// cutoff of the caret blink.
const TYPE_FALLBACK_MS = TYPE_START_DELAY_MS + 2000;

// Stage timing for the premium hero entrance. Stage A (0 → this delay): the
// video wall renders at higher opacity, scrim mostly transparent, headline
// invisible — motion registers first. Stage B (this delay → +duration): the
// scrim eases to its final values and the headline block rises in
// (`.hc-rise`, reusing the existing `hcRise` keyframe); the prompt box and
// stats row cascade in after, staggered by `HERO_STAGGER_STEP_MS` each.
const HERO_STAGE_B_DELAY_MS = 1200;
const HERO_STAGE_B_DURATION_MS = 900;
const HERO_STAGGER_STEP_MS = 150;
const HERO_WALL_OPACITY_INITIAL = 0.85;
const HERO_WALL_OPACITY_FINAL = 0.62;
const HERO_SCRIM_OPACITY_INITIAL = 0.12;

function usePrefersReducedMotion(): boolean {
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  return reduced;
}

/**
 * Wraps the *first* case-insensitive occurrence of `accent` within `line` in
 * the hero's amber accent span (same style as the reference "film" treatment)
 * — and only the first, across however many lines share the same accent
 * word. `used.current` is the cross-line guard: pass the same ref to every
 * line in render order and it flips true the moment a match is found, so
 * later lines render plain even if the word recurs.
 */
function renderLineWithAccent(line: string, accent: string, used: { current: boolean }): ReactNode {
  if (used.current || !accent) return line;
  const idx = line.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return line;
  used.current = true;
  const before = line.slice(0, idx);
  const match = line.slice(idx, idx + accent.length);
  const after = line.slice(idx + accent.length);
  return (
    <>
      {before}
      <span style={{ color: 'var(--color-accent)' }}>{match}</span>
      {after}
    </>
  );
}

/** Staged-reveal style/class for one hero element — hidden+offset before
 *  `ready`, riding the `.hc-rise` keyframe (staggered by `delayMs`) once
 *  ready, or the final resting state immediately when motion is reduced. */
function riseProps(ready: boolean, reducedMotion: boolean, delayMs: number): { className?: string; style: CSSProperties } {
  if (reducedMotion) return { style: {} };
  if (!ready) return { style: { opacity: 0, transform: 'translateY(20px)' } };
  return { className: 'hc-rise', style: { animationDelay: `${delayMs}ms` } };
}

const DEMO_STEPS: [number, string][] = [
  [8, 'queued · position 1 of 1'],
  [26, 'interpreting prompt · shot list built'],
  [48, 'rendering frames 0–120'],
  [71, 'rendering frames 120–240'],
  [89, 'upscaling to 1080p'],
  [100, 'done — sign up free to download it'],
];
const DEMO_STEP_MS = 620;
const DEMO_IDLE_STATUS = `idle · your first ${siteConfig.freeCredits} credits are free`;

const QUICK_PICKS = [
  "crash zoom into a lion's eye",
  'my product on a spinning pedestal',
  'avatar speaking my script',
];

const WALL_COLUMNS: { slots: [SlotId, SlotId]; animClass: string; ratio: string }[] = [
  { slots: ['wall1', 'wall2'], animClass: 'hc-wall-col-1', ratio: '9/14' },
  { slots: ['wall3', 'wall4'], animClass: 'hc-wall-col-2', ratio: '9/13' },
  { slots: ['wall5', 'wall6'], animClass: 'hc-wall-col-3', ratio: '9/13' },
  { slots: ['wall7', 'wall8'], animClass: 'hc-wall-col-4', ratio: '9/14' },
];

/**
 * Full-bleed hero: video wall background, typing headline, interactive
 * prompt demo box (client-side simulation only — no real render happens),
 * and a truthful, config-driven stats row.
 */
export function Hero({ onOpenFlow }: HeroProps): ReactElement {
  const reducedMotion = usePrefersReducedMotion();
  // Gates stage B of the entrance (scrim ease-in + headline rise + prompt/
  // stats stagger) — flips once, ~1.2s after mount, unless motion is
  // reduced, in which case the final state renders immediately with no
  // staging at all.
  const [heroReady, setHeroReady] = useState(reducedMotion);

  const [typed, setTyped] = useState('');
  const [revealDone, setRevealDone] = useState(reducedMotion);
  const [caretOn, setCaretOn] = useState(!reducedMotion);

  const [prompt, setPrompt] = useState('drone shot over neon Tokyo rooftop, rain, anamorphic flare');
  const [progress, setProgress] = useState(0);
  const [demoStatus, setDemoStatus] = useState(DEMO_IDLE_STATUS);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => setHeroReady(true), HERO_STAGE_B_DELAY_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    // Reduced motion: skip the staged reveal entirely — the headline is
    // already showing its final text (see the `useState` initializers
    // above), so there's nothing left for this effect to animate.
    if (reducedMotion) return;

    let typeTimer: ReturnType<typeof setInterval> | undefined;
    let caretTimer: ReturnType<typeof setInterval> | undefined;
    const startTimer = setTimeout(() => {
      let i = 0;
      typeTimer = setInterval(() => {
        i += 1;
        setTyped(TYPED_TARGET.slice(0, i));
        if (i >= TYPED_TARGET.length) {
          clearInterval(typeTimer);
          setRevealDone(true);
          let blinks = 0;
          caretTimer = setInterval(() => {
            blinks += 1;
            if (blinks > 5) {
              clearInterval(caretTimer);
              setCaretOn(false);
              return;
            }
            setCaretOn((c) => !c);
          }, 620);
        }
      }, TYPE_INTERVAL_MS);
    }, TYPE_START_DELAY_MS);

    // Safety net: the headline is never left clipped, whatever happens to
    // the interval (matches the reference's `revealFallback`).
    const fallback = setTimeout(() => {
      clearInterval(typeTimer);
      clearInterval(caretTimer);
      setRevealDone(true);
      setCaretOn(false);
    }, TYPE_FALLBACK_MS);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(fallback);
      clearInterval(typeTimer);
      clearInterval(caretTimer);
    };
  }, [reducedMotion]);

  useEffect(() => () => clearInterval(demoTimerRef.current), []);

  const runDemo = () => {
    clearInterval(demoTimerRef.current);
    let i = 0;
    demoTimerRef.current = setInterval(() => {
      if (i >= DEMO_STEPS.length) {
        clearInterval(demoTimerRef.current);
        return;
      }
      const step = DEMO_STEPS[i]!;
      setProgress(step[0]);
      setDemoStatus(step[1]);
      i += 1;
    }, DEMO_STEP_MS);
  };

  const pick = (text: string) => () => {
    setPrompt(text);
    runDemo();
  };

  const revealPct = Math.round((typed.length / TYPED_TARGET.length) * 100);
  const clipPath = revealDone ? 'none' : `inset(-0.3em ${100 - revealPct}% -0.3em -0.1em)`;
  const caretOpacity = revealDone && !caretOn ? 0 : caretOn ? 1 : 0;

  // Cross-line accent guard: line1 → line2 → line3, in render order, so the
  // accent word is highlighted only where it *first* appears.
  const accentTracker = { current: false };
  const heroLine1 = renderLineWithAccent(siteConfig.hero.line1, siteConfig.hero.accent, accentTracker);
  const heroLine2 = renderLineWithAccent(siteConfig.hero.line2, siteConfig.hero.accent, accentTracker);
  const heroLine3 = renderLineWithAccent(TYPED_TARGET, siteConfig.hero.accent, accentTracker);

  const riseHeadline = riseProps(heroReady, reducedMotion, 0);
  const risePrompt = riseProps(heroReady, reducedMotion, HERO_STAGGER_STEP_MS);
  const riseStats = riseProps(heroReady, reducedMotion, HERO_STAGGER_STEP_MS * 2);

  return (
    <div style={{ position: 'relative', minHeight: '92vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 8,
          opacity: heroReady ? HERO_WALL_OPACITY_FINAL : HERO_WALL_OPACITY_INITIAL,
          transition: reducedMotion ? undefined : `opacity ${HERO_STAGE_B_DURATION_MS}ms ease`,
        }}
      >
        {WALL_COLUMNS.map((col, colIndex) => (
          <div key={colIndex} className="hc-wall-col">
            <div className={`hc-wall-col-inner ${col.animClass}`}>
              {col.slots.map((slotId, i) => (
                <video
                  key={`${slotId}-${i}`}
                  src={MEDIA[slotId].src}
                  poster={MEDIA[slotId].poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    aspectRatio: col.ratio,
                    objectFit: 'cover',
                    borderRadius: 10,
                    transform: 'scale(1.34)',
                    transformOrigin: 'center 22%',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1100px 700px at 50% 55%, rgba(10,10,9,.94), rgba(10,10,9,.72) 55%, rgba(10,10,9,.5)),linear-gradient(180deg,rgba(10,10,9,.7),transparent 22%,transparent 62%,#0a0a09)',
          // Premium entrance stage A: scrim mostly transparent so the video
          // wall's motion registers first; stage B eases it in as an
          // opacity crossfade (not by animating the gradient stops
          // themselves, which browsers can't reliably interpolate).
          opacity: heroReady ? 1 : HERO_SCRIM_OPACITY_INITIAL,
          transition: reducedMotion ? undefined : `opacity ${HERO_STAGE_B_DURATION_MS}ms ease`,
        }}
      />

      <div style={{ position: 'relative', zIndex: 3, maxWidth: 1360, margin: '0 auto', padding: '70px 28px', width: '100%', textAlign: 'center' }}>
        <div className={riseHeadline.className} style={riseHeadline.style}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '6px 13px',
              border: '1px solid rgba(255,255,255,.16)',
              borderRadius: 999,
              font: "700 11px/1 var(--font-mono)",
              letterSpacing: '.1em',
              color: 'rgba(245,243,238,.75)',
              background: 'rgba(10,10,9,.5)',
            }}
          >
            <span className="hc-pulse-dot-slow" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-good)' }} />
            {RECIPE_CHIPS.length} RECIPES · CHARACTER LOCK · 4K STILLS · NO WATERMARK
          </div>

          <h1
            style={{
              margin: '20px 0 0',
              font: "400 clamp(56px,11vw,178px)/0.84 var(--font-display)",
              letterSpacing: '-0.012em',
              textTransform: 'uppercase',
              textShadow: '0 20px 80px rgba(0,0,0,.7)',
            }}
          >
            {heroLine1}
            <br />
            {heroLine2}
            <br />
            <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'block', clipPath, transition: 'clip-path .05s linear' }}>{heroLine3}</span>
              <span
                style={{
                  position: 'absolute',
                  top: '0.1em',
                  bottom: '0.14em',
                  left: `${revealPct}%`,
                  width: '.055em',
                  background: 'var(--color-accent)',
                  opacity: caretOpacity,
                  pointerEvents: 'none',
                }}
              />
            </span>
          </h1>
          <p style={{ margin: '22px auto 0', maxWidth: 560, font: "400 18px/1.55 var(--font-body)", color: 'rgba(245,243,238,.78)' }}>
            {siteConfig.hero.subtext}
          </p>
        </div>

        <div
          className={risePrompt.className}
          style={{
            margin: '30px auto 0',
            maxWidth: 820,
            border: '1px solid rgba(255,255,255,.16)',
            borderRadius: 20,
            background: 'rgba(13,13,11,.86)',
            backdropFilter: 'blur(16px)',
            padding: 16,
            boxShadow: '0 30px 100px -40px oklch(0.78 0.19 85 / .6)',
            ...risePrompt.style,
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                minWidth: 260,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 14,
                background: 'var(--color-bg)',
                border: '1px solid rgba(255,255,255,.1)',
              }}
            >
              <span style={{ font: "700 12px/1 var(--font-mono)", color: 'var(--color-accent)' }}>/gen</span>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runDemo();
                }}
                placeholder="drone shot over neon Tokyo rooftop, rain, anamorphic flare"
                aria-label="Prompt"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 0,
                  outline: 'none',
                  color: 'var(--color-ink)',
                  font: "400 16px/1.3 var(--font-body)",
                  minWidth: 120,
                }}
              />
            </div>
            <button
              type="button"
              onClick={runDemo}
              style={{
                border: 0,
                cursor: 'pointer',
                padding: '16px 26px',
                borderRadius: 14,
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                font: "700 15px/1 var(--font-body)",
              }}
            >
              Generate free →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
            {QUICK_PICKS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={pick(text)}
                className="hc-chip-hover"
                style={{
                  cursor: 'pointer',
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,.14)',
                  background: 'transparent',
                  color: 'rgba(245,243,238,.75)',
                  font: "500 12.5px/1 var(--font-body)",
                }}
              >
                {text}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 14, height: 8, borderRadius: 99, background: 'var(--color-bg)', overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg,oklch(0.7 0.23 300),oklch(0.78 0.19 85))',
                transition: 'width .28s linear',
              }}
            />
          </div>
          <div style={{ marginTop: 9, font: "400 11.5px/1 var(--font-mono)", color: 'rgba(245,243,238,.5)' }}>{demoStatus}</div>
        </div>

        <div
          className={riseStats.className}
          style={{
            display: 'flex',
            gap: 34,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 34,
            font: "400 12px/1.4 var(--font-mono)",
            color: 'rgba(245,243,238,.45)',
            ...riseStats.style,
          }}
        >
          <div>
            <div style={{ font: "400 34px/1 var(--font-display)", color: 'var(--color-ink)' }}>{siteConfig.freeCredits}</div>
            FREE CREDITS ON SIGNUP
          </div>
          <div>
            <div style={{ font: "400 34px/1 var(--font-display)", color: 'var(--color-ink)' }}>{RECIPE_CHIPS.length}</div>
            ONE-CLICK RECIPES
          </div>
          <div>
            <div style={{ font: "400 34px/1 var(--font-display)", color: 'var(--color-ink)' }}>0</div>
            CREDITS EXPIRED
          </div>
        </div>

        <div className={riseStats.className} style={{ marginTop: 34, ...riseStats.style }}>
          <button
            type="button"
            onClick={onOpenFlow}
            className="hc-glow-btn"
            style={{
              border: 0,
              cursor: 'pointer',
              padding: '16px 30px',
              borderRadius: 999,
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              font: "700 15px/1 var(--font-body)",
            }}
          >
            Start free →
          </button>
        </div>
      </div>
    </div>
  );
}
