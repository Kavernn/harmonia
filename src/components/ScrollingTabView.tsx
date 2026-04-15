import { useEffect, useRef } from "react";

interface RiffStep {
  stringIndex: number;
  fret: number;
}

interface ScrollingTabViewProps {
  steps: RiffStep[];
  tuningStrings: string[]; // low→high, e.g. ["E2","A2","D3","G3","B3","E4"]
  bpm: number;
  notesPerBar: number;
  playStartTime: number | null; // Date.now() when play started, null = stopped
}

const STRING_COUNT = 6;
const CANVAS_HEIGHT = 160;
const LEFT_MARGIN = 28; // string label area
const RIGHT_MARGIN = 12;
const PLAYHEAD_RATIO = 0.28; // playhead at 28% from left of content area
const STEP_WIDTH = 52; // pixels per step
const STRING_SPACING = 20;
const TOP_PADDING = 16;

export function ScrollingTabView({
  steps,
  tuningStrings,
  bpm,
  notesPerBar,
  playStartTime,
}: ScrollingTabViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep all animation params in a ref to avoid stale closures in RAF
  const paramsRef = useRef({
    steps,
    tuningStrings,
    bpm,
    notesPerBar,
    playStartTime,
  });
  useEffect(() => {
    paramsRef.current = { steps, tuningStrings, bpm, notesPerBar, playStartTime };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let running = true;

    function draw() {
      if (!running || !canvas) return;
      const { steps, tuningStrings, bpm, notesPerBar, playStartTime } = paramsRef.current;
      const stepCount = steps.length;

      const w = canvas.width;
      const h = canvas.height;
      ctx!.clearRect(0, 0, w, h);

      // Background
      ctx!.fillStyle = "#0c0f13";
      ctx!.fillRect(0, 0, w, h);

      const contentW = w - LEFT_MARGIN - RIGHT_MARGIN;
      const playheadX = LEFT_MARGIN + contentW * PLAYHEAD_RATIO;

      // String lines
      const strings = [...tuningStrings].reverse(); // high E first in display
      const numStrings = Math.min(STRING_COUNT, strings.length);

      for (let si = 0; si < numStrings; si++) {
        const y = TOP_PADDING + si * STRING_SPACING;
        ctx!.strokeStyle = "#2a2f38";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(LEFT_MARGIN, y);
        ctx!.lineTo(w - RIGHT_MARGIN, y);
        ctx!.stroke();

        // String label
        ctx!.fillStyle = "#5a6070";
        ctx!.font = "10px monospace";
        ctx!.textAlign = "right";
        ctx!.fillText(strings[si] ?? "", LEFT_MARGIN - 4, y + 4);
      }

      // Playhead line
      ctx!.strokeStyle = "rgba(0, 210, 210, 0.6)";
      ctx!.lineWidth = 1.5;
      ctx!.setLineDash([4, 3]);
      ctx!.beginPath();
      ctx!.moveTo(playheadX, TOP_PADDING - 10);
      ctx!.lineTo(playheadX, TOP_PADDING + (numStrings - 1) * STRING_SPACING + 10);
      ctx!.stroke();
      ctx!.setLineDash([]);

      if (stepCount === 0 || steps.length === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      // Scroll offset
      const stepMs = ((60 * 4) / (bpm * notesPerBar)) * 1000;
      const totalMs = stepMs * stepCount;
      const elapsed = playStartTime !== null ? (Date.now() - playStartTime) % totalMs : 0;
      const scrollOffset = (elapsed / stepMs) * STEP_WIDTH; // px scrolled

      // Draw each step
      for (let i = 0; i < stepCount; i++) {
        const step = steps[i];
        if (!step) continue;

        // x position relative to playhead
        const rawX = playheadX + i * STEP_WIDTH - scrollOffset;

        // Wrap looping: also draw at rawX + totalPx and rawX - totalPx
        const totalPx = stepCount * STEP_WIDTH;
        const positions = [rawX, rawX + totalPx, rawX - totalPx];

        for (const x of positions) {
          if (x < LEFT_MARGIN - STEP_WIDTH || x > w) continue;

          // Display string index: tuningStrings is low→high; step.stringIndex 0 = lowest
          // In canvas, si=0 is topmost (highest string)
          const displaySi = (numStrings - 1) - step.stringIndex;
          const y = TOP_PADDING + displaySi * STRING_SPACING;

          const isCurrent = playStartTime !== null &&
            Math.abs(x - playheadX) < STEP_WIDTH * 0.6;

          const fretStr = String(step.fret);
          const boxW = Math.max(20, fretStr.length * 10 + 8);
          const boxH = 18;

          if (isCurrent) {
            ctx!.fillStyle = "#00d2d2";
          } else {
            const dist = Math.abs(x - playheadX);
            const alpha = Math.max(0.15, 1 - dist / (contentW * 0.7));
            ctx!.fillStyle = `rgba(255, 255, 255, ${alpha * 0.12})`;
          }
          ctx!.beginPath();
          ctx!.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 3);
          ctx!.fill();

          ctx!.fillStyle = isCurrent ? "#0c0f13" : "rgba(255,255,255,0.7)";
          ctx!.font = `${isCurrent ? "bold " : ""}12px monospace`;
          ctx!.textAlign = "center";
          ctx!.fillText(fretStr, x, y + 4);
        }
      }

      // BPM label bottom-left
      ctx!.fillStyle = "#4a5060";
      ctx!.font = "10px sans-serif";
      ctx!.textAlign = "left";
      ctx!.fillText(`${bpm} BPM · ${notesPerBar}/4`, LEFT_MARGIN, h - 6);

      // "LIVE" indicator when playing
      if (playStartTime !== null) {
        ctx!.fillStyle = "#00d2d2";
        ctx!.font = "bold 9px sans-serif";
        ctx!.textAlign = "right";
        ctx!.fillText("● LIVE", w - RIGHT_MARGIN, h - 6);
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, []); // only mount/unmount — params flow through ref

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={CANVAS_HEIGHT}
      style={{
        width: "100%",
        height: CANVAS_HEIGHT,
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-tertiary)",
        display: "block",
      }}
    />
  );
}
