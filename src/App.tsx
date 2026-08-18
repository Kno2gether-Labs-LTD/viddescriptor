import { useCallback, useEffect, useRef, useState } from 'react';
import { siteConfig } from './config';
import { useVideoObserver } from './hooks/useVideoObserver';
import { SignupFlow, useSignupFlow } from './components/SignupFlow';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Gallery } from './components/Gallery';
import { CharacterLock } from './components/CharacterLock';
import { Cinema } from './components/Cinema';
import { ImageToVideo } from './components/ImageToVideo';
import { Recipes } from './components/Recipes';
import { DirectorDesk } from './components/DirectorDesk';
import { FreeFilm } from './components/FreeFilm';
import { Pricing } from './components/Pricing';
import { Compare } from './components/Compare';
import { OpenSource } from './components/OpenSource';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { EntryOverlay } from './components/EntryOverlay';
import { StickyCta } from './components/StickyCta';

// Controller ruling: fires at 45s dwell OR once the visitor scrolls past
// 60% of the page's scrollable height, whichever happens first.
const ENTRY_OVERLAY_DELAY_MS = 45000;
const ENTRY_OVERLAY_SCROLL_PERCENT = 60;
const STICKY_SHOW_AT = 900;
const STICKY_HIDE_BELOW = 600;

export default function App() {
  const flow = useSignupFlow();
  const pageRef = useRef<HTMLDivElement>(null);

  // "Touched" means any CTA on the page has ever opened the flow — the
  // entry popup is a conversion surface for people who haven't engaged yet,
  // so it never fires once that's happened, even if the modal is later
  // closed without completing.
  const flowTouchedRef = useRef(false);
  // Idempotency guard: the overlay has two independent triggers now (the
  // 45s timer and the 60%-scroll listener) and must still fire only once,
  // ever — whichever trigger wins first flips this and the other becomes a
  // no-op.
  const entryFiredRef = useRef(false);
  const [entryVisible, setEntryVisible] = useState(false);
  const [entryDismissed, setEntryDismissed] = useState(false);

  const [stickyVisible, setStickyVisible] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const exitFiredRef = useRef(false);

  const handleOpenFlow = useCallback(() => {
    flowTouchedRef.current = true;
    setEntryVisible(false);
    flow.openFlow();
  }, [flow]);

  const handleCloseEntry = useCallback(() => {
    setEntryVisible(false);
    setEntryDismissed(true);
  }, []);

  const handleDismissSticky = useCallback(() => {
    setStickyVisible(false);
    setStickyDismissed(true);
  }, []);

  useEffect(() => {
    document.title = `${siteConfig.brandName} — AI Media Studio`;
  }, []);

  // Entry hype overlay: fires once, at 45s dwell OR once the visitor
  // scrolls past 60% of the page's scrollable height — whichever happens
  // first — unless the flow was already touched by then. `entryFiredRef`
  // makes the two triggers mutually exclusive so a scroll past 60% right
  // around the 45s mark can't double-fire.
  const tryFireEntry = useCallback(() => {
    if (entryFiredRef.current || flowTouchedRef.current) return;
    entryFiredRef.current = true;
    setEntryVisible(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(tryFireEntry, ENTRY_OVERLAY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tryFireEntry]);

  // Exit intent: mouse leaving the top of the viewport opens the flow once,
  // ever — never while the entry overlay or the flow itself is already up.
  useEffect(() => {
    const onMouseOut = (event: MouseEvent) => {
      if (exitFiredRef.current) return;
      if (flow.state.open || entryVisible) return;
      if (event.clientY <= 0) {
        exitFiredRef.current = true;
        handleOpenFlow();
      }
    };
    document.addEventListener('mouseout', onMouseOut);
    return () => document.removeEventListener('mouseout', onMouseOut);
  }, [flow.state.open, entryVisible, handleOpenFlow]);

  // Single shared scroll listener driving both the entry overlay's
  // 60%-scroll trigger and the sticky bottom CTA's show/hide thresholds —
  // one `scroll` subscription instead of two. Each check below is a cheap
  // ref/arithmetic comparison (no layout reads beyond scrollY/scrollHeight,
  // no work once the entry overlay has fired), so this runs directly on
  // every scroll event rather than adding rAF/timer coalescing on top.
  useEffect(() => {
    const onScroll = () => {
      if (!entryFiredRef.current && !flowTouchedRef.current) {
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        if (percent >= ENTRY_OVERLAY_SCROLL_PERCENT) {
          tryFireEntry();
        }
      }

      // Sticky bottom CTA: appears past a scroll threshold, hides again
      // above a lower one (hysteresis avoids flicker at the boundary),
      // stays hidden once dismissed.
      if (!stickyDismissed) {
        const y = window.scrollY;
        if (y > STICKY_SHOW_AT) setStickyVisible(true);
        else if (y < STICKY_HIDE_BELOW) setStickyVisible(false);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [stickyDismissed, tryFireEntry]);

  useVideoObserver(pageRef);

  return (
    <div ref={pageRef} style={{ position: 'relative', width: '100%', minWidth: 0, background: 'var(--color-bg)' }}>
      <TopBar onOpenFlow={handleOpenFlow} />
      <Hero onOpenFlow={handleOpenFlow} />
      <Marquee />
      <Gallery />
      <CharacterLock />
      <Cinema onOpenFlow={handleOpenFlow} />
      <ImageToVideo onOpenFlow={handleOpenFlow} />
      <Recipes onOpenFlow={handleOpenFlow} />
      <DirectorDesk onOpenFlow={handleOpenFlow} />
      <FreeFilm onOpenFlow={handleOpenFlow} />
      <Pricing onOpenFlow={handleOpenFlow} />
      <Compare />
      <OpenSource />
      <FinalCta onOpenFlow={handleOpenFlow} />
      <Footer />

      <StickyCta
        // Force-hidden while the signup flow OR the entry overlay is up, so
        // the three conversion surfaces never stack (reference parity:
        // `!s.entry`).
        visible={stickyVisible && !stickyDismissed && !flow.state.open && !entryVisible}
        onOpenFlow={handleOpenFlow}
        onDismiss={handleDismissSticky}
      />
      <EntryOverlay
        visible={entryVisible && !entryDismissed && !flow.state.open}
        onOpenFlow={handleOpenFlow}
        onClose={handleCloseEntry}
      />

      <SignupFlow
        open={flow.state.open}
        step={flow.state.step}
        state={flow.state}
        onClose={flow.closeFlow}
        onSubmitEmail={flow.submitEmail}
        onContinueToUpsell={flow.continueToUpsell}
        onStartCheckout={flow.startCheckout}
        onSkipUpsell={flow.skipUpsell}
        onRetry={flow.retry}
      />
    </div>
  );
}
