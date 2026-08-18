import type { ReactElement } from 'react';
import { MEDIA, type SlotId } from '../lib/media';

export type CinemaProps = {
  onOpenFlow: () => void;
};

type FilmCard = {
  slot: SlotId;
  title: string;
  meta: string;
  line: string;
};

const FILMS: FilmCard[] = [
  {
    slot: 'filmPaperBoat',
    title: 'The Paper Boat',
    meta: '61 s · three scenes · watercolour',
    line: 'One sentence in. Character sheets, storyboard and a three-scene cut out.',
  },
  {
    slot: 'filmLighthouse',
    title: 'The Lighthouse Keeper',
    meta: '16 s · made from the portal chat',
    line: "Typed as one sentence into the studio's own chat — no setup.",
  },
  {
    slot: 'filmCave',
    title: 'The Cave on the Mountainside',
    meta: '30 s · one continuous take',
    line: 'Directed over MCP from Claude Code.',
  },
];

const STEPS: { n: string; title: string }[] = [
  { n: '01', title: 'Plan the scenes' },
  { n: '02', title: 'Cast from sheets' },
  { n: '03', title: 'Render takes with sound' },
  { n: '04', title: 'Assemble the cut' },
];

function FilmTile({ card, large }: { card: FilmCard; large?: boolean }): ReactElement {
  return (
    <div
      className="hc-card-hover"
      style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.09)' }}
    >
      <video
        src={MEDIA[card.slot].src}
        poster={MEDIA[card.slot].poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 45%,rgba(10,10,9,.94))' }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ font: `400 ${large ? 26 : 20}px/1 var(--font-display)`, textTransform: 'uppercase', textShadow: '0 2px 12px rgba(0,0,0,.8)' }}>
          {card.title}
        </span>
        <span style={{ font: "700 11.5px/1.3 var(--font-mono)", color: 'var(--color-accent)' }}>{card.meta}</span>
        <span style={{ font: "400 11.5px/1.4 var(--font-mono)", color: 'rgba(245,243,238,.7)', maxWidth: 420 }}>{card.line}</span>
      </div>
    </div>
  );
}

/**
 * "Cinema / Director agent" showcase. Three real films rendered by the
 * platform's Director agent, plus a compact "how it works" strip. Truthful
 * copy only — no credit prices, render times, or model/provider names
 * anywhere in this section (verified against the platform code).
 */
export function Cinema({ onOpenFlow }: CinemaProps): ReactElement {
  const [paperBoat, lighthouse, cave] = FILMS;

  return (
    <div id="cinema" style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '96px 28px 0', scrollMarginTop: 130 }}>
      <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-accent)' }}>
        CINEMA · DIRECTOR AGENT
      </div>
      <h2 style={{ margin: '14px 0 0', font: "400 clamp(38px,5.6vw,80px)/0.92 var(--font-display)", textTransform: 'uppercase' }}>
        Type an idea.
        <br />
        Get <span style={{ color: 'var(--color-accent)' }}>a film.</span>
      </h2>
      <p style={{ margin: '18px 0 0', maxWidth: 620, font: "400 16.5px/1.6 var(--font-body)", color: 'rgba(245,243,238,.66)' }}>
        Turn on Cinema and describe the film. The Director plans the scenes, casts characters from their sheets,
        renders each take with sound, and assembles the cut — from the studio&apos;s own chat, or from Claude Code
        and Cursor over MCP. Takes run up to 30 seconds each; films are assembled scene by scene, as long as the
        story needs.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 34 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <FilmTile card={paperBoat!} large />
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 14 }}>
          <FilmTile card={lighthouse!} />
          <FilmTile card={cave!} />
        </div>
      </div>

      {/* How the Director works. */}
      <div style={{ marginTop: 54 }}>
        <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.1em', color: 'rgba(245,243,238,.45)' }}>
          HOW THE DIRECTOR WORKS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 16 }}>
          <div style={{ padding: 18, borderRadius: 14, background: 'var(--color-bg-raised)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ font: "700 20px/1 var(--font-mono)", color: 'var(--color-accent)' }}>{STEPS[0]!.n}</div>
            <div style={{ marginTop: 10, font: "600 14.5px/1.3 var(--font-body)" }}>{STEPS[0]!.title}</div>
          </div>

          <div style={{ padding: 18, borderRadius: 14, background: 'var(--color-bg-raised)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ font: "700 20px/1 var(--font-mono)", color: 'var(--color-accent)' }}>{STEPS[1]!.n}</div>
            <div style={{ marginTop: 10, font: "600 14.5px/1.3 var(--font-body)" }}>{STEPS[1]!.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <img
                src={MEDIA.filmSheetBoat.src}
                alt="Character sheet for the paper boat"
                style={{ width: '50%', borderRadius: 8, display: 'block', border: '1px solid rgba(255,255,255,.1)' }}
              />
              <img
                src={MEDIA.filmSheetDuck.src}
                alt="Character sheet for the duck"
                style={{ width: '50%', borderRadius: 8, display: 'block', border: '1px solid rgba(255,255,255,.1)' }}
              />
            </div>
          </div>

          <div style={{ padding: 18, borderRadius: 14, background: 'var(--color-bg-raised)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ font: "700 20px/1 var(--font-mono)", color: 'var(--color-accent)' }}>{STEPS[2]!.n}</div>
            <div style={{ marginTop: 10, font: "600 14.5px/1.3 var(--font-body)" }}>{STEPS[2]!.title}</div>
          </div>

          <div style={{ padding: 18, borderRadius: 14, background: 'var(--color-bg-raised)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ font: "700 20px/1 var(--font-mono)", color: 'var(--color-accent)' }}>{STEPS[3]!.n}</div>
            <div style={{ marginTop: 10, font: "600 14.5px/1.3 var(--font-body)" }}>{STEPS[3]!.title}</div>
            <img
              src={MEDIA.filmContact.src}
              alt="Contact sheet of the assembled cut"
              style={{ width: '100%', marginTop: 12, borderRadius: 8, display: 'block', border: '1px solid rgba(255,255,255,.1)' }}
            />
          </div>
        </div>

        {/* Wide artefact tile — the storyboard canvas. A UI screenshot, so
            it's dimmed with the page's usual gradient to read as an
            artefact rather than a marketing shot. */}
        <div style={{ position: 'relative', marginTop: 14, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.09)' }}>
          <img
            src={MEDIA.filmStoryboard.src}
            alt="The film on the storyboard canvas — scenes, takes and the cut, with a live spend ledger"
            style={{ width: '100%', aspectRatio: '21/9', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 55%,rgba(10,10,9,.92))' }} />
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 12, font: "400 11.5px/1.5 var(--font-mono)", color: 'rgba(245,243,238,.85)' }}>
            The film on the storyboard canvas — scenes, takes and the cut, with a live spend ledger.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 30, textAlign: 'center' }}>
        <button
          type="button"
          onClick={onOpenFlow}
          className="hc-glow-btn"
          style={{ border: 0, cursor: 'pointer', padding: '15px 26px', borderRadius: 999, background: 'var(--color-accent)', color: 'var(--color-bg)', font: "700 15px/1 var(--font-body)" }}
        >
          Make a film free →
        </button>
        <div style={{ marginTop: 12, font: "400 11px/1.4 var(--font-mono)", color: 'rgba(245,243,238,.45)' }}>
          The Cinema mode ships inside the studio — same credits, same account.
        </div>
      </div>
    </div>
  );
}
