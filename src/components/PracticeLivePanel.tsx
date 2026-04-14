import { useEffect, useMemo, useRef, useState } from "react";
import { noteValue, type FretPosition, type ProgressionChord, type ScaleSuggestion } from "../music";
import type { PracticePlan, PracticeRepScore, PracticeTarget } from "../practice";
import type { PracticePhase } from "../hooks/usePracticeEngine";
import { Fretboard } from "./Fretboard";

interface PracticeLivePanelProps {
  plan: PracticePlan | null;
  progression: ProgressionChord[];
  phase: PracticePhase;
  isPlaying: boolean;
  selectedScale: ScaleSuggestion | null;
  scalePositions: FretPosition[];
  tuningStrings: string[];
  scalePositionIndex?: number | null;
  scalePositionCount?: number | null;
  minimalView?: boolean;
  trainingOnly?: boolean;
  tabOnlyView?: boolean;
  currentBpm: number;
  currentStepIndex: number;
  currentPulse: number;
  currentPulseTotal: number;
  currentTargets: PracticeTarget[];
  completedCycles: number;
  consecutiveCleanReps: number;
  countInBeat: number;
  midiStatus: string;
  midiInputs: { id: string; name: string; state: MIDIPortDeviceState }[];
  midiError: string | null;
  heardNote: { noteLabel: string; inputName: string; hit: boolean } | null;
  lastRepScore: PracticeRepScore | null;
  repHistory: Array<{ cycle: number; bpm: number; score: PracticeRepScore }>;
  cueEnabled: boolean;
  onToggleCue: () => void;
  onReplayCue: () => void;
  onNudgeBpm: (delta: number) => void;
  onStartPractice: () => void;
  onStopPractice: () => void;
}

function phaseLabel(phase: PracticePhase) {
  switch (phase) {
    case "count_in":
      return "Count-in";
    case "running":
      return "Live";
    default:
      return "Setup";
  }
}

function midiStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "MIDI prêt";
    case "connecting":
      return "Connexion MIDI…";
    case "unsupported":
      return "Web MIDI indisponible";
    case "error":
      return "Erreur MIDI";
    default:
      return "MIDI inactif";
  }
}

function humanizeRole(role: string) {
  return role.replaceAll("_", " ");
}

function isResolutionRole(role: string) {
  return role === "resolution" || role === "phrase_answer";
}

function tempoPulseMultiplier(tempoUnit: string | undefined) {
  switch (tempoUnit) {
    case "whole":
      return 16;
    case "half":
      return 8;
    case "quarter":
      return 4;
    case "eighth":
      return 2;
    case "sixteenth":
      return 1;
    default:
      return 4;
  }
}

function uniquePitchClasses(targets: PracticeTarget[]) {
  return Array.from(new Set(targets.flatMap((target) => target.pitch_classes)));
}

function buildScaleTabSequence(
  positions: FretPosition[],
  stringCount: number,
  windowStart: number,
  windowSize: number,
  notesPerString: number,
  direction: "ascending" | "descending" | "up_down",
) {
  const windowEnd = windowStart + windowSize;
  const sequence: Array<{ stringIndex: number; fret: number; note: string }> = [];
  const pickStrokes: string[] = [];
  let pickIndex = 0;

  const stringOrder = direction === "descending"
    ? Array.from({ length: stringCount }, (_, i) => stringCount - 1 - i)
    : Array.from({ length: stringCount }, (_, i) => i);

  for (const stringIndex of stringOrder) {
    const stringPositions = positions
      .filter((position) =>
        position.string === stringIndex
        && position.fret >= windowStart
        && position.fret <= windowEnd
        && !position.is_avoid
      )
      .sort((a, b) => direction === "descending" ? b.fret - a.fret : a.fret - b.fret)
      .slice(0, notesPerString);

    stringPositions.forEach((position) => {
      sequence.push({
        stringIndex,
        fret: position.fret,
        note: position.note,
      });
      pickStrokes.push(pickIndex % 2 === 0 ? "v" : "^");
      pickIndex += 1;
    });
  }

  if (direction === "up_down") {
    const down = sequence.slice(0, -1).reverse();
    const downPicks = pickStrokes.slice(0, -1).reverse();
    return {
      steps: [...sequence, ...down],
      picks: [...pickStrokes, ...downPicks],
    };
  }

  return { steps: sequence, picks: pickStrokes };
}

