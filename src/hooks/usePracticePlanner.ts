import { useEffect, useMemo, useState } from "react";
import { NOTE_VALUES, NOTES, type NoteValueId, type ProgressionChord, type ScaleSuggestion } from "../music";
import { buildProgressionRequest, getPracticeLibrary, getPracticePlan } from "../services/musicApi";
import type { PracticeExercise, PracticeInputModeId, PracticePlan, ScaleRunDirectionId } from "../practice";
import { usePersistentState } from "./usePersistentState";

interface UsePracticePlannerArgs {
  harmonyRoot: number;
  harmonyScaleName: string;
  selectedScale: ScaleSuggestion | null;
  activeSteps: string[];
  currentProgression: ProgressionChord[];
  tuningSemitones: number[];
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function usePracticePlanner({
  harmonyRoot,
  harmonyScaleName,
  selectedScale,
  activeSteps,
  currentProgression,
  tuningSemitones,
}: UsePracticePlannerArgs) {
  const [library, setLibrary] = useState<PracticeExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [progressionPreview, setProgressionPreview] = useState<ProgressionChord[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = usePersistentState(
    "harmonia.practice.exercise-id",
    "guide-tones-strong-beats",
  );
  const [progressionSource, setProgressionSource] = usePersistentState<"current" | "exercise">(
    "harmonia.practice.progression-source",
    "current",
  );
  const [tempoUnit, setTempoUnit] = usePersistentState<NoteValueId>(
    "harmonia.practice.tempo-unit",
    "quarter",
  );
  const [startBpm, setStartBpm] = usePersistentState("harmonia.practice.start-bpm", 70);
  const [targetBpm, setTargetBpm] = usePersistentState("harmonia.practice.target-bpm", 110);
  const [bpmStep, setBpmStep] = usePersistentState("harmonia.practice.bpm-step", 5);
  const [repsPerLevel, setRepsPerLevel] = usePersistentState("harmonia.practice.reps-per-level", 2);
  const [countInBars, setCountInBars] = usePersistentState("harmonia.practice.count-in-bars", 1);
  const [inputMode, setInputMode] = usePersistentState<PracticeInputModeId>(
    "harmonia.practice.input-mode",
    "midi",
  );
  const [windowSize, setWindowSize] = usePersistentState("harmonia.practice.window-size", 5);
  const [positionStart, setPositionStart] = usePersistentState<number | null>(
    "harmonia.practice.position-start",
    null,
  );
  const [scaleRunDirection, setScaleRunDirection] = usePersistentState<ScaleRunDirectionId>(
    "harmonia.practice.scale-run-direction",
    "ascending",
  );
  const [scaleRunNotesPerString, setScaleRunNotesPerString] = usePersistentState(
    "harmonia.practice.scale-run-nps",
    3,
  );
  const [scaleRunAutoPositions, setScaleRunAutoPositions] = usePersistentState(
    "harmonia.practice.scale-run-auto-positions",
    false,
  );
  const [scaleRunRandomPositions, setScaleRunRandomPositions] = usePersistentState(
    "harmonia.practice.scale-run-random-positions",
    false,
  );
  const tuningFingerprint = tuningSemitones.join(",");

  useEffect(() => {
    if (inputMode !== "midi") {
      setInputMode("midi");
    }
  }, [inputMode, setInputMode]);

  useEffect(() => {
    let cancelled = false;

    void getPracticeLibrary()
      .then((nextLibrary) => {
        if (cancelled) return;
        setLibrary(nextLibrary);
        setError(null);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scaleRunAutoPositions) return;
    setPositionStart(null);
  }, [scaleRunAutoPositions, setPositionStart]);

  useEffect(() => {
    if (scaleRunAutoPositions) return;
    if (!scaleRunRandomPositions) return;
    setScaleRunRandomPositions(false);
  }, [scaleRunAutoPositions, scaleRunRandomPositions, setScaleRunRandomPositions]);

  useEffect(() => {
    if (scaleRunAutoPositions) return;
    if (positionStart == null) return;
    if (selectedExerciseId !== "scale-speed-picking") return;
    setScaleRunAutoPositions(false);
    setScaleRunRandomPositions(false);
  }, [
    positionStart,
    scaleRunAutoPositions,
    selectedExerciseId,
    setScaleRunAutoPositions,
    setScaleRunRandomPositions,
  ]);

  useEffect(() => {
    if (!library.length) return;
    if (library.some((exercise) => exercise.id === selectedExerciseId)) return;
    setSelectedExerciseId(library[0].id);
  }, [library, selectedExerciseId, setSelectedExerciseId]);

  const activeExercise = useMemo(
    () => library.find((exercise) => exercise.id === selectedExerciseId) ?? library[0] ?? null,
    [library, selectedExerciseId],
  );

  useEffect(() => {
    if (!activeExercise) return;

    let cancelled = false;
    const soloScaleRootName = selectedScale?.scale_root ?? NOTES[harmonyRoot];
    const soloScaleRootIndex = NOTES.indexOf(soloScaleRootName);
    const progressionSteps = progressionSource === "current" && activeSteps.length > 0
      ? activeSteps
      : undefined;
    const tuningNotes = tuningFingerprint
      .split(",")
      .filter(Boolean)
      .map((value) => Number(value));

    async function loadPlan() {
      setLoading(true);

      try {
        const nextPlan = await getPracticePlan({
          exercise_id: activeExercise.id,
          harmony_root: harmonyRoot,
          harmony_scale_name: harmonyScaleName,
          solo_scale_root: soloScaleRootIndex >= 0 ? soloScaleRootIndex : harmonyRoot,
          solo_scale_name: selectedScale?.scale_name ?? harmonyScaleName,
          progression_steps: progressionSteps,
          tempo_unit: tempoUnit,
          tuning_notes: tuningNotes,
          start_bpm: clampNumber(startBpm, 40, 220),
          target_bpm: clampNumber(targetBpm, 40, 260),
          bpm_step: clampNumber(bpmStep, 1, 20),
          reps_per_level: clampNumber(repsPerLevel, 1, 16),
          count_in_bars: clampNumber(countInBars, 0, 8),
          input_mode: inputMode,
          window_size: clampNumber(windowSize, 4, 12),
          position_start: positionStart ?? undefined,
          scale_run_direction: scaleRunDirection,
          scale_run_notes_per_string: clampNumber(scaleRunNotesPerString, 2, 4),
        });

        if (cancelled) return;
        setPlan(nextPlan);
        setError(null);
      } catch (reason) {
        if (cancelled) return;
        setPlan(null);
        setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, [
    activeExercise,
    activeSteps,
    countInBars,
    bpmStep,
    harmonyRoot,
    harmonyScaleName,
    inputMode,
    progressionSource,
    repsPerLevel,
    selectedScale,
    startBpm,
    targetBpm,
    tempoUnit,
    windowSize,
    positionStart,
    scaleRunDirection,
    scaleRunNotesPerString,
    tuningFingerprint,
  ]);

  useEffect(() => {
    if (!plan) {
      setProgressionPreview([]);
      return;
    }

    const usesCurrentProgression = progressionSource === "current"
      && currentProgression.length > 0
      && activeSteps.length > 0
      && plan.progression_steps.join("|") === activeSteps.join("|");

    if (usesCurrentProgression) {
      setProgressionPreview(currentProgression);
      return;
    }

    let cancelled = false;

    void buildProgressionRequest(harmonyRoot, harmonyScaleName, plan.progression_steps)
      .then((nextProgression) => {
        if (cancelled) return;
        setProgressionPreview(nextProgression);
      })
      .catch((reason) => {
        if (cancelled) return;
        setProgressionPreview([]);
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      cancelled = true;
    };
  }, [activeSteps, currentProgression, harmonyRoot, harmonyScaleName, plan, progressionSource]);

  return {
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
    countInBars,
    inputMode,
    windowSize,
    positionStart,
    scaleRunDirection,
    scaleRunNotesPerString,
    scaleRunAutoPositions,
    scaleRunRandomPositions,
    noteValues: NOTE_VALUES,
    onSelectExerciseId: setSelectedExerciseId,
    onProgressionSourceChange: setProgressionSource,
    onTempoUnitChange: setTempoUnit,
    onStartBpmChange: setStartBpm,
    onTargetBpmChange: setTargetBpm,
    onBpmStepChange: setBpmStep,
    onRepsPerLevelChange: setRepsPerLevel,
    onCountInBarsChange: setCountInBars,
    onInputModeChange: setInputMode,
    onWindowSizeChange: setWindowSize,
    onPositionStartChange: setPositionStart,
    onScaleRunDirectionChange: setScaleRunDirection,
    onScaleRunNotesPerStringChange: setScaleRunNotesPerString,
    onScaleRunAutoPositionsChange: setScaleRunAutoPositions,
    onScaleRunRandomPositionsChange: setScaleRunRandomPositions,
  };
}
