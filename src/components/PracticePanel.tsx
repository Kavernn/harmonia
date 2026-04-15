import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { FretPosition, NoteValueId, ProgressionChord, ScaleSuggestion } from "../music";
import type {
  PracticeExercise,
  PracticeInputModeId,
  PracticePlan,
  PracticeRepScore,
  PracticeSessionSummary,
} from "../practice";
import type { PracticePhase } from "../hooks/usePracticeEngine";
import { usePersistentState } from "../hooks/usePersistentState";
import { PracticeHistoryPanel } from "./PracticeHistoryPanel";
import { PracticeLivePanel } from "./PracticeLivePanel";
import { PracticeResultsPanel } from "./PracticeResultsPanel";

interface PracticePanelProps {
  harmonyRootName: string;
  harmonyScaleName: string;
  selectedScale: ScaleSuggestion | null;
  selectedTuningName: string;
  selectedTuningStrings: string[];
  scalePositions: FretPosition[];
  activeSteps: string[];
  library: PracticeExercise[];
  activeExercise: PracticeExercise | null;
  plan: PracticePlan | null;
  progressionPreview: ProgressionChord[];
  loading: boolean;
  error: string | null;
  progressionSource: "current" | "exercise";
  tempoUnit: NoteValueId;
  startBpm: number;
  targetBpm: number;
  bpmStep: number;
  repsPerLevel: number;
  countInEnabled: boolean;
  inputMode: PracticeInputModeId;
  windowSize: number;
  positionStart: number | null;
  scaleRunDirection: "ascending" | "descending" | "up_down";
  scaleRunNotesPerString: number;
  scaleRunAutoPositions: boolean;
  scaleRunRandomPositions: boolean;
  livePhase: PracticePhase;
  livePlaying: boolean;
  liveCurrentBpm: number;
  liveCurrentStepIndex: number;
  liveCurrentPulse: number;
  liveCurrentPulseTotal: number;
  liveCurrentTargets: PracticePlan["targets"];
  liveCompletedCycles: number;
  liveConsecutiveCleanReps: number;
  liveCountInBeat: number;
  liveMidiStatus: string;
  liveMidiInputs: { id: string; name: string; state: MIDIPortDeviceState }[];
  liveMidiError: string | null;
  liveHeardNote: { noteLabel: string; inputName: string; hit: boolean } | null;
  liveLastRepScore: PracticeRepScore | null;
  liveRepHistory: Array<{ cycle: number; bpm: number; score: PracticeRepScore }>;
  liveLastSessionSummary: PracticeSessionSummary | null;
  liveSessionHistory: PracticeSessionSummary[];
  cueEnabled: boolean;
  noteValues: { id: NoteValueId; label: string; short: string; symbol: string }[];
  onSelectExerciseId: (exerciseId: string) => void;
  onProgressionSourceChange: (source: "current" | "exercise") => void;
  onTempoUnitChange: (value: NoteValueId) => void;
  onStartBpmChange: (value: number) => void;
  onTargetBpmChange: (value: number) => void;
  onBpmStepChange: (value: number) => void;
  onRepsPerLevelChange: (value: number) => void;
  onCountInEnabledChange: (value: boolean) => void;
  onInputModeChange: (value: PracticeInputModeId) => void;
  onWindowSizeChange: (value: number) => void;
  onPositionStartChange: (value: number | null) => void;
  onScaleRunDirectionChange: (value: "ascending" | "descending" | "up_down") => void;
  onScaleRunNotesPerStringChange: (value: number) => void;
  onScaleRunAutoPositionsChange: (value: boolean) => void;
  onScaleRunRandomPositionsChange: (value: boolean) => void;
  onSetSoloPalette: (scaleRoot: string, scaleName: string) => void;
  onToggleCue: () => void;
  onReplayCue: () => void;
  onNudgeBpm: (delta: number) => void;
  practiceWithBeat: boolean;
  onTogglePracticeWithBeat: () => void;
  onStartPractice: () => void;
  onStopPractice: () => void;
  onClearPracticeHistory: () => void;
}

function numberInput(
  value: number,
  min: number,
  max: number,
  onChange: (value: number) => void,
) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        width: "100%",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "8px 10px",
        fontSize: 12,
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
      }}
    />
  );
}

