import { useCallback, useRef } from "react";

const MAX_TAPS = 8;
const TAP_TIMEOUT_MS = 2500;

export function useTapTempo(onBpm: (bpm: number) => void) {
  const tapsRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tap = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Drop old taps if gap is too large
    if (taps.length > 0 && now - taps[taps.length - 1] > TAP_TIMEOUT_MS) {
      tapsRef.current = [];
    }

    tapsRef.current = [...tapsRef.current, now].slice(-MAX_TAPS);

    timeoutRef.current = setTimeout(() => {
      tapsRef.current = [];
    }, TAP_TIMEOUT_MS);

    if (tapsRef.current.length < 2) return;

    const intervals: number[] = [];
    for (let i = 1; i < tapsRef.current.length; i++) {
      intervals.push(tapsRef.current[i] - tapsRef.current[i - 1]);
    }

    const avgMs = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    const bpm = Math.round(60000 / avgMs);
    const clamped = Math.max(30, Math.min(300, bpm));
    onBpm(clamped);
  }, [onBpm]);

  return { tap };
}
