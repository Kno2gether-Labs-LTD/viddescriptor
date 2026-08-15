import { useEffect, useState } from 'react';

/**
 * Formats the time remaining until `endsAt` as `DDd HH:MM:SS`, ticking every
 * second. Returns `null` whenever there is nothing to count down to — an
 * unset `endsAt`, an unparsable date, or a date already in the past collapse
 * to the same "nothing to show" signal so every caller can gate rendering
 * with a single falsy check instead of validating the string itself.
 */
export function useCountdown(endsAt?: string): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;

  const msLeft = Math.max(0, end - now);
  const totalSeconds = Math.floor(msLeft / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${pad(days)}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
