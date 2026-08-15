import { useEffect, type RefObject } from 'react';

function forceMuted(video: HTMLVideoElement): void {
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.setAttribute('muted', '');
}

function collectVideos(node: Node): HTMLVideoElement[] {
  if (!(node instanceof Element)) return [];
  const own = node instanceof HTMLVideoElement ? [node] : [];
  return [...own, ...Array.from(node.querySelectorAll('video'))];
}

/**
 * Ports the reference deck's `setupVideoObserver` logic: every `<video>`
 * inside `containerRef` is forced muted (three redundant ways, matching the
 * reference, since some browsers ignore the `muted` property when set before
 * the element is in the DOM), upgraded from `preload="none"` to `"auto"` and
 * explicitly `.load()`ed + played the moment it scrolls within 150px of the
 * viewport, and paused the moment it leaves. All videos are paused outright
 * when the tab goes hidden, so decode cost never runs in the background.
 *
 * Late-mounted videos (the EntryOverlay popup, the SignupFlow modal — both
 * mount well after the initial page render, on a timer or a click) need to
 * be picked up too. Rather than relying on a caller-supplied dependency
 * array to re-run setup (which can't see mounts the caller doesn't know to
 * watch for), a `MutationObserver` on `containerRef` reactively (un)observes
 * `<video>` elements as they're added to or removed from the DOM — this
 * mirrors the reference's `componentDidUpdate` re-observe, but event-driven
 * instead of polling video count on every render.
 */
export function useVideoObserver(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            if (video.preload === 'none') {
              video.preload = 'auto';
              video.load();
            }
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {
                // Autoplay can be rejected by the browser; muted looping
                // background video is decorative, so a rejection is a no-op.
              });
            }
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      { rootMargin: '150px' },
    );

    const observeVideo = (video: HTMLVideoElement) => {
      forceMuted(video);
      intersectionObserver.observe(video);
    };

    // Videos already mounted at effect-run time.
    root.querySelectorAll('video').forEach((video) => observeVideo(video as HTMLVideoElement));

    // Videos mounted later (popups, modals) — and unmounted ones, so the
    // IntersectionObserver doesn't keep dead targets around.
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          collectVideos(node).forEach(observeVideo);
        });
        mutation.removedNodes.forEach((node) => {
          collectVideos(node).forEach((video) => intersectionObserver.unobserve(video));
        });
      });
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    const onVisibilityChange = () => {
      if (document.hidden) {
        root.querySelectorAll('video').forEach((video) => (video as HTMLVideoElement).pause());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [containerRef]);
}
