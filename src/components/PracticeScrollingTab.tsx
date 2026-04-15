import { useEffect, useRef } from "react";

interface TabStep {
  stringIndex: number;
  fret: number;
  note: string;
}

interface PracticeScrollingTabProps {
  steps: TabStep[];
  picks: string[];
  tuningStrings: string[]; // low→high
  activeIndex: number;     // current step index, -1 if not playing
  pulseDurationMs: number; // duration of one step in ms, for glide
  bpm: number;
  notesPerBar: number;
  isPlaying: boolean;
  phase: "idle" | "count_in" | "running";
  countInBeat?: number;
}

const STEP_WIDTH = 48;
const LEFT_MARGIN = 36;
const PLAYHEAD_RATIO = 0.30;
const STRING_SPACING = 22;
const TOP_PADDING = 32; // space for pick strokes
const CANVAS_HEIGHT = 196;

export function PracticeScrollingTab({
  steps,
  picks,
  tuningStrings,
  activeIndex,
  pulseDurationMs,
  bpm,
  notesPerBar,
  isPlaying,
  phase,
  countInBeat,
}: PracticeScrollingTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef({
    steps,
    picks,
    tuningStrings,
    activeIndex,
    pulseDurationMs,
    bpm,
    notesPerBar,
    isPlaying,
    phase,
    countInBeat,
  });
  const pulseStartRef = useRef(performance.now());
  const prevActiveIndexRef = useRef(-1);

  // Update params ref each render
  useEffect(() => {
    paramsRef.current = { steps, picks, tuningStrings, activeIndex, pulseDurationMs, bpm, notesPerBar, isPlaying, phase, countInBeat };
  });

  // Reset pulse start time when activeIndex changes (new beat)
  useEffect(() => {
    if (activeIndex !== prevActiveIndexRef.current) {
      pulseStartRef.current = performance.now();
      prevActiveIndexRef.current = activeIndex;
    }
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
      const { steps, picks, tuningStrings, activeIndex, pulseDurationMs, bpm, notesPerBar, isPlaying, phase, countInBeat } = paramsRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx!.clearRect(0, 0, w, h);

      // Background
      ctx!.fillStyle = "#0c0f13";
      ctx!.fillRect(0, 0, w, h);

      const numStrings = Math.min(6, tuningStrings.length);
      const strings = [...tuningStrings].slice(0, numStrings).reverse(); // high E first
      const contentW = w - LEFT_MARGIN;
      const playheadX = LEFT_MARGIN + contentW * PLAYHEAD_RATIO;

      // Count-in overlay
      if (phase === "count_in" && countInBeat !== undefined && countInBeat > 0) {
        ctx!.fillStyle = "rgba(12, 15, 19, 0.85)";
        ctx!.fillRect(0, 0, w, h);
        ctx!.fillStyle = "#f5a623";
        ctx!.font = "bold 48px sans-serif";
        ctx!.textAlign = "center";
        ctx!.fillText(String(countInBeat), w / 2, h / 2 + 16);
        ctx!.font = "14px sans-serif";
        ctx!.fillStyle = "#5a6070";
        ctx!.fillText("Count-in", w / 2, h / 2 + 44);
        rafId = requestAnimationFrame(draw);
        return;
      }

      // String lines
      for (let si = 0; si < numStrings; si++) {
        const y = TOP_PADDING + si * STRING_SPACING;
        ctx!.strokeStyle = "#222830";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(LEFT_MARGIN, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();

        // String label
        ctx!.fillStyle = "#4a5568";
        ctx!.font = "10px monospace";
        ctx!.textAlign = "right";
        ctx!.fillText(strings[si] ?? "", LEFT_MARGIN - 4, y + 4);
      }

      // Playhead line
      ctx!.strokeStyle = "rgba(0, 210, 210, 0.55)";
      ctx!.lineWidth = 1.5;
      ctx!.setLineDash([5, 4]);
      ctx!.beginPath();
      ctx!.moveTo(playheadX, TOP_PADDING - 24);
      ctx!.lineTo(playheadX, TOP_PADDING + (numStrings - 1) * STRING_SPACING + 8);
      ctx!.stroke();
      ctx!.setLineDash([]);

      if (steps.length === 0) {
        ctx!.fillStyle = "#2a3040";
        ctx!.font = "13px sans-serif";
        ctx!.textAlign = "center";
        ctx!.fillText("← Sélectionne un preset (ex: Scale run) dans le setup pour voir la tablature", w / 2, h / 2 - 10);
        ctx!.fillStyle = "#1e2530";
        ctx!.font = "11px sans-serif";
        ctx!.fillText("La tab se génère automatiquement selon le manche + NPS choisis", w / 2, h / 2 + 14);
        rafId = requestAnimationFrame(draw);
        return;
      }

      // Glide progress between steps
      const glide = isPlaying && activeIndex >= 0 && pulseDurationMs > 0
        ? Math.min(1, Math.max(0, (performance.now() - pulseStartRef.current) / pulseDurationMs))
        : 0;

      // Draw each step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step) continue;

        // Position relative to playhead, accounting for glide
        const relPos = (i - activeIndex - glide);
        const x = playheadX + relPos * STEP_WIDTH;

        // Don't draw if off-screen
        if (x < LEFT_MARGIN - STEP_WIDTH * 2 || x > w + STEP_WIDTH) continue;

        const isActive = i === activeIndex;
        const distFromPlayhead = Math.abs(x - playheadX);
        const alpha = isActive ? 1 : Math.max(0.08, 1 - distFromPlayhead / (contentW * 0.65));

        // Display string index: step.stringIndex 0=lowest; canvas si=0 is highest
        const displaySi = (numStrings - 1) - step.stringIndex;
        const noteY = TOP_PADDING + displaySi * STRING_SPACING;

        // Bar line at bar boundaries
        if (i % notesPerBar === 0 && !isActive) {
          ctx!.strokeStyle = `rgba(0, 210, 210, 0.25)`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(x - STEP_WIDTH / 2, TOP_PADDING - 18);
          ctx!.lineTo(x - STEP_WIDTH / 2, TOP_PADDING + (numStrings - 1) * STRING_SPACING + 8);
          ctx!.stroke();
        }

        // Active step: glow column
        if (isActive) {
          ctx!.fillStyle = "rgba(0, 210, 210, 0.07)";
          const colX = x - STEP_WIDTH / 2;
          ctx!.fillRect(colX, TOP_PADDING - 24, STEP_WIDTH, (numStrings - 1) * STRING_SPACING + 40);
        }

        // Pick stroke above strings
        const pickStroke = picks[i];
        if (pickStroke) {
          ctx!.fillStyle = isActive ? "#00d2d2" : `rgba(100, 140, 160, ${alpha * 0.9})`;
          ctx!.font = isActive ? "bold 12px monospace" : "11px monospace";
          ctx!.textAlign = "center";
          ctx!.fillText(pickStroke === "v" ? "↓" : "↑", x, TOP_PADDING - 10);
        }

        // Fret number box
        const fretStr = String(step.fret);
        const boxW = Math.max(22, fretStr.length * 9 + 10);
        const boxH = 20;

        if (isActive) {
          ctx!.fillStyle = "#00d2d2";
          ctx!.shadowBlur = 8;
          ctx!.shadowColor = "rgba(0, 210, 210, 0.6)";
        } else {
          ctx!.fillStyle = `rgba(40, 55, 70, ${alpha * 0.9})`;
          ctx!.shadowBlur = 0;
        }
        ctx!.beginPath();
        ctx!.roundRect(x - boxW / 2, noteY - boxH / 2, boxW, boxH, 4);
        ctx!.fill();
        ctx!.shadowBlur = 0;

        ctx!.fillStyle = isActive ? "#0c0f13" : `rgba(200, 220, 235, ${alpha})`;
        ctx!.font = isActive ? "bold 13px monospace" : "12px monospace";
        ctx!.textAlign = "center";
        ctx!.fillText(fretStr, x, noteY + 5);
      }

      // BPM + bar position bottom-left
      ctx!.fillStyle = "#3a4555";
      ctx!.font = "10px sans-serif";
      ctx!.textAlign = "left";
      const barNum = activeIndex >= 0 ? Math.floor(activeIndex / notesPerBar) + 1 : 0;
      const beatNum = activeIndex >= 0 ? (activeIndex % notesPerBar) + 1 : 0;
      ctx!.fillText(`${bpm} BPM · mesure ${barNum} temps ${beatNum}/${notesPerBar}`, LEFT_MARGIN, h - 6);

      if (isPlaying) {
        ctx!.fillStyle = "#00d2d2";
        ctx!.font = "bold 9px sans-serif";
        ctx!.textAlign = "right";
        ctx!.fillText("● LIVE", w - 8, h - 6);
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={900}
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
