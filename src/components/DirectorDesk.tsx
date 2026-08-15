import { useMemo, useState, type ReactElement } from 'react';

export type DirectorDeskProps = {
  onOpenFlow: () => void;
};

const LOOKS = ['Anamorphic', '16mm', 'Clean digital'] as const;
const LOOK_DESCRIPTIONS = ['anamorphic flare, 2.39:1', '16mm grain, halated highlights', 'clean digital, neutral grade'];

function band(value: number, low: string, mid: string, high: string): string {
  return value < 34 ? low : value < 67 ? mid : high;
}

/** "Not a prompt box, a mixing desk" — sliders that compose a live shot description. */
export function DirectorDesk({ onOpenFlow }: DirectorDeskProps): ReactElement {
  const [motion, setMotion] = useState(62);
  const [speed, setSpeed] = useState(48);
  const [grain, setGrain] = useState(30);
  const [look, setLook] = useState(0);

  const shotDesc = useMemo(() => {
    const speedWord = band(speed, 'Slow', 'Steady', 'Fast');
    const motionWord = band(motion, 'locked-off', 'push-in', 'whip-driven');
    const grainWord = band(grain, 'clean plate', 'light texture', 'heavy stock');
    return `${speedWord} ${motionWord} camera, ${grainWord}, ${LOOK_DESCRIPTIONS[look]}.`;
  }, [motion, speed, grain, look]);

  return (
    <div style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '96px 28px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 44, alignItems: 'center' }}>
        <div>
          <div style={{ font: "700 11px/1 var(--font-mono)", letterSpacing: '.14em', color: 'var(--color-accent2)' }}>DIRECTOR CONTROLS</div>
          <h2 style={{ margin: '14px 0 0', font: "400 clamp(34px,4.4vw,62px)/0.94 var(--font-display)", textTransform: 'uppercase' }}>
            Not a prompt box.
            <br />A mixing desk.
          </h2>
          <p style={{ margin: '16px 0 0', font: "400 17px/1.6 var(--font-body)", color: 'rgba(245,243,238,.66)', maxWidth: 420 }}>
            Every recipe opens up. Push the motion, pull the grade, change the lens, re-roll one shot without
            touching the other five. Drag the sliders here and watch the shot description rewrite itself.
          </p>
          <button
            type="button"
            onClick={onOpenFlow}
            style={{ marginTop: 26, border: 0, cursor: 'pointer', padding: '15px 26px', borderRadius: 999, background: 'var(--color-accent)', color: 'var(--color-bg)', font: "700 15px/1 var(--font-body)" }}
          >
            Open the desk free →
          </button>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,.13)', borderRadius: 20, background: 'var(--color-bg-raised)', padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Slider label="MOTION INTENSITY" value={motion} onChange={setMotion} />
          <Slider label="CAMERA SPEED" value={speed} onChange={setSpeed} />
          <Slider label="FILM GRAIN" value={grain} onChange={setGrain} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LOOKS.map((label, i) => {
              const active = look === i;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setLook(i)}
                  style={{
                    cursor: 'pointer',
                    padding: '9px 14px',
                    borderRadius: 9,
                    border: `1px solid ${active ? 'var(--color-accent)' : 'rgba(255,255,255,.14)'}`,
                    background: active ? 'oklch(0.78 0.19 85 / .16)' : 'transparent',
                    color: active ? 'var(--color-accent)' : 'rgba(245,243,238,.65)',
                    font: "600 12.5px/1 var(--font-body)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '15px 16px', borderRadius: 12, background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ font: "700 10.5px/1 var(--font-mono)", letterSpacing: '.1em', color: 'rgba(245,243,238,.4)' }}>SHOT DESCRIPTION</div>
            <div style={{ marginTop: 9, font: "400 14px/1.5 var(--font-body)", color: 'rgba(245,243,238,.85)' }}>{shotDesc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', font: "700 11px/1 var(--font-mono)", letterSpacing: '.1em', color: 'rgba(245,243,238,.55)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--color-accent)' }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
      />
    </div>
  );
}