function parseMissedTarget(line: string | undefined) {
  if (!line) return null;
  const match = /^Missed ([a-z_]+) on (.+) pulse (\d+) \(expected (.+)\)\.$/.exec(line);
  if (!match) return null;

  return {
    role: humanizeRole(match[1]),
    chord: match[2],
    pulse: Number(match[3]),
    expected: match[4],
  };
}

function weakestArea(score: PracticeRepScore | null) {
  if (!score) return null;

  const areas = [
    {
      id: "pitch",
      label: "justesse",
      score: score.pitch_score,
      advice: "Ralentis et verrouille une seule cible jusqu'à la jouer juste à chaque cycle.",
    },
    {
      id: "timing",
      label: "placement",
      score: score.timing_score,
      advice: "Reste sur peu de notes et cale-les exactement sur le pulse avant d'en ajouter.",
    },
    {
      id: "targets",
      label: "cibles",
      score: score.target_score,
      advice: "Anticipe l'accord en cours et vise d'abord la cible affichée avant de remplir la phrase.",
    },
    {
      id: "resolution",
      label: "résolution",
      score: score.resolution_score,
      advice: "Laisse la tension respirer puis retombe clairement sur la note de résolution indiquée.",
    },
  ];

  return areas.sort((left, right) => left.score - right.score)[0] ?? null;
}

