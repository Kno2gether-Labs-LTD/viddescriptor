import { useState, type ReactElement } from 'react';
import { MEDIA } from '../lib/media';

export type ImageToVideoProps = {
  onOpenFlow: () => void;
};

/** Image -> video pitch, with a draggable before/after compare wipe. */
export function ImageToVideo({ onOpenFlow }: ImageToVideoProps): ReactElement {
  const [slider, setSlider] = useState(46);

  return (
    <div style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '84px 28px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 44, alignItems: 'center' }}>
        <div>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-accent2)' }}>IMAGE → VIDEO · &quot;BRING A PHOTO TO LIFE&quot;</div>
          <h2 style={{ margin: '14px 0 0', font: "400 clamp(34px,4.4vw,62px)/0.94 var(--font-display)", textTransform: 'uppercase' }}>
            Your still photo,
            <br />
            <span style={{ color: 'var(--color-accent)' }}>moving</span> in seconds
          </h2>
          <p style={{ margin: '16px 0 0', font: "400 17px/1.6 var(--font-body)", color: 'rgba(245,243,238,.66)', maxWidth: 400 }}>
            Drop a product shot, a portrait, a sketch. The Bring a Photo to Life recipe picks a camera move, keeps
            the subject, adds the motion, and never repaints the face.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            {['FACE LOCK', 'NO WATERMARK', 'SHARP 1080P'].map((badge) => (
              <span
                key={badge}
                style={{ padding: '8px 13px', borderRadius: 8, background: 'rgba(255,255,255,.06)', font: "700 11.5px/1 var(--font-mono)", color: 'rgba(245,243,238,.8)' }}
              >
                {badge}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenFlow}
            style={{ marginTop: 26, border: 0, cursor: 'pointer', padding: '15px 26px', borderRadius: 999, background: 'var(--color-accent)', color: 'var(--color-bg)', font: "700 15px/1 var(--font-body)" }}
          >
            Animate a photo free →
          </button>
        </div>

        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)' }}>
          <video
            src={MEDIA.b1.src}
            poster={MEDIA.b1.poster}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', transform: 'scale(1.34)', transformOrigin: 'center 22%' }}
          />
          {/*
            Honest before/after: `/media/b1-still.jpg` is the exact source
            frame the "Bring a Photo to Life" recipe animated into
            MEDIA.b1's video — not a filtered copy of the video itself — so
            the wipe boundary lines up perfectly with no re-alignment. The
            clipping wrapper is `slider`% of the container's width, and the
            <img> inside is scaled back up to the container's full width
            (100/slider * 100%) so it reads as one continuous frame under
            the wipe rather than a squashed thumbnail.
          */}
          <div
            data-testid="b1-still-clip"
            style={{
              position: 'absolute',
              inset: 0,
              width: `${slider}%`,
              overflow: 'hidden',
              borderRight: '2px solid var(--color-accent)',
            }}
          >
            <img
              src="/media/b1-still.jpg"
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: `${(100 / slider) * 100}%`,
                maxWidth: 'none',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: 'scale(1.34)',
                transformOrigin: 'center 22%',
              }}
            />
            <div style={{ position: 'absolute', left: 16, top: 14, font: "700 11px/1 var(--font-mono)", color: 'rgba(245,243,238,.9)', background: 'rgba(10,10,9,.75)', padding: '6px 9px', borderRadius: 6, whiteSpace: 'nowrap' }}>
              BEFORE · still frame
            </div>
          </div>
          <div style={{ position: 'absolute', right: 16, top: 14, font: "700 11px/1 var(--font-mono)", color: 'var(--color-bg)', background: 'var(--color-accent)', padding: '6px 9px', borderRadius: 6 }}>
            AFTER · finished shot
          </div>
          <input
            type="range"
            min={4}
            max={96}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
            aria-label="Drag to compare before and after"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize' }}
          />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, textAlign: 'center', font: "400 11px/1 var(--font-mono)", color: 'rgba(245,243,238,.6)', pointerEvents: 'none' }}>
            ← drag to compare →
          </div>
        </div>
      </div>
    </div>
  );
}