interface SecondarySectionProps {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function SecondarySection({ title, summary, open, onToggle, children }: SecondarySectionProps) {
  return (
    <div style={{
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      background: "var(--color-background-primary)",
      overflow: "hidden",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{title}</div>
          <div style={{
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {summary}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          flexShrink: 0,
        }}>
          {open ? "Masquer" : "Voir"}
        </div>
      </button>

      {open && (
        <div style={{
          borderTop: "0.5px solid var(--color-border-tertiary)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function PracticePanel({
  harmonyRootName,
  harmonyScaleName,
  selectedScale,
  selectedTuningName,
  selectedTuningStrings,
  scalePositions,
  activeSteps,
  library,
  activeExercise,
  plan,
  progressionPreview,
  loading,
  error,
  progressionSource,
  tempoUnit,
  startBpm,
  targetBpm,
  bpmStep,
  repsPerLevel,
  countInEnabled,
  inputMode,
  windowSize,
  positionStart,
  scaleRunDirection,
  scaleRunNotesPerString,
  scaleRunAutoPositions,
  scaleRunRandomPositions,
  livePhase,
  livePlaying,
  liveCurrentBpm,
  liveCurrentStepIndex,
  liveCurrentPulse,
  liveCurrentPulseTotal,
  liveCurrentTargets,
  liveCompletedCycles,
  liveConsecutiveCleanReps,
  liveCountInBeat,
  liveMidiStatus,
  liveMidiInputs,
  liveMidiError,
  liveHeardNote,
  liveLastRepScore,
  liveRepHistory,
  liveLastSessionSummary,
  liveSessionHistory,
  cueEnabled,
  noteValues,
  onSelectExerciseId,
  onProgressionSourceChange,
  onTempoUnitChange,
  onStartBpmChange,
  onTargetBpmChange,
  onBpmStepChange,
  onRepsPerLevelChange,
  onCountInEnabledChange,
  onInputModeChange,
  onWindowSizeChange,
  onPositionStartChange,
  onScaleRunDirectionChange,
  onScaleRunNotesPerStringChange,
  onScaleRunAutoPositionsChange,
  onScaleRunRandomPositionsChange,
  onSetSoloPalette,
  onToggleCue,
  onReplayCue,
  onNudgeBpm,
  practiceWithBeat,
  onTogglePracticeWithBeat,
  onStartPractice,
  onStopPractice,
  onClearPracticeHistory,
}: PracticePanelProps) {
  const [focusMode, setFocusMode] = usePersistentState("harmonia.practice.focus-mode", true);
  const [showSetupDrawer, setShowSetupDrawer] = usePersistentState("harmonia.practice.show-setup-drawer", false);
  const [drawerTab, setDrawerTab] = usePersistentState<"setup" | "session">("harmonia.practice.drawer-tab", "setup");
  const [showSessionPanels, setShowSessionPanels] = usePersistentState("harmonia.practice.show-session-panels", false);
  const [showPlanPanels, setShowPlanPanels] = usePersistentState("harmonia.practice.show-plan-panels", false);
  const [fullScreenLive, setFullScreenLive] = usePersistentState("harmonia.practice.fullscreen-live", false);
  const [minimalLiveView, setMinimalLiveView] = usePersistentState("harmonia.practice.minimal-live", true);
  const [trainingOnly, setTrainingOnly] = usePersistentState("harmonia.practice.training-only", false);
  const [tabOnlyLiveView, setTabOnlyLiveView] = usePersistentState("harmonia.practice.tab-only-live", false);
  const [customPresets, setCustomPresets] = usePersistentState<Array<{
    id: string;
    name: string;
    exerciseId: string;
    tempoUnit: NoteValueId;
    startBpm: number;
    targetBpm: number;
    bpmStep: number;
    repsPerLevel: number;
    nps: number;
    direction: "ascending" | "descending" | "up_down";
    windowSize: number;
    autoRotate: boolean;
    randomPositions: boolean;
    trainingOnly: boolean;
  }>>("harmonia.practice.custom-presets", []);
  const [presetName, setPresetName] = usePersistentState("harmonia.practice.custom-preset-name", "");
  const [defaultPresetId, setDefaultPresetId] = usePersistentState<string | null>(
    "harmonia.practice.default-preset-id",
    null,
  );
  const [presetClipboard, setPresetClipboard] = usePersistentState("harmonia.practice.preset-clipboard", "");
  const [routineEnabled, setRoutineEnabled] = usePersistentState("harmonia.practice.routine-enabled", false);
  const [routineId, setRoutineId] = usePersistentState("harmonia.practice.routine-id", "speed-ladder");
  const [routineStepIndex, setRoutineStepIndex] = usePersistentState("harmonia.practice.routine-step", 0);
  const routineCycleStartRef = useRef(0);
  const [showPracticeIntro, setShowPracticeIntro] = usePersistentState("harmonia.practice.show-intro", true);
  const [scaleCycleEnabled, setScaleCycleEnabled] = usePersistentState(
    "harmonia.practice.scale-cycle-enabled",
    false,
  );
  const [scaleCycleMode, setScaleCycleMode] = usePersistentState<
    "modes" | "major" | "minor" | "major_minor" | "pentatonic" | "blues"
  >(
    "harmonia.practice.scale-cycle-mode",
    "modes",
  );
  const [scaleCycleAccidentalsOnly, setScaleCycleAccidentalsOnly] = usePersistentState(
    "harmonia.practice.scale-cycle-accidentals-only",
    false,
  );
  const [scaleCycleIndex, setScaleCycleIndex] = usePersistentState(
    "harmonia.practice.scale-cycle-index",
    0,
  );
  const liveActive = livePhase !== "idle";
  const focusActive = focusMode && liveActive;
  const scaleWorkoutActive = activeExercise?.id === "scale-speed-picking";
  const scaleCycleList = useMemo(() => {
    const allRoots = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
    const roots = scaleCycleAccidentalsOnly
      ? ["A#", "C#", "D#", "F#", "G#"]
      : allRoots;
    const modes = ["Aeolian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Ionian", "Locrian"];
    const list = scaleCycleMode === "major"
      ? roots.map((root) => ({ root, mode: "Ionian" }))
      : scaleCycleMode === "minor"
        ? roots.map((root) => ({ root, mode: "Aeolian" }))
        : scaleCycleMode === "major_minor"
          ? roots.flatMap((root) => ([{ root, mode: "Ionian" }, { root, mode: "Aeolian" }]))
          : scaleCycleMode === "pentatonic"
            ? roots.flatMap((root) => ([{ root, mode: "Pentatonic Major" }, { root, mode: "Pentatonic Minor" }]))
            : scaleCycleMode === "blues"
              ? roots.map((root) => ({ root, mode: "Blues" }))
            : roots.flatMap((root) => modes.map((mode) => ({ root, mode })));
    return list;
  }, [scaleCycleAccidentalsOnly, scaleCycleMode]);
  const scaleCycleSize = scaleCycleList.length;
  const lastCycleRef = useRef(0);
  const naturalPositionStarts = useMemo(() => {
    if (!scaleWorkoutActive || scalePositions.length === 0) return [];
    const stringCount = Math.max(1, selectedTuningStrings.length);
    const maxFret = Math.max(0, ...scalePositions.map((position) => position.fret));
    const lastStart = Math.max(0, maxFret - windowSize);
    const positionsByString: number[][] = Array.from({ length: stringCount }, () => []);

    scalePositions.forEach((position) => {
      if (position.is_avoid) return;
      if (position.string < 0 || position.string >= stringCount) return;
      positionsByString[position.string].push(position.fret);
    });

    positionsByString.forEach((frets) => frets.sort((left, right) => left - right));

    const starts: number[] = [];
    for (let start = 0; start <= lastStart; start += 1) {
      const end = start + windowSize;
      let ok = true;
      for (const frets of positionsByString) {
        let count = 0;
        for (const fret of frets) {
          if (fret < start) continue;
          if (fret > end) break;
          count += 1;
          if (count >= scaleRunNotesPerString) break;
        }
        if (count < scaleRunNotesPerString) {
          ok = false;
          break;
        }
      }
      if (ok) starts.push(start);
    }
    return starts;
  }, [scalePositions, scaleRunNotesPerString, scaleWorkoutActive, selectedTuningStrings.length, windowSize]);
  const activePositionIndex = useMemo(() => {
    if (!naturalPositionStarts.length) return null;
    if (positionStart == null) return null;
    const index = naturalPositionStarts.indexOf(positionStart);
    return index >= 0 ? index + 1 : null;
  }, [naturalPositionStarts, positionStart]);
  const nearestNaturalStart = useMemo(() => {
    if (!naturalPositionStarts.length || positionStart == null) return null;
    let nearest = naturalPositionStarts[0];
    let bestDistance = Math.abs(nearest - positionStart);
    for (const start of naturalPositionStarts) {
      const distance = Math.abs(start - positionStart);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = start;
      }
    }
    return nearest;
  }, [naturalPositionStarts, positionStart]);
  const scaleCycleLabel = useMemo(() => {
    if (!scaleCycleSize) return null;
    const entry = scaleCycleList[scaleCycleIndex % scaleCycleSize];
    if (!entry) return null;
    return `${entry.root} ${entry.mode}`;
  }, [scaleCycleIndex, scaleCycleList, scaleCycleSize]);
  const quickPresets = useMemo(() => ([
    {
      id: "alt-16ths",
      label: "Alternate 16ths",
      description: "Down-up strict, 3NPS",
      exerciseId: "alternate-picking-foundation",
      startBpm: 80,
      targetBpm: 140,
      bpmStep: 5,
      repsPerLevel: 2,
      tempoUnit: "sixteenth" as NoteValueId,
      nps: 3,
      direction: "ascending" as const,
      windowSize: 4,
      autoRotate: true,
    },
    {
      id: "economy-bursts",
      label: "Economy bursts",
      description: "3NPS with directional changes",
      exerciseId: "economy-picking-flow",
      startBpm: 75,
      targetBpm: 130,
      bpmStep: 5,
      repsPerLevel: 2,
      tempoUnit: "sixteenth" as NoteValueId,
      nps: 3,
      direction: "up_down" as const,
      windowSize: 4,
      autoRotate: true,
    },
    {
      id: "sweep-triads",
      label: "Sweep triads",
      description: "Arpeggio tones only",
      exerciseId: "sweep-picking-arpeggios",
      startBpm: 60,
      targetBpm: 120,
      bpmStep: 5,
      repsPerLevel: 2,
      tempoUnit: "eighth" as NoteValueId,
      nps: 3,
      direction: "ascending" as const,
      windowSize: 5,
      autoRotate: true,
    },
    {
      id: "scale-speed",
      label: "Scale run",
      description: "Even 16ths, 4NPS",
      exerciseId: "scale-speed-picking",
      startBpm: 85,
      targetBpm: 150,
      bpmStep: 5,
      repsPerLevel: 2,
      tempoUnit: "sixteenth" as NoteValueId,
      nps: 4,
      direction: "ascending" as const,
      windowSize: 4,
      autoRotate: true,
    },
  ]), []);
  const routines = useMemo(() => ([
    {
      id: "speed-ladder",
      name: "Speed ladder 15",
      steps: [
        { presetId: "alt-16ths", cycles: 4 },
        { presetId: "economy-bursts", cycles: 4 },
        { presetId: "sweep-triads", cycles: 4 },
        { presetId: "scale-speed", cycles: 3 },
      ],
    },
    {
      id: "accuracy-first",
      name: "Accuracy builder",
      steps: [
        { presetId: "scale-speed", cycles: 6 },
        { presetId: "alt-16ths", cycles: 4 },
      ],
    },
  ]), []);
  const applyPreset = (preset: {
    exerciseId: string;
    tempoUnit: NoteValueId;
    startBpm: number;
    targetBpm: number;
    bpmStep: number;
    repsPerLevel: number;
    nps: number;
    direction: "ascending" | "descending" | "up_down";
    windowSize: number;
    autoRotate: boolean;
    randomPositions?: boolean;
    trainingOnly?: boolean;
  }) => {
    onSelectExerciseId(preset.exerciseId);
    onTempoUnitChange(preset.tempoUnit);
    onStartBpmChange(preset.startBpm);
    onTargetBpmChange(preset.targetBpm);
    onBpmStepChange(preset.bpmStep);
    onRepsPerLevelChange(preset.repsPerLevel);
    onScaleRunNotesPerStringChange(preset.nps);
    onScaleRunDirectionChange(preset.direction);
    onWindowSizeChange(preset.windowSize);
    onPositionStartChange(null);
    onScaleRunAutoPositionsChange(preset.autoRotate);
    onScaleRunRandomPositionsChange(Boolean(preset.randomPositions));
    setTrainingOnly(Boolean(preset.trainingOnly));
    setScaleCycleEnabled(false);
    setScaleCycleIndex(0);
  };
  const saveCustomPreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    const id = `${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    setCustomPresets((prev) => ([
      ...prev,
      {
        id,
        name: trimmed,
        exerciseId: activeExercise?.id ?? "scale-speed-picking",
        tempoUnit,
        startBpm,
        targetBpm,
        bpmStep,
        repsPerLevel,
        nps: scaleRunNotesPerString,
        direction: scaleRunDirection,
        windowSize,
        autoRotate: scaleRunAutoPositions,
        randomPositions: scaleRunRandomPositions,
        trainingOnly,
      },
    ]));
    setPresetName("");
  };
  const exportPresets = () => {
    const payload = JSON.stringify(customPresets, null, 2);
    setPresetClipboard(payload);
  };
  const importPresets = () => {
    const raw = presetClipboard.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as typeof customPresets;
      if (!Array.isArray(parsed)) return;
      setCustomPresets(parsed);
    } catch {
      return;
    }
  };
  const activeRoutine = routines.find((routine) => routine.id === routineId) ?? routines[0];
  const routineStep = activeRoutine?.steps[routineStepIndex] ?? null;
  const routineProgressLabel = activeRoutine
    ? `${activeRoutine.name} · étape ${routineStepIndex + 1}/${activeRoutine.steps.length}`
    : null;

  useEffect(() => {
    if (!focusActive && showSetupDrawer) {
      setShowSetupDrawer(false);
    }
  }, [focusActive, showSetupDrawer, setShowSetupDrawer]);

  useEffect(() => {
    if (!trainingOnly) return;
    onProgressionSourceChange("exercise");
  }, [trainingOnly, onProgressionSourceChange]);

  useEffect(() => {
    if (!tabOnlyLiveView) return;
    if (minimalLiveView && trainingOnly) return;
    setTabOnlyLiveView(false);
  }, [tabOnlyLiveView, minimalLiveView, trainingOnly, setTabOnlyLiveView]);

  useEffect(() => {
    if (!tabOnlyLiveView) return;
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen().catch(() => {});
  }, [tabOnlyLiveView]);

  useEffect(() => {
    if (tabOnlyLiveView) return;
    if (!document.fullscreenElement) return;
    document.exitFullscreen().catch(() => {});
  }, [tabOnlyLiveView]);

  useEffect(() => {
    if (!defaultPresetId) return;
    const preset = customPresets.find((item) => item.id === defaultPresetId);
    if (!preset) return;
    applyPreset(preset);
  }, [defaultPresetId, customPresets]);

  useEffect(() => {
    if (!routineEnabled || !activeRoutine) return;
    if (!routineStep) return;
    const preset = quickPresets.find((item) => item.id === routineStep.presetId);
    if (!preset) return;
    applyPreset(preset);
    routineCycleStartRef.current = liveCompletedCycles;
    setTrainingOnly(true);
    setMinimalLiveView(true);
  }, [routineEnabled, routineId, routineStepIndex, activeRoutine, routineStep, quickPresets, liveCompletedCycles]);

  useEffect(() => {
    if (!routineEnabled || !activeRoutine) return;
    if (!routineStep) return;
    const elapsed = liveCompletedCycles - routineCycleStartRef.current;
    if (elapsed < routineStep.cycles) return;
    const nextIndex = (routineStepIndex + 1) % activeRoutine.steps.length;
    setRoutineStepIndex(nextIndex);
    routineCycleStartRef.current = liveCompletedCycles;
  }, [
    routineEnabled,
    activeRoutine,
    routineStep,
    routineStepIndex,
    liveCompletedCycles,
    setRoutineStepIndex,
  ]);

  useEffect(() => {
    if (!scaleWorkoutActive) return;
    if (positionStart == null) return;
    if (!naturalPositionStarts.length) return;
    if (naturalPositionStarts.includes(positionStart)) return;
    if (nearestNaturalStart == null) return;
    onPositionStartChange(nearestNaturalStart);
  }, [
    scaleWorkoutActive,
    positionStart,
    naturalPositionStarts,
    nearestNaturalStart,
    onPositionStartChange,
  ]);

  useEffect(() => {
    if (!scaleWorkoutActive || !scaleRunAutoPositions) return;
    if (!naturalPositionStarts.length) return;
    if (scaleRunRandomPositions) {
      const options = naturalPositionStarts;
      if (options.length === 1) {
        onPositionStartChange(options[0]);
        return;
      }
      let next = options[Math.floor(Math.random() * options.length)];
      if (positionStart != null) {
        for (let attempt = 0; attempt < 6 && next === positionStart; attempt += 1) {
          next = options[Math.floor(Math.random() * options.length)];
        }
      }
      onPositionStartChange(next);
      return;
    }
    const index = positionStart == null ? 0 : naturalPositionStarts.indexOf(positionStart);
    const nextIndex = index >= 0 ? (index + 1) % naturalPositionStarts.length : 0;
    onPositionStartChange(naturalPositionStarts[nextIndex]);
  }, [
    liveCompletedCycles,
    scaleWorkoutActive,
    scaleRunAutoPositions,
    scaleRunRandomPositions,
    naturalPositionStarts,
    positionStart,
    onPositionStartChange,
  ]);

  useEffect(() => {
    if (!scaleCycleEnabled) return;
    if (!scaleCycleSize) return;
    const entry = scaleCycleList[scaleCycleIndex % scaleCycleSize];
    if (!entry) return;
    onSetSoloPalette(entry.root, entry.mode);
    lastCycleRef.current = liveCompletedCycles;
  }, [scaleCycleEnabled, scaleCycleIndex, scaleCycleList, scaleCycleSize, onSetSoloPalette]);

  useEffect(() => {
    if (!scaleCycleEnabled) return;
    setScaleCycleIndex(0);
  }, [scaleCycleMode, scaleCycleEnabled, setScaleCycleIndex]);

  useEffect(() => {
    if (!scaleCycleEnabled) return;
    setScaleCycleIndex(0);
  }, [scaleCycleAccidentalsOnly, scaleCycleEnabled, setScaleCycleIndex]);

  useEffect(() => {
    if (!scaleCycleEnabled || !scaleWorkoutActive) return;
    if (!scaleCycleSize) return;
    if (liveCompletedCycles === lastCycleRef.current) return;
    if (liveCompletedCycles === 0) {
      lastCycleRef.current = 0;
      return;
    }
    lastCycleRef.current = liveCompletedCycles;
    setScaleCycleIndex((value) => (value + 1) % scaleCycleSize);
  }, [liveCompletedCycles, scaleCycleEnabled, scaleCycleSize, scaleWorkoutActive, setScaleCycleIndex]);

  useEffect(() => {
    const onFullScreenChange = () => {
      setFullScreenLive(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, [setFullScreenLive]);

  const toggleFullScreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  };

  useEffect(() => {
    if (!focusActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        setShowSetupDrawer((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusActive, setShowSetupDrawer]);

  const sessionSummaryText = liveLastSessionSummary
    ? `Dernière session ${liveLastSessionSummary.average_total_score}/100 · clean ${liveLastSessionSummary.best_clean_bpm ?? "—"} BPM · ${liveSessionHistory.length} session${liveSessionHistory.length > 1 ? "s" : ""}`
    : liveSessionHistory.length > 0
      ? `${liveSessionHistory.length} session${liveSessionHistory.length > 1 ? "s" : ""} enregistrée${liveSessionHistory.length > 1 ? "s" : ""}`
      : "Aucune session terminée";

  const planSummaryText = plan
    ? `${plan.targets.length} repères · ${plan.start_bpm}→${plan.target_bpm} BPM · box ${plan.window_size} frettes`
    : loading
      ? "Calcul du plan en cours…"
      : activeExercise
        ? `Exercice ${activeExercise.name} prêt à configurer`
        : "Choisis un exercice pour générer le plan";

  const setupPanel = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6 }}>
          Practice setup
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Workout
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setMinimalLiveView((value) => !value)}
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: minimalLiveView ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                color: minimalLiveView ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Live minimal {minimalLiveView ? "on" : "off"}
            </button>
            <button
              onClick={() => {
                setTabOnlyLiveView((value) => !value);
                setMinimalLiveView(true);
                setTrainingOnly(true);
              }}
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: tabOnlyLiveView ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                color: tabOnlyLiveView ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tab-only {tabOnlyLiveView ? "on" : "off"}
            </button>
            {routineEnabled && (
              <button
                onClick={onStartPractice}
                style={{
                  border: "1px solid var(--color-accent-primary)",
                  background: "var(--color-accent-soft)",
                  color: "var(--color-accent-primary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Start routine
              </button>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={practiceWithBeat}
                onChange={onTogglePracticeWithBeat}
              />
              Groove pendant la pratique
            </label>
            <button
              onClick={() => setFocusMode((value) => !value)}
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {focusMode ? "Focus actif" : "Mode focus"}
            </button>
          </div>
        </div>
        {!trainingOnly && (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Harmonie {harmonyRootName} {harmonyScaleName} · palette solo {selectedScale?.scale_root ?? harmonyRootName} {selectedScale?.scale_name ?? harmonyScaleName}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
          Accordage {selectedTuningName}
        </div>
      </div>

      {showPracticeIntro && (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 12px",
          background: "var(--color-background-secondary)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Guide rapide
            </div>
            <button
              onClick={() => setShowPracticeIntro(false)}
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-sm)",
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Masquer
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            1. Choisis un workout puis règle tempo, NPS et position.
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            2. Clique “Start workout” pour lancer le cycle et le click.
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            3. Ajuste le tempo en live avec les boutons +/– dans le panel Live.
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            4. Active “Focus mode” pour épurer l’écran et te concentrer.
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Raccourcis utiles: `Space` play/stop · `W` practice · `S` ouvrir setup.
          </div>
        </div>
      )}

      <div style={{
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "10px 12px",
        background: "var(--color-background-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Today
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Routine: {routineEnabled ? (routineProgressLabel ?? "active") : "inactive"}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Best clean BPM: {liveLastSessionSummary?.best_clean_bpm ?? "—"} · Streak clean: {liveConsecutiveCleanReps}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          Last session: {liveLastSessionSummary ? `${liveLastSessionSummary.clean_rep_count}/${liveLastSessionSummary.rep_count} clean · ${liveLastSessionSummary.final_bpm} BPM` : "—"}
        </div>
      </div>

      <div style={{
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "10px 12px",
        background: "var(--color-background-secondary)",
        display: "grid",
        gap: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Essentiels
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Tempo unit
            <select
              value={tempoUnit}
              onChange={(event) => onTempoUnitChange(event.target.value as NoteValueId)}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              {noteValues.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Start BPM
            <input
              type="number"
              value={startBpm}
              onChange={(event) => onStartBpmChange(Number(event.target.value))}
              min={30}
              max={260}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Target BPM
            <input
              type="number"
              value={targetBpm}
              onChange={(event) => onTargetBpmChange(Number(event.target.value))}
              min={30}
              max={260}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            NPS
            <select
              value={scaleRunNotesPerString}
              onChange={(event) => onScaleRunNotesPerStringChange(Number(event.target.value))}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            checked={trainingOnly}
            onChange={(event) => setTrainingOnly(event.target.checked)}
          />
          Training only (masque harmonie/progression)
        </label>
      </div>

      <div style={{
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "10px 12px",
        background: "var(--color-background-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Quick presets
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {quickPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              style={{
                textAlign: "left",
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-primary)",
                borderRadius: "var(--border-radius-md)",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{preset.label}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 3 }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Nom du preset..."
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "7px 9px",
              fontSize: 11,
              flex: "1 1 160px",
            }}
          />
          <button
            onClick={saveCustomPreset}
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sauver preset
          </button>
        </div>
        {customPresets.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {customPresets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{preset.name}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {preset.exerciseId} · {preset.tempoUnit} · {preset.startBpm}→{preset.targetBpm}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => applyPreset(preset)}
                    style={{
                      border: "0.5px solid var(--color-border-tertiary)",
                      background: "var(--color-background-primary)",
                      color: "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-sm)",
                      padding: "5px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Appliquer
                  </button>
                  <button
                    onClick={() => setCustomPresets((prev) => prev.filter((item) => item.id !== preset.id))}
                    style={{
                      border: "0.5px solid var(--color-danger)",
                      background: "var(--color-danger-soft)",
                      color: "var(--color-danger)",
                      borderRadius: "var(--border-radius-sm)",
                      padding: "5px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Supprimer
                  </button>
                  <button
                    onClick={() => setDefaultPresetId(preset.id)}
                    style={{
                      border: "0.5px solid var(--color-border-tertiary)",
                      background: defaultPresetId === preset.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                      color: defaultPresetId === preset.id ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-sm)",
                      padding: "5px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Default
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <details style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          <summary style={{ cursor: "pointer", userSelect: "none" }}>Export / Import JSON</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <textarea
              value={presetClipboard}
              onChange={(event) => setPresetClipboard(event.target.value)}
              rows={3}
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 8px",
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                background: "var(--color-background-primary)",
                color: "var(--color-text-secondary)",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={exportPresets} style={{ border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", borderRadius: "var(--border-radius-sm)", padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>Exporter</button>
              <button onClick={importPresets} style={{ border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", borderRadius: "var(--border-radius-sm)", padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>Importer</button>
            </div>
          </div>
        </details>
      </div>

      <div style={{
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "10px 12px",
        background: "var(--color-background-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Progress rapide
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Best clean BPM: {liveLastSessionSummary?.best_clean_bpm ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Best score: {liveLastSessionSummary ? `${liveLastSessionSummary.best_total_score}%` : "—"}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          Reps clean: {liveLastSessionSummary ? `${liveLastSessionSummary.clean_rep_count}/${liveLastSessionSummary.rep_count}` : "—"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {library.map((exercise) => {
          const selected = exercise.id === activeExercise?.id;
          return (
            <button
              key={exercise.id}
              onClick={() => onSelectExerciseId(exercise.id)}
              style={{
                textAlign: "left",
                border: selected ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                background: selected ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                color: selected ? "var(--color-accent-strong)" : "var(--color-text-primary)",
                borderRadius: "var(--border-radius-md)",
                padding: "10px 11px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{exercise.name}</div>
              <div style={{ fontSize: 11, color: selected ? "var(--color-accent-primary)" : "var(--color-text-tertiary)", marginTop: 4 }}>
                {exercise.description}
              </div>
            </button>
          );
        })}
      </div>

      {scaleWorkoutActive && (
        <div style={{
          marginTop: 6,
          padding: 10,
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Scale workout
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <input
              type="checkbox"
              checked={positionStart === 0 && windowSize >= 12}
              onChange={(event) => {
                if (event.target.checked) {
                  onPositionStartChange(0);
                  onWindowSizeChange(12);
                } else {
                  onPositionStartChange(null);
                }
              }}
            />
            Manche complet (0–12)
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Direction
            <select
              value={scaleRunDirection}
              onChange={(event) => onScaleRunDirectionChange(event.target.value as "ascending" | "descending" | "up_down")}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              <option value="ascending">Ascending</option>
              <option value="descending">Descending</option>
              <option value="up_down">Up/Down</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Notes par corde
            <select
              value={scaleRunNotesPerString}
              onChange={(event) => onScaleRunNotesPerStringChange(Number(event.target.value))}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              <option value={2}>2 notes par corde</option>
              <option value={3}>3 notes par corde</option>
              <option value={4}>4 notes par corde</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Position naturelle
            <select
              value={positionStart == null ? "auto" : String(positionStart)}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "auto") {
                  onPositionStartChange(null);
                } else {
                  onPositionStartChange(Number(value));
                }
              }}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              <option value="auto">Auto (toutes positions)</option>
              {naturalPositionStarts.map((start) => (
                <option key={start} value={start}>
                  {`Frets ${start}-${start + windowSize}`}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <input
              type="checkbox"
              checked={scaleRunAutoPositions}
              onChange={(event) => onScaleRunAutoPositionsChange(event.target.checked)}
            />
            Auto rotate positions (par cycle)
          </label>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: scaleRunAutoPositions ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
            opacity: scaleRunAutoPositions ? 1 : 0.55,
          }}>
            <input
              type="checkbox"
              checked={scaleRunRandomPositions}
              disabled={!scaleRunAutoPositions}
              onChange={(event) => onScaleRunRandomPositionsChange(event.target.checked)}
            />
            Randomize positions (par cycle)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <input
              type="checkbox"
              checked={scaleCycleEnabled}
              onChange={(event) => {
                setScaleCycleEnabled(event.target.checked);
                if (!event.target.checked) {
                  setScaleCycleIndex(0);
                }
              }}
            />
            Marathon gammes (A→G#)
          </label>
          {scaleCycleEnabled && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Type de marathon
              <select
                value={scaleCycleMode}
                onChange={(event) => {
                  setScaleCycleMode(event.target.value as "modes" | "major" | "minor" | "major_minor" | "pentatonic" | "blues");
                  setScaleCycleIndex(0);
                }}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              >
                <option value="modes">Modes (inclut Ionian)</option>
                <option value="major">Majeures uniquement (Ionian)</option>
                <option value="minor">Mineures uniquement (Aeolian)</option>
                <option value="major_minor">Majeures + mineures (Ionian + Aeolian)</option>
                <option value="pentatonic">Pentatoniques (major + minor)</option>
                <option value="blues">Blues (mineur + blue note)</option>
              </select>
            </label>
          )}
          {scaleCycleEnabled && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
              <input
                type="checkbox"
                checked={scaleCycleAccidentalsOnly}
                onChange={(event) => {
                  setScaleCycleAccidentalsOnly(event.target.checked);
                  setScaleCycleIndex(0);
                }}
              />
              Accidentels uniquement (A#, C#, D#, F#, G#)
            </label>
          )}
          {scaleCycleEnabled && (
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {scaleCycleLabel ? `En cours: ${scaleCycleLabel} · ${scaleCycleIndex + 1}/${scaleCycleSize}` : "En cours: —"}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: focusActive ? "1fr" : "320px 1fr", gap: 18, alignItems: "start" }}>
      {!focusActive && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 14,
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          background: "var(--color-background-primary)",
        }}>
          {setupPanel}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {fullScreenLive && (
          <div style={{
            position: "fixed",
            right: 24,
            top: 24,
            zIndex: 60,
            padding: "10px 12px",
            borderRadius: "var(--border-radius-lg)",
            background: "rgba(10, 14, 19, 0.76)",
            color: "var(--color-text-primary)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 160,
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>
              Practice live
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
              <span style={{ opacity: 0.7 }}>BPM</span>
              <span style={{ fontWeight: 700 }}>{liveCurrentBpm}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
              <span style={{ opacity: 0.7 }}>Cycle</span>
              <span style={{ fontWeight: 700 }}>{liveCompletedCycles + 1}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
              <span style={{ opacity: 0.7 }}>Score</span>
              <span style={{ fontWeight: 700 }}>{liveLastRepScore?.total_score ?? "—"}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {livePhase === "count_in" ? "Count-in" : livePhase === "running" ? "En cours" : "Pause"}
            </div>
          </div>
        )}

        {focusActive && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 14px",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            background: "var(--color-background-primary)",
          }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Mode focus actif · configuration masquée pendant le live
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={toggleFullScreen}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {fullScreenLive ? "Quitter plein ecran" : "Plein ecran"}
              </button>
              <button
                onClick={() => setShowSetupDrawer(true)}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ouvrir setup
              </button>
              <button
                onClick={() => setFocusMode(false)}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Quitter focus
              </button>
            </div>
          </div>
        )}

        {focusActive && showSetupDrawer && (
          <div
            onClick={() => setShowSetupDrawer(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 16, 20, 0.4)",
              zIndex: 50,
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                right: 20,
                top: 20,
                bottom: 20,
                width: 360,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                padding: 16,
                borderRadius: "var(--border-radius-lg)",
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                boxShadow: "0 20px 50px rgba(15, 16, 20, 0.2)",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Setup rapide
                </div>
                <button
                  onClick={() => setShowSetupDrawer(false)}
                  style={{
                    border: "0.5px solid var(--color-border-tertiary)",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Fermer
                </button>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {([
                  { id: "setup", label: "Setup" },
                  { id: "session", label: "Session" },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id)}
                    style={{
                      flex: 1,
                      border: drawerTab === tab.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                      background: drawerTab === tab.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                      color: drawerTab === tab.id ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ overflowY: "auto", paddingRight: 6 }}>
                {drawerTab === "setup" ? (
                  setupPanel
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <PracticeResultsPanel summary={liveLastSessionSummary} />
                    <PracticeHistoryPanel history={liveSessionHistory} onClear={onClearPracticeHistory} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <PracticeLivePanel
          plan={plan}
          progression={progressionPreview}
          phase={livePhase}
          isPlaying={livePlaying}
          selectedScale={selectedScale}
          scalePositions={scalePositions}
          tuningStrings={selectedTuningStrings}
          scalePositionIndex={activePositionIndex}
          scalePositionCount={naturalPositionStarts.length || null}
          minimalView={minimalLiveView}
          trainingOnly={trainingOnly}
          tabOnlyView={tabOnlyLiveView}
          currentBpm={liveCurrentBpm}
          currentStepIndex={liveCurrentStepIndex}
          currentPulse={liveCurrentPulse}
          currentPulseTotal={liveCurrentPulseTotal}
          currentTargets={liveCurrentTargets}
          completedCycles={liveCompletedCycles}
          consecutiveCleanReps={liveConsecutiveCleanReps}
          countInBeat={liveCountInBeat}
          midiStatus={liveMidiStatus}
          midiInputs={liveMidiInputs}
          midiError={liveMidiError}
          heardNote={liveHeardNote}
          lastRepScore={liveLastRepScore}
          repHistory={liveRepHistory}
          cueEnabled={cueEnabled}
          onToggleCue={onToggleCue}
          onReplayCue={onReplayCue}
          onNudgeBpm={onNudgeBpm}
          onStartPractice={onStartPractice}
          onStopPractice={onStopPractice}
        />

        {!focusActive && (
          <SecondarySection
            title="Session & scores"
            summary={sessionSummaryText}
            open={showSessionPanels}
            onToggle={() => setShowSessionPanels((value) => !value)}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <PracticeResultsPanel summary={liveLastSessionSummary} />
              <PracticeHistoryPanel history={liveSessionHistory} onClear={onClearPracticeHistory} />
            </div>
          </SecondarySection>
        )}

        {!focusActive && (
          <SecondarySection
            title="Réglages & plan"
            summary={planSummaryText}
            open={showPlanPanels}
            onToggle={() => setShowPlanPanels((value) => !value)}
          >
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}>
            {!trainingOnly && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                Progression
                <select
                  value={progressionSource}
                  onChange={(event) => onProgressionSourceChange(event.target.value as "current" | "exercise")}
                  style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
                >
                  <option value="current">Utiliser la grille courante</option>
                  <option value="exercise">Utiliser le preset exo</option>
                </select>
              </label>
            )}

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Unité
              <select
                value={tempoUnit}
                onChange={(event) => onTempoUnitChange(event.target.value as NoteValueId)}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              >
                {noteValues.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Input live
              <select
                value={inputMode === "midi" ? "midi" : "midi"}
                onChange={(event) => onInputModeChange(event.target.value as PracticeInputModeId)}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              >
                <option value="midi">MIDI</option>
              </select>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                Le live workout est MIDI-only pour l'instant.
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Box
              {numberInput(windowSize, 4, 12, onWindowSizeChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Tempo départ
              {numberInput(startBpm, 40, 220, onStartBpmChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Tempo cible
              {numberInput(targetBpm, 40, 260, onTargetBpmChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Palier BPM
              {numberInput(bpmStep, 1, 20, onBpmStepChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Reps propres
              {numberInput(repsPerLevel, 1, 16, onRepsPerLevelChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Count-in (4 temps)
              <button
                onClick={() => onCountInEnabledChange(!countInEnabled)}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: countInEnabled ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                  color: countInEnabled ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {countInEnabled ? "Activé" : "Désactivé"}
              </button>
            </label>
          </div>

          {scaleWorkoutActive && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
              padding: 10,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-secondary)",
            }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                Direction
                <select
                  value={scaleRunDirection}
                  onChange={(event) => onScaleRunDirectionChange(event.target.value as "ascending" | "descending" | "up_down")}
                  style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
                >
                  <option value="ascending">Ascending</option>
                  <option value="descending">Descending</option>
                  <option value="up_down">Up/Down</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                Notes par corde
                <select
                  value={scaleRunNotesPerString}
                  onChange={(event) => onScaleRunNotesPerStringChange(Number(event.target.value))}
                  style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
                >
                  <option value={2}>2 notes par corde</option>
                  <option value={3}>3 notes par corde</option>
                  <option value={4}>4 notes par corde</option>
                </select>
              </label>
            </div>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 16,
          }}>
            <div style={{
              padding: 14,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              background: "var(--color-background-primary)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Plan généré</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {plan?.exercise_name ?? activeExercise?.name ?? "Chargement…"}
                  </div>
                </div>
                {loading && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Calcul…</div>}
              </div>

              {error && (
                <div style={{ fontSize: 12, color: "var(--color-danger)" }}>
                  {error}
                </div>
              )}

              {plan && (
                <>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {plan.exercise_description}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "var(--color-accent-soft)", color: "var(--color-accent-strong)" }}>
                      {plan.category}
                    </span>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "var(--color-accent-soft)", color: "var(--color-accent-primary)" }}>
                      {plan.goal}
                    </span>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "var(--color-success-soft)", color: "var(--color-success)" }}>
                      {plan.target_strategy}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Progression</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 4 }}>
                        {plan.progression_steps.join(" · ")}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Durées</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 4 }}>
                        {plan.step_durations.join(" · ")}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Tempo ladder</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 4 }}>
                        {plan.start_bpm} → {plan.target_bpm} (+{plan.bpm_step})
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    Source de grille: {progressionSource === "current" && activeSteps.length > 0 ? "grille courante" : "preset de l'exercice"}
                  </div>
                </>
              )}
            </div>

            <div style={{
              padding: 14,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              background: "var(--color-background-primary)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Targets</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {plan?.targets.length ?? 0} repères
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
                {plan?.targets.map((target, index) => (
                  <div
                    key={`${target.step_index}-${target.role}-${index}`}
                    style={{
                      border: "0.5px solid var(--color-border-tertiary)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "10px 11px",
                      background: "var(--color-background-secondary)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {target.chord_name} · {target.role}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                        pulse {target.pulse_index + 1}/{target.pulse_total}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-accent-primary)", marginTop: 4 }}>
                      {target.pitch_classes.join(" · ")} · poids {target.weight}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      {target.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </SecondarySection>
        )}
      </div>

      <div style={{
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "10px 12px",
        background: "var(--color-background-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Routines
        </div>
        <select
          value={routineId}
          onChange={(event) => {
            setRoutineId(event.target.value);
            setRoutineStepIndex(0);
          }}
          style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
        >
          {routines.map((routine) => (
            <option key={routine.id} value={routine.id}>
              {routine.name}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            checked={routineEnabled}
            onChange={(event) => {
              setRoutineEnabled(event.target.checked);
              setRoutineStepIndex(0);
              routineCycleStartRef.current = liveCompletedCycles;
            }}
          />
          Routine active
        </label>
        {routineProgressLabel && routineEnabled && (
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            {routineProgressLabel} · {routineStep?.cycles ?? 0} cycles/step
          </div>
        )}
      </div>
    </div>
  );
}