export function PracticeLivePanel({
  plan,
  progression,
  phase,
  isPlaying,
  selectedScale,
  scalePositions,
  tuningStrings,
  scalePositionIndex,
  scalePositionCount,
  minimalView = false,
  trainingOnly = false,
  tabOnlyView = false,
  currentBpm,
  currentStepIndex,
  currentPulse,
  currentPulseTotal,
  currentTargets,
  completedCycles,
  consecutiveCleanReps,
  countInBeat,
  midiStatus,
  midiInputs,
  midiError,
  heardNote,
  lastRepScore,
  repHistory,
  cueEnabled,
  onToggleCue,
  onReplayCue,
  onNudgeBpm,
  onStartPractice,
  onStopPractice,
}: PracticeLivePanelProps) {
  const currentChord = progression[currentStepIndex] ?? null;
  const nextChord = progression[(currentStepIndex + 1) % Math.max(1, progression.length)] ?? currentChord;
  const canStart = Boolean(plan) && progression.length > 0 && midiStatus === "ready" && midiInputs.length > 0;
  const displayedBpm = currentBpm || plan?.start_bpm || 0;
  const latestRepLabelColor = !lastRepScore
    ? "var(--color-text-primary)"
    : lastRepScore.clean_rep
      ? "var(--color-success)"
      : "var(--color-danger)";
  const fallbackTargets = useMemo(
    () => (plan ? plan.targets.filter((target) => target.step_index === currentStepIndex && target.pulse_index === 0) : []),
    [currentStepIndex, plan],
  );
  const focusTargets = currentTargets.length > 0 ? currentTargets : fallbackTargets;
  const highlightedPitchClasses = useMemo(() => uniquePitchClasses(focusTargets), [focusTargets]);
  const nextResolutionTarget = useMemo(() => {
    if (!plan) return null;

    return plan.targets.find((target) =>
      (target.step_index > currentStepIndex
        || (target.step_index === currentStepIndex && target.pulse_index >= currentPulse))
      && isResolutionRole(target.role)
    ) ?? plan.targets.find((target) => isResolutionRole(target.role)) ?? null;
  }, [currentPulse, currentStepIndex, plan]);
  const sanitizedScalePositions = useMemo(() => {
    const resolutionPitchClasses = new Set(nextResolutionTarget?.pitch_classes ?? []);
    return scalePositions.map((position) => ({
      ...position,
      is_characteristic: false,
      is_modal_avoid: false,
      is_resolution: resolutionPitchClasses.has(position.note),
    }));
  }, [nextResolutionTarget, scalePositions]);
  const practiceWindowSize = plan?.window_size ?? 5;
  const practiceWindowStart = (() => {
    const maxWindowStart = Math.max(0, 24 - practiceWindowSize);
    if (plan?.position_start != null) {
      return Math.min(maxWindowStart, Math.max(0, plan.position_start));
    }

    const highlightedSet = new Set([
      ...highlightedPitchClasses,
      ...(nextResolutionTarget?.pitch_classes ?? []),
    ]);
    const highlightedFrets = sanitizedScalePositions
      .filter((position) => highlightedSet.has(position.note) && !position.is_avoid && position.fret > 0)
      .map((position) => position.fret);
    if (highlightedFrets.length > 0) {
      return Math.min(maxWindowStart, Math.max(0, Math.min(...highlightedFrets) - 1));
    }

    const chordFrets = sanitizedScalePositions
      .filter((position) => currentChord?.chord_tones.includes(position.note) && !position.is_avoid && position.fret > 0)
      .map((position) => position.fret);
    if (chordFrets.length > 0) {
      return Math.min(maxWindowStart, Math.max(0, Math.min(...chordFrets) - 1));
    }

    return 0;
  })();
  const missedTarget = useMemo(
    () => parseMissedTarget(lastRepScore?.feedback.find((line) => line.startsWith("Missed "))),
    [lastRepScore],
  );
  const weakest = useMemo(() => weakestArea(lastRepScore), [lastRepScore]);
  const focusTarget = focusTargets[0] ?? null;
  const scaleWorkoutActive = plan?.exercise_id === "scale-speed-picking";
  const scaleTabData = useMemo(() => {
    if (!scaleWorkoutActive) return { steps: [], picks: [] } as const;
    return buildScaleTabSequence(
      sanitizedScalePositions,
      tuningStrings.length,
      practiceWindowStart,
      practiceWindowSize,
      plan?.scale_run_notes_per_string ?? 3,
      plan?.scale_run_direction ?? "ascending",
    );
  }, [
    scaleWorkoutActive,
    sanitizedScalePositions,
    tuningStrings.length,
    practiceWindowStart,
    practiceWindowSize,
    plan?.scale_run_direction,
    plan?.scale_run_notes_per_string,
  ]);
  const scaleTabSteps = scaleTabData.steps;
  const scaleTabPicks = scaleTabData.picks;
  const tabStrings = tuningStrings.map((label, index) => ({ label, index })).slice().reverse();
  const tabActiveIndex = phase === "running" && scaleTabSteps.length > 0
    ? currentPulse % scaleTabSteps.length
    : -1;
  const [tabZoom, setTabZoom] = useState(1);
  const [tabGlide, setTabGlide] = useState(true);
  const tabScrollRef = useRef<HTMLDivElement | null>(null);
  const tabHighlightRef = useRef<HTMLDivElement | null>(null);
  const glideFrameRef = useRef<number | null>(null);
  const glidePulseStartRef = useRef<number>(0);
  const tabColWidth = Math.round(26 * tabZoom);
  const tabRowHeight = Math.round(22 * tabZoom);
  const tabHeaderHeight = Math.round(18 * tabZoom);
  const tabStepStride = tabColWidth + 4;
  const tabLeadOffset = 44;
  const barLength = 4;
  const npsValue = plan?.scale_run_notes_per_string ?? 3;
  const notesPerBar = Math.max(1, barLength * npsValue);
  const notesPerMinute = scaleWorkoutActive
    ? Math.round(displayedBpm * tempoPulseMultiplier(plan?.tempo_unit))
    : null;
  const tabActiveBar = tabActiveIndex >= 0 ? Math.floor(tabActiveIndex / notesPerBar) : -1;
  const scalePositionLabel = scaleWorkoutActive && plan
    ? `Position ${scalePositionIndex ?? "—"}/${scalePositionCount ?? "—"} · frets ${practiceWindowStart}-${practiceWindowStart + practiceWindowSize}`
    : null;
  const paletteLabel = selectedScale
    ? `${selectedScale.scale_root} ${selectedScale.scale_name}`
    : (plan ? `${plan.solo_scale_root} ${plan.solo_scale_name}` : "—");
  const ultraMinimal = minimalView && trainingOnly;
  const isTabOnly = tabOnlyView || (minimalView && trainingOnly && scaleWorkoutActive);
  const techniqueLabel = scaleWorkoutActive
    ? plan?.exercise_id === "economy-picking-flow"
      ? "Economy picking"
      : plan?.exercise_id === "sweep-picking-arpeggios"
        ? "Sweep picking"
        : plan?.exercise_id === "alternate-picking-foundation"
          ? "Alternate picking"
          : "Scale run"
    : null;
  const techniqueTip = scaleWorkoutActive
    ? plan?.exercise_id === "economy-picking-flow"
      ? "Garde la direction du médiator sur le changement de corde."
      : plan?.exercise_id === "sweep-picking-arpeggios"
        ? "Un seul mouvement continu, laisse sonner chaque note."
        : plan?.exercise_id === "alternate-picking-foundation"
          ? "Down-up strict, attaque régulière."
          : "Focus sur la régularité du flow."
    : null;

  useEffect(() => {
    glidePulseStartRef.current = performance.now();
  }, [tabActiveIndex]);

  useEffect(() => {
    if (!tabScrollRef.current || tabActiveIndex < 0) return;
    if (tabGlide) return;
    const container = tabScrollRef.current;
    const targetX = tabLeadOffset + (tabActiveIndex * tabStepStride) + (tabColWidth / 2);
    const nextScrollLeft = Math.max(0, targetX - (container.clientWidth / 2));
    const scrollPadding = tabColWidth * 6;
    const visibleStart = container.scrollLeft + scrollPadding;
    const visibleEnd = container.scrollLeft + container.clientWidth - scrollPadding;
    if (targetX < visibleStart || targetX > visibleEnd) {
      container.scrollTo({ left: nextScrollLeft, behavior: "smooth" });
    }
    if (tabHighlightRef.current) {
      tabHighlightRef.current.style.transform = `translateX(${tabLeadOffset + tabActiveIndex * tabStepStride}px)`;
    }
  }, [tabActiveIndex, tabColWidth, tabGlide, tabLeadOffset, tabStepStride]);

  useEffect(() => {
    if (!tabScrollRef.current || tabActiveIndex < 0 || !tabGlide) return;

    const container = tabScrollRef.current;
    const bpm = Math.max(1, displayedBpm || 1);
    const pulsesPerQuarter = tempoPulseMultiplier(plan?.tempo_unit) / 4;
    const pulseDurationMs = (60_000 / bpm) / Math.max(1, pulsesPerQuarter);

    const tick = () => {
      const now = performance.now();
      const progress = Math.min(1, Math.max(0, (now - glidePulseStartRef.current) / pulseDurationMs));
      const startX = tabLeadOffset + (tabActiveIndex * tabStepStride) + (tabColWidth / 2);
      const nextX = tabLeadOffset + ((tabActiveIndex + 1) * tabStepStride) + (tabColWidth / 2);
      const targetX = startX + (nextX - startX) * progress;
      const nextScrollLeft = Math.max(0, targetX - (container.clientWidth / 2));
      container.scrollLeft = nextScrollLeft;
      if (tabHighlightRef.current) {
        tabHighlightRef.current.style.transform = `translateX(${tabLeadOffset + (tabActiveIndex + progress) * tabStepStride}px)`;
      }
      glideFrameRef.current = requestAnimationFrame(tick);
    };

    glideFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (glideFrameRef.current != null) {
        cancelAnimationFrame(glideFrameRef.current);
        glideFrameRef.current = null;
      }
    };
  }, [tabActiveIndex, tabColWidth, tabGlide, displayedBpm, plan?.tempo_unit, tabLeadOffset, tabStepStride]);

  return (
    <div style={{
      padding: 14,
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      background: "var(--color-background-primary)",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      {!isTabOnly && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
            Practice live
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}>
              {phaseLabel(phase)}
            </span>
            <span style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 999,
              background: phase === "running" ? "var(--color-success-soft)" : phase === "count_in" ? "var(--color-warning-soft)" : "var(--color-accent-soft)",
              color: phase === "running" ? "var(--color-success)" : phase === "count_in" ? "var(--color-warning)" : "var(--color-accent-strong)",
            }}>
              {midiStatusLabel(midiStatus)}
            </span>
          </div>
          {!ultraMinimal && plan && (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
              {plan.exercise_name} · {displayedBpm} BPM · {plan.tempo_unit}
            </div>
          )}
          {!ultraMinimal && plan && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "var(--color-accent-soft)", color: "var(--color-accent-strong)", fontWeight: 600 }}>
                {plan.category}
              </span>
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "var(--color-accent-soft)", color: "var(--color-accent-primary)", fontWeight: 600 }}>
                {plan.goal}
              </span>
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "var(--color-success-soft)", color: "var(--color-success)", fontWeight: 600 }}>
                {plan.target_strategy}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Tempo</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[-5, -1, 1, 5].map((delta) => (
                <button
                  key={delta}
                  onClick={() => onNudgeBpm(delta)}
                  style={{
                    border: "0.5px solid var(--color-border-tertiary)",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-secondary)",
                    borderRadius: "var(--border-radius-sm)",
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onToggleCue}
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: cueEnabled ? "var(--color-accent-soft)" : "var(--color-background-primary)",
              color: cueEnabled ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cue {cueEnabled ? "on" : "off"}
          </button>
          <button
            onClick={onReplayCue}
            disabled={!currentTargets.length}
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: currentTargets.length ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: currentTargets.length ? "pointer" : "default",
              opacity: currentTargets.length ? 1 : 0.55,
            }}
          >
            Replay cue
          </button>
          {isPlaying ? (
            <button
              onClick={onStopPractice}
              style={{
                border: "1px solid var(--color-danger)",
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
                borderRadius: "var(--border-radius-md)",
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Stop workout
            </button>
          ) : (
            <button
              onClick={onStartPractice}
              disabled={!canStart}
              style={{
                border: "1px solid var(--color-accent-primary)",
                background: !canStart ? "var(--color-background-tertiary)" : "var(--color-accent-primary)",
                color: !canStart ? "var(--color-text-tertiary)" : "var(--color-accent-contrast)",
                borderRadius: "var(--border-radius-md)",
                padding: "8px 12px",
              fontSize: 11,
              fontWeight: 700,
              cursor: !canStart ? "default" : "pointer",
            }}
          >
            Start workout
            </button>
          )}
        </div>
      </div>
      )}

      {scaleWorkoutActive && !ultraMinimal && !isTabOnly && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          padding: "10px 12px",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
        }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>BPM</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
              {displayedBpm}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Notes/min</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-success)", marginTop: 4 }}>
              {notesPerMinute ?? "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Streak clean</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent-strong)", marginTop: 4 }}>
              {consecutiveCleanReps}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Pattern</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>
              {plan?.scale_run_direction ?? "ascending"} · {npsValue} NPS
            </div>
            {scalePositionLabel && (
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 6 }}>
                {scalePositionLabel}
              </div>
            )}
            {techniqueLabel && (
              <div style={{ fontSize: 10, color: "var(--color-accent-primary)", marginTop: 6, fontWeight: 600 }}>
                {techniqueLabel}
              </div>
            )}
            {techniqueTip && (
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                {techniqueTip}
              </div>
            )}
          </div>
        </div>
      )}

      {!trainingOnly && !isTabOnly && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "10px 12px",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Progression — {progression.map((step) => step.display_name).join(" · ") || "—"}
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Solo palette — {paletteLabel}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Box {practiceWindowStart + 1}–{practiceWindowStart + practiceWindowSize} · {tuningStrings.join(" · ")}
          </div>
        </div>
      )}

      {!minimalView && !isTabOnly && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {progression.map((step, index) => {
            const active = index === currentStepIndex && phase === "running";
            const hasTarget = focusTargets.some((target) => target.step_index === index);
            const duration = noteValue(plan?.step_durations[index] ?? "quarter");

            return (
              <div
                key={`${step.roman}-${index}`}
                style={{
                  minWidth: 124,
                  border: active ? "2px solid var(--color-accent-primary)" : hasTarget ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                  background: active ? "var(--color-accent-primary)" : hasTarget ? "var(--color-accent-soft)" : "var(--color-background-secondary)",
                  color: active ? "var(--color-accent-contrast)" : hasTarget ? "var(--color-accent-primary)" : "var(--color-text-primary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "10px 11px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: active ? "var(--color-accent-contrast)" : "var(--color-text-tertiary)" }}>
                    {step.roman}
                  </div>
                  <span style={{
                    borderRadius: 999,
                    padding: "2px 6px",
                    fontSize: 9,
                    fontWeight: 700,
                    background: active ? "var(--color-accent-soft)" : "var(--color-background-tertiary)",
                    color: active ? "var(--color-accent-strong)" : hasTarget ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                  }}>
                    {duration.symbol} {duration.short}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 5 }}>
                  {step.display_name}
                </div>
                <div style={{ fontSize: 10, color: active ? "var(--color-accent-contrast)" : "var(--color-text-tertiary)", marginTop: 5 }}>
                  {step.chord_tones.join(" · ")}
                </div>
                {hasTarget && (
                  <div style={{ fontSize: 10, color: active ? "var(--color-accent-contrast)" : "var(--color-accent-primary)", marginTop: 6, fontWeight: 600 }}>
                    Target maintenant
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: minimalView || isTabOnly ? "1fr" : "minmax(250px, 320px) 1fr", gap: 12, alignItems: "start" }}>
        {!minimalView && !isTabOnly && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "12px",
              background: "var(--color-background-secondary)",
            }}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                Focus now
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
                {focusTarget ? focusTarget.chord_name : (currentChord?.display_name ?? "—")}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-accent-strong)", marginTop: 6, fontWeight: 600 }}>
                {focusTarget
                  ? `${humanizeRole(focusTarget.role)} · ${focusTarget.pitch_classes.join(" · ")}`
                  : "Prépare la première cible du cycle."}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                {focusTarget?.description ?? "Le manche te montre la box active, les ancrages d'accord et la cible du moment."}
              </div>
              {nextResolutionTarget && (
                <div style={{ fontSize: 11, color: "var(--color-accent-primary)", marginTop: 8 }}>
                  Prochaine résolution: {nextResolutionTarget.chord_name} · {nextResolutionTarget.pitch_classes.join(" · ")}
                </div>
              )}
            </div>

            <div style={{
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "12px",
              background: "var(--color-background-secondary)",
            }}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                Corrige maintenant
              </div>
              {weakest ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: latestRepLabelColor, marginTop: 6 }}>
                    {weakest.label} · {weakest.score}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                    {weakest.advice}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                  Lance une rep pour obtenir un retour ciblé.
                </div>
              )}
              {missedTarget && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-danger)" }}>
                  Cible manquée: {missedTarget.chord} · pulse {missedTarget.pulse} · {missedTarget.role} · attendu {missedTarget.expected}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                Practice fretboard
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 3 }}>
                Box {practiceWindowStart + 1}–{practiceWindowStart + practiceWindowSize} · {currentChord?.display_name ?? "—"}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              `R` tonique · `●` accord · `+` cible · anneau bleu résolution
            </div>
          </div>

          <Fretboard
            scalePositions={sanitizedScalePositions}
            chordTones={currentChord?.chord_tones ?? []}
            chordQuality={currentChord?.quality ?? ""}
            rootNote={currentChord?.chord_tones[0] ?? ""}
            scaleRoot={selectedScale?.scale_root ?? plan?.solo_scale_root ?? "C"}
            modalCharacteristicTones={[]}
            modalAvoidTones={[]}
            modalResolutionTones={[]}
            nextChordName={nextChord?.display_name ?? ""}
            colorTones={highlightedPitchClasses}
            resolutionNote={nextResolutionTarget?.pitch_classes[0] ?? ""}
            currentPulseTotal={Math.max(1, currentPulseTotal || focusTarget?.pulse_total || 4)}
            tempoUnit={plan?.tempo_unit ?? "quarter"}
            phraseGuides={[]}
            windowStart={practiceWindowStart}
            windowSize={practiceWindowSize}
            showAvoid={false}
            flash={false}
            displayPreset="focus"
            labelMode="function"
            showTabGuide={false}
            showPhraseGuide={false}
            stringLabels={tuningStrings}
          />

          {scaleWorkoutActive && scaleTabSteps.length > 0 && (
            <div style={{
              marginTop: 12,
              padding: 10,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              background: "linear-gradient(180deg, rgba(26, 33, 44, 0.96) 0%, rgba(18, 24, 33, 0.96) 100%)",
            }}>
              {!isTabOnly && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    Tab scale workout
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {plan?.scale_run_direction ?? "ascending"} · {plan?.scale_run_notes_per_string ?? 3} NPS · {practiceWindowSize} frettes
                    </div>
                    <button
                      onClick={() => setTabGlide((value) => !value)}
                      style={{
                        border: "0.5px solid var(--color-border-tertiary)",
                        background: tabGlide ? "var(--color-success-soft)" : "var(--color-background-primary)",
                        color: tabGlide ? "var(--color-success)" : "var(--color-text-secondary)",
                        borderRadius: "var(--border-radius-md)",
                        padding: "4px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Glide {tabGlide ? "on" : "off"}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => setTabZoom((value) => Math.max(0.8, Number((value - 0.1).toFixed(2))))}
                        style={{
                          border: "0.5px solid var(--color-border-tertiary)",
                          background: "var(--color-background-primary)",
                          color: "var(--color-text-secondary)",
                          borderRadius: "var(--border-radius-sm)",
                          padding: "2px 6px",
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min={0.8}
                        max={1.4}
                        step={0.05}
                        value={tabZoom}
                        onChange={(event) => setTabZoom(Number(event.target.value))}
                        style={{ width: 90 }}
                      />
                      <button
                        onClick={() => setTabZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(2))))}
                        style={{
                          border: "0.5px solid var(--color-border-tertiary)",
                          background: "var(--color-background-primary)",
                          color: "var(--color-text-secondary)",
                          borderRadius: "var(--border-radius-sm)",
                          padding: "2px 6px",
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                      <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                        {Math.round(tabZoom * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginTop: isTabOnly ? 0 : 8, position: "relative" }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "50%",
                  width: 2,
                  background: "rgba(31, 202, 211, 0.45)",
                  transform: "translateX(-1px)",
                  zIndex: 3,
                }} />
                <div
                  ref={tabScrollRef}
                  style={{
                    overflowX: "auto",
                    overflowY: "hidden",
                    padding: "6px 4px 10px",
                    scrollBehavior: "smooth",
                    background: "rgba(15, 20, 28, 0.72)",
                    border: "1px solid rgba(42, 51, 64, 0.5)",
                    borderRadius: 12,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      ref={tabHighlightRef}
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: tabColWidth,
                        borderRadius: 8,
                        background: "linear-gradient(180deg, rgba(31, 202, 211, 0.2) 0%, rgba(31, 202, 211, 0.35) 100%)",
                        boxShadow: "0 0 0 1px rgba(31, 202, 211, 0.45)",
                        pointerEvents: "none",
                        transform: `translateX(${tabLeadOffset + Math.max(0, tabActiveIndex) * tabStepStride}px)`,
                      }}
                    />
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: `40px repeat(${scaleTabSteps.length}, ${tabColWidth}px)`,
                      gridTemplateRows: `${tabHeaderHeight}px ${tabHeaderHeight}px repeat(${tabStrings.length}, ${tabRowHeight}px)`,
                      gap: 4,
                      alignItems: "center",
                      minWidth: `${40 + scaleTabSteps.length * (tabColWidth + 4)}px`,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
                    }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "right", paddingRight: 4 }}>
                      Pick
                    </div>
                    {scaleTabSteps.map((_, index) => (
                      <div
                        key={`tab-head-${index}`}
                        style={{
                          fontSize: 11,
                          textAlign: "center",
                          color: index === tabActiveIndex ? "var(--color-accent-primary)" : "var(--color-text-tertiary)",
                          fontWeight: index === tabActiveIndex ? 700 : 400,
                          background: index === tabActiveIndex
                            ? "rgba(31, 202, 211, 0.25)"
                            : (tabActiveBar >= 0 && Math.floor(index / notesPerBar) === tabActiveBar
                              ? "rgba(31, 202, 211, 0.12)"
                              : "transparent"),
                          borderRadius: 6,
                          height: tabHeaderHeight,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {scaleTabPicks[index] ?? " "}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textAlign: "right", paddingRight: 4 }}>
                      Beat
                    </div>
                    {scaleTabSteps.map((_, index) => (
                      <div
                        key={`tab-beat-${index}`}
                        style={{
                          fontSize: 10,
                          textAlign: "center",
                          color: index % npsValue === 0 ? "var(--color-success)" : "transparent",
                          fontWeight: 700,
                          height: tabHeaderHeight,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: tabActiveBar >= 0 && Math.floor(index / notesPerBar) === tabActiveBar
                            ? "rgba(31, 202, 211, 0.18)"
                            : "transparent",
                          borderRadius: 6,
                        }}
                      >
                        {index % npsValue === 0 ? `${Math.floor((index % notesPerBar) / npsValue) + 1}` : ""}
                      </div>
                    ))}
                    {tabStrings.map((string) => (
                      <div key={`tab-${string.index}`} style={{ display: "contents" }}>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "right", paddingRight: 4 }}>
                          {string.label}
                        </div>
                        {scaleTabSteps.map((step, index) => (
                          <div
                            key={`tab-${string.index}-${index}`}
                            style={{
                              fontSize: 12,
                              textAlign: "center",
                              height: tabRowHeight,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 6,
                              backgroundColor: step.stringIndex === string.index
                                ? (index === tabActiveIndex ? "var(--color-accent-primary)" : "var(--color-accent-soft)")
                                : (index === tabActiveIndex ? "rgba(31, 202, 211, 0.14)" : "transparent"),
                              color: step.stringIndex === string.index
                                ? (index === tabActiveIndex ? "var(--color-accent-contrast)" : "var(--color-accent-primary)")
                                : "var(--color-text-tertiary)",
                              boxShadow: index === tabActiveIndex && step.stringIndex === string.index
                                ? "0 0 0 1px rgba(31, 202, 211, 0.35)"
                                : "none",
                              borderLeft: index % notesPerBar === 0 ? "1px solid rgba(31, 202, 211, 0.4)" : "none",
                              borderBottom: "1px solid rgba(42, 51, 64, 0.4)",
                              backgroundImage: tabActiveBar >= 0 && Math.floor(index / notesPerBar) === tabActiveBar
                                ? "linear-gradient(0deg, rgba(31, 202, 211, 0.08), rgba(31, 202, 211, 0.08))"
                                : "none",
                            }}
                          >
                            {step.stringIndex === string.index ? step.fret : "–"}
                          </div>
                        ))}
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {minimalView && !isTabOnly && techniqueLabel && (
            <div style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-accent-soft)",
              color: "var(--color-accent-primary)",
              fontSize: 11,
              fontWeight: 600,
            }}>
              {techniqueLabel} · {techniqueTip}
            </div>
          )}
        </div>
      </div>

      {!minimalView && !isTabOnly && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 12 }}>
          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Maintenant
            </div>
            {phase === "count_in" ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-warning)", marginTop: 6 }}>
                  {countInBeat}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  Rentre sur le prochain downbeat.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
                  {currentChord?.display_name ?? "—"}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  Pulse {currentPulseTotal > 0 ? currentPulse + 1 : 0}/{currentPulseTotal} · cycle {completedCycles + 1}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8 }}>
                  {currentTargets.length > 0 ? currentTargets[0].description : "Attends le prochain repère."}
                </div>
              </>
            )}
          </div>

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Cibles actives
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {currentTargets.length > 0 ? currentTargets.map((target, index) => (
                <div
                  key={`${target.step_index}-${target.role}-${index}`}
                  style={{
                    padding: "7px 9px",
                    borderRadius: "var(--border-radius-md)",
                    background: "var(--color-accent-soft)",
                    color: "var(--color-accent-strong)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {target.pitch_classes.join(" · ")}
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  Aucune cible sur ce pulse.
                </div>
              )}
            </div>
          </div>

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Retour MIDI
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: heardNote ? (heardNote.hit ? "var(--color-success)" : "var(--color-danger)") : "var(--color-text-primary)", marginTop: 6 }}>
              {heardNote?.noteLabel ?? "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
              {heardNote
                ? `${heardNote.hit ? "Target hit" : "Hors cible"} · ${heardNote.inputName}`
                : midiInputs.length > 0
                  ? midiInputs.map((input) => input.name).join(" · ")
                  : "Aucune entrée MIDI détectée"}
            </div>
          </div>
        </div>
      )}

      {!minimalView && !isTabOnly && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Tempo ladder
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
              {displayedBpm}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
              cible {plan?.target_bpm ?? "—"} · +{plan?.bpm_step ?? 0}
            </div>
          </div>

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Streak propre
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
              {consecutiveCleanReps}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
              sur {plan?.reps_per_level ?? "—"} reps avant montée
            </div>
          </div>

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Dernière rep
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: latestRepLabelColor, marginTop: 6 }}>
              {lastRepScore ? `${lastRepScore.total_score}%` : "—"}
            </div>
            <div style={{ fontSize: 11, color: latestRepLabelColor, marginTop: 4 }}>
              {lastRepScore ? (lastRepScore.clean_rep ? "clean rep" : "à resserrer") : "En attente du premier cycle"}
            </div>
            {lastRepScore && (
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 6 }}>
                pitch {lastRepScore.pitch_score} · timing {lastRepScore.timing_score} · targets {lastRepScore.target_score}
              </div>
            )}
          </div>

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Historique court
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {repHistory.length > 0 ? repHistory.slice(-4).map((entry) => (
                <div
                  key={`${entry.cycle}-${entry.bpm}`}
                  style={{
                    padding: "6px 8px",
                    borderRadius: "var(--border-radius-md)",
                    background: entry.score.clean_rep ? "var(--color-success-soft)" : "var(--color-danger-soft)",
                    color: entry.score.clean_rep ? "var(--color-success)" : "var(--color-danger)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  C{entry.cycle} · {entry.score.total_score}
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  Les scores de rep apparaissent ici.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lastRepScore?.feedback.length ? (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 12px",
          background: "var(--color-background-secondary)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Feedback
          </div>
          {lastRepScore.feedback.slice(0, 3).map((line) => (
            <div key={line} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {midiError && (
        <div style={{
          border: "0.5px solid var(--color-danger)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 12px",
          background: "var(--color-danger-soft)",
          color: "var(--color-danger)",
          fontSize: 12,
        }}>
          {midiError}
        </div>
      )}
      {!midiError && plan && progression.length === 0 && (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 12px",
          background: "var(--color-background-secondary)",
          color: "var(--color-text-secondary)",
          fontSize: 12,
        }}>
          La progression du workout est en cours de construction.
        </div>
      )}
    </div>
  );
}
