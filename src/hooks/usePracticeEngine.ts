import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { NOTES, type AccompanimentToneId, type ProgressionChord, type StrumStyleId } from "../music";
import { scorePracticeRep } from "../services/musicApi";
import type {
  PracticePlan,
  PracticeRepEvent,
  PracticeRepHistoryEntry,
  PracticeRepScore,
  PracticeSessionSummary,
} from "../practice";
import { practiceCountInBeatLabel, practiceCountInPulses, practiceTargetHit, practiceTargetsForMoment } from "../practiceMath";
import { summarizePracticeSession } from "../practiceSession";
import { isBarDownbeatPulse, isTempoClickPulse, pulseMsForTempo, pulsesForDuration } from "../transportMath";
import { usePersistentState } from "./usePersistentState";
import type { MidiNoteEvent } from "./useMidiInput";

const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const START_DELAY_SECONDS = 0.05;
const VISUAL_EARLY_SECONDS = 0.01;

export type PracticePhase = "idle" | "count_in" | "running";

interface PracticeVisualEvent {
  when: number;
  phase: PracticePhase;
  stepIndex: number;
  pulseIndex: number;
  countInRemainingPulses: number;
  completedCycles: number;
  cycleIndex: number;
}

interface PracticeAudioApi {
  getCurrentTime: () => number;
  unlockAudio: () => Promise<void>;
  preloadChordSamples: (chordTones: string[], tuningStrings: string[]) => Promise<void>;
  playClick: (isDownbeat: boolean, when?: number) => void;
  playChordStrum: (
    chordTones: string[],
    tuningStrings: string[],
    strumStyle: StrumStyleId,
    accompanimentTone: AccompanimentToneId,
    when?: number,
  ) => void;
  playGuideTone: (midi: number, when?: number, velocity?: number) => void;
  stopAllSounds: () => void;
}

interface HeardNoteFeedback {
  noteLabel: string;
  inputName: string;
  hit: boolean;
  atMs: number;
}

interface ScheduledPulseMeta {
  stepIndex: number;
  pulseIndex: number;
  cycleIndex: number;
  atMs: number;
}

interface PendingRepScore {
  cycleIndex: number;
  readyAtMs: number;
  bpm: number;
  sessionId: number;
}

interface UsePracticeEngineArgs {
  enabled: boolean;
  plan: PracticePlan | null;
  progression: ProgressionChord[];
  tuningStrings: string[];
  accompanimentTone: AccompanimentToneId;
  strumStyle: StrumStyleId;
  cueEnabled: boolean;
  lastMidiEvent: MidiNoteEvent | null;
  audio: PracticeAudioApi;
}

function cueMidiForPitchClass(pitchClass: string) {
  const pitchIndex = NOTES.indexOf(pitchClass);
  if (pitchIndex < 0) return null;
  return 60 + pitchIndex;
}

export function usePracticeEngine({
  enabled,
  plan,
  progression,
  tuningStrings,
  accompanimentTone,
  strumStyle,
  cueEnabled,
  lastMidiEvent,
  audio,
}: UsePracticeEngineArgs) {
  const [phase, setPhase] = useState<PracticePhase>("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPulse, setCurrentPulse] = useState(0);
  const [countInRemainingPulses, setCountInRemainingPulses] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [currentBpm, setCurrentBpm] = useState(plan?.start_bpm ?? 0);
  const [consecutiveCleanReps, setConsecutiveCleanReps] = useState(0);
  const [lastRepScore, setLastRepScore] = useState<PracticeRepScore | null>(null);
  const [repHistory, setRepHistory] = useState<PracticeRepHistoryEntry[]>([]);
  const [lastSessionSummary, setLastSessionSummary] = useState<PracticeSessionSummary | null>(null);
  const [sessionHistory, setSessionHistory] = usePersistentState<PracticeSessionSummary[]>(
    "harmonia.practice.session-history",
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transportRunRef = useRef(0);
  const practiceSessionRef = useRef(0);
  const stepRef = useRef(0);
  const pulseRef = useRef(0);
  const remainingPulsesRef = useRef(0);
  const nextPulseTimeRef = useRef(0);
  const globalPulseRef = useRef(0);
  const countInRemainingRef = useRef(0);
  const countInPulseRef = useRef(0);
  const completedCyclesRef = useRef(0);
  const currentBpmRef = useRef(plan?.start_bpm ?? 0);
  const pendingVisualsRef = useRef<PracticeVisualEvent[]>([]);
  const displayedKeyRef = useRef("");
  const scheduledPulseMetasRef = useRef<ScheduledPulseMeta[]>([]);
  const cycleEventBucketsRef = useRef<Map<number, PracticeRepEvent[]>>(new Map());
  const pendingRepScoresRef = useRef<PendingRepScore[]>([]);
  const visualCycleRef = useRef(0);
  const scoringKeysRef = useRef(new Set<string>());
  const repHistoryRef = useRef<PracticeRepHistoryEntry[]>([]);
  const sessionStartedAtRef = useRef<string | null>(null);
  const sessionSavedRef = useRef(true);
  const sessionPlanRef = useRef<PracticePlan | null>(null);

  const planRef = useRef(plan);
  const progressionRef = useRef(progression);
  const tuningStringsRef = useRef(tuningStrings);
  const accompanimentToneRef = useRef(accompanimentTone);
  const strumStyleRef = useRef(strumStyle);
  const audioRef = useRef(audio);

  useEffect(() => {
    planRef.current = plan;
    progressionRef.current = progression;
    tuningStringsRef.current = tuningStrings;
    accompanimentToneRef.current = accompanimentTone;
    strumStyleRef.current = strumStyle;
    audioRef.current = audio;
  });

  async function scoreCompletedRep(
    sessionId: number,
    cycleIndex: number,
    bpmAtCycle: number,
    events: PracticeRepEvent[],
  ) {
    const activePlan = planRef.current;
    const scoreKey = `${sessionId}:${cycleIndex}`;
    if (!activePlan) {
      scoringKeysRef.current.delete(scoreKey);
      return;
    }

    try {
      const score = await scorePracticeRep(activePlan.targets, events);
      if (practiceSessionRef.current !== sessionId) return;

      setError(null);
      setLastRepScore(score);
      setRepHistory((previous) => [
        ...previous.slice(-11),
        { cycle: cycleIndex + 1, bpm: bpmAtCycle, score },
      ].slice(-12));
      repHistoryRef.current = [
        ...repHistoryRef.current.slice(-11),
        { cycle: cycleIndex + 1, bpm: bpmAtCycle, score },
      ].slice(-12);
      setConsecutiveCleanReps((previous) => {
        let next = score.clean_rep ? previous + 1 : 0;

        if (
          score.clean_rep
          && currentBpmRef.current < activePlan.target_bpm
          && next >= activePlan.reps_per_level
        ) {
          const nextBpm = Math.min(activePlan.target_bpm, currentBpmRef.current + activePlan.bpm_step);
          if (nextBpm !== currentBpmRef.current) {
            currentBpmRef.current = nextBpm;
            setCurrentBpm(nextBpm);
          }
          next = 0;
        }

        return next;
      });
    } catch (reason) {
      if (practiceSessionRef.current !== sessionId) return;
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      scoringKeysRef.current.delete(scoreKey);
    }
  }

  function flushPendingScores(nowMs: number) {
    const ready = pendingRepScoresRef.current.filter((item) => item.readyAtMs <= nowMs);
    if (ready.length === 0) return;

    pendingRepScoresRef.current = pendingRepScoresRef.current.filter((item) => item.readyAtMs > nowMs);

    ready.forEach((item) => {
      if (item.sessionId !== practiceSessionRef.current) return;
      const scoreKey = `${item.sessionId}:${item.cycleIndex}`;
      if (scoringKeysRef.current.has(scoreKey)) return;

      scoringKeysRef.current.add(scoreKey);
      const events = cycleEventBucketsRef.current.get(item.cycleIndex) ?? [];
      cycleEventBucketsRef.current.delete(item.cycleIndex);
      void scoreCompletedRep(item.sessionId, item.cycleIndex, item.bpm, events);
    });
  }

  function persistSessionSummary() {
    if (sessionSavedRef.current) return;

    const summary = summarizePracticeSession({
      plan: sessionPlanRef.current,
      repHistory: repHistoryRef.current,
      startedAt: sessionStartedAtRef.current,
      finalBpm: currentBpmRef.current,
    });

    sessionSavedRef.current = true;
    if (!summary) return;

    setLastSessionSummary(summary);
    setSessionHistory((previous) => [summary, ...previous].slice(0, 18));
  }

  const currentTargets = useMemo(
    () => (phase === "running" && plan ? practiceTargetsForMoment(plan.targets, currentStepIndex, currentPulse) : []),
    [currentPulse, currentStepIndex, phase, plan],
  );
  const heardNote = useMemo<HeardNoteFeedback | null>(() => {
    if (!lastMidiEvent || phase === "idle") return null;

    return {
      noteLabel: lastMidiEvent.noteLabel,
      inputName: lastMidiEvent.inputName,
      hit: phase === "running" && practiceTargetHit(currentTargets, lastMidiEvent.midi),
      atMs: lastMidiEvent.atMs,
    };
  }, [currentTargets, lastMidiEvent, phase]);
  const currentChord = progression[currentStepIndex] ?? null;
  const countInBeat = plan ? practiceCountInBeatLabel(countInRemainingPulses, plan.tempo_unit) : 0;

  function queueVisual(event: PracticeVisualEvent) {
    pendingVisualsRef.current.push(event);
  }

  function flushVisuals(now: number) {
    const pending = pendingVisualsRef.current;

    while (pending.length > 0 && pending[0].when <= now + VISUAL_EARLY_SECONDS) {
      const event = pending.shift();
      if (!event) break;

      if (event.phase === "running") {
        const estimatedAtMs = performance.now() + Math.max(0, (event.when - now) * 1000);
        scheduledPulseMetasRef.current.push({
          stepIndex: event.stepIndex,
          pulseIndex: event.pulseIndex,
          cycleIndex: event.cycleIndex,
          atMs: estimatedAtMs,
        });
        scheduledPulseMetasRef.current = scheduledPulseMetasRef.current.filter(
          (meta) => estimatedAtMs - meta.atMs <= 520,
        );

        if (event.stepIndex === 0 && event.pulseIndex === 0 && event.cycleIndex > visualCycleRef.current) {
          pendingRepScoresRef.current.push({
            cycleIndex: event.cycleIndex - 1,
            readyAtMs: estimatedAtMs + 160,
            bpm: currentBpmRef.current,
            sessionId: practiceSessionRef.current,
          });
          visualCycleRef.current = event.cycleIndex;
        }
      }

      setPhase(event.phase);
      setCurrentStepIndex(event.stepIndex);
      setCurrentPulse(event.pulseIndex);
      setCountInRemainingPulses(event.countInRemainingPulses);
      setCompletedCycles(event.completedCycles);
    }

    flushPendingScores(performance.now());
  }

  function scheduleCountInPulse(when: number) {
    const activePlan = planRef.current;
    if (!activePlan) return;

    queueVisual({
      when,
      phase: "count_in",
      stepIndex: 0,
      pulseIndex: 0,
      countInRemainingPulses: countInRemainingRef.current,
      completedCycles: 0,
      cycleIndex: 0,
    });

    if (isTempoClickPulse(countInPulseRef.current, activePlan.tempo_unit)) {
      audioRef.current.playClick(isBarDownbeatPulse(countInPulseRef.current), when);
    }

    countInRemainingRef.current -= 1;
    countInPulseRef.current += 1;

    if (countInRemainingRef.current <= 0) {
      stepRef.current = 0;
      pulseRef.current = 0;
      globalPulseRef.current = 0;
      completedCyclesRef.current = 0;
      remainingPulsesRef.current = pulsesForDuration(activePlan.step_durations[0] ?? "quarter");
    }
  }

  function scheduleRunningPulse(when: number) {
    const activePlan = planRef.current;
    const step = progressionRef.current[stepRef.current];
    if (!activePlan || !step) return;
    const cycleIndex = completedCyclesRef.current;

    if (pulseRef.current === 0) {
      audioRef.current.playChordStrum(
        step.chord_tones,
        tuningStringsRef.current,
        strumStyleRef.current,
        accompanimentToneRef.current,
        when,
      );
    }

    queueVisual({
      when,
      phase: "running",
      stepIndex: stepRef.current,
      pulseIndex: pulseRef.current,
      countInRemainingPulses: 0,
      completedCycles: completedCyclesRef.current,
      cycleIndex,
    });

    if (isTempoClickPulse(globalPulseRef.current, activePlan.tempo_unit)) {
      audioRef.current.playClick(isBarDownbeatPulse(globalPulseRef.current), when);
    }

    globalPulseRef.current += 1;
    remainingPulsesRef.current -= 1;

    if (remainingPulsesRef.current <= 0) {
      const nextStep = (stepRef.current + 1) % progressionRef.current.length;
      if (nextStep === 0) {
        completedCyclesRef.current += 1;
      }
      stepRef.current = nextStep;
      remainingPulsesRef.current = pulsesForDuration(activePlan.step_durations[nextStep] ?? "quarter");
      pulseRef.current = 0;
      return;
    }

    pulseRef.current += 1;
  }

  function scheduleLookahead(runId: number) {
    if (transportRunRef.current !== runId) {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      schedulerRef.current = null;
      return;
    }

    const activePlan = planRef.current;
    if (!activePlan) return;

    const now = audioRef.current.getCurrentTime();
    flushVisuals(now);
    const pulseMs = pulseMsForTempo(currentBpmRef.current || activePlan.start_bpm, activePlan.tempo_unit);
    const pulseSeconds = pulseMs / 1000;

    while (nextPulseTimeRef.current <= now + SCHEDULE_AHEAD_SECONDS) {
      if (countInRemainingRef.current > 0) {
        scheduleCountInPulse(nextPulseTimeRef.current);
      } else {
        scheduleRunningPulse(nextPulseTimeRef.current);
      }
      nextPulseTimeRef.current += pulseSeconds;
    }
  }

  function resetState() {
    setPhase("idle");
    setCurrentStepIndex(0);
    setCurrentPulse(0);
    setCountInRemainingPulses(0);
    setCompletedCycles(0);
    setIsPlaying(false);
    pendingVisualsRef.current = [];
    displayedKeyRef.current = "";
    scheduledPulseMetasRef.current = [];
    cycleEventBucketsRef.current.clear();
    pendingRepScoresRef.current = [];
    scoringKeysRef.current.clear();
    visualCycleRef.current = 0;
  }

  async function startPractice() {
    const activePlan = planRef.current;
    if (!activePlan || progressionRef.current.length === 0) return;
    if (activePlan.input_mode !== "midi") {
      setError("Le mode live de cette étape supporte seulement le MIDI pour l'instant.");
      return;
    }

    const runId = transportRunRef.current + 1;
    const sessionId = practiceSessionRef.current + 1;
    transportRunRef.current = runId;
    practiceSessionRef.current = sessionId;

    await audioRef.current.unlockAudio();
    if (transportRunRef.current !== runId) return;

    if (accompanimentToneRef.current === "acoustic") {
      const uniqueChords = Array.from(new Set(progressionRef.current.map((step) => step.chord_tones.join("|"))));
      await Promise.all(
        uniqueChords.map((tones) =>
          audioRef.current.preloadChordSamples(tones.split("|"), tuningStringsRef.current).catch(() => undefined),
        ),
      );
      if (transportRunRef.current !== runId) return;
    }

    setError(null);
    setCurrentBpm(activePlan.start_bpm);
    currentBpmRef.current = activePlan.start_bpm;
    setConsecutiveCleanReps(0);
    setLastRepScore(null);
    sessionPlanRef.current = activePlan;
    sessionStartedAtRef.current = new Date().toISOString();
    sessionSavedRef.current = false;
    setRepHistory([]);
    repHistoryRef.current = [];
    stepRef.current = 0;
    pulseRef.current = 0;
    globalPulseRef.current = 0;
    countInPulseRef.current = 0;
    countInRemainingRef.current = practiceCountInPulses(activePlan.count_in_bars);
    completedCyclesRef.current = 0;
    remainingPulsesRef.current = pulsesForDuration(activePlan.step_durations[0] ?? "quarter");
    nextPulseTimeRef.current = audioRef.current.getCurrentTime() + START_DELAY_SECONDS;
    pendingVisualsRef.current = [];
    scheduledPulseMetasRef.current = [];
    cycleEventBucketsRef.current.clear();
    pendingRepScoresRef.current = [];
    scoringKeysRef.current.clear();
    visualCycleRef.current = 0;
    setIsPlaying(true);
    setPhase(countInRemainingRef.current > 0 ? "count_in" : "running");
    setCountInRemainingPulses(countInRemainingRef.current);
    setCurrentStepIndex(0);
    setCurrentPulse(0);
    scheduleLookahead(runId);
    schedulerRef.current = setInterval(() => {
      scheduleLookahead(runId);
    }, SCHEDULER_INTERVAL_MS);
  }

  function stopPractice() {
    transportRunRef.current += 1;
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    schedulerRef.current = null;
    audioRef.current.stopAllSounds();
    persistSessionSummary();
    practiceSessionRef.current += 1;
    resetState();
  }

  const stopPracticeEvent = useEffectEvent(() => {
    stopPractice();
  });

  useEffect(() => {
    if (enabled) return;
    stopPracticeEvent();
  }, [enabled]);

  useEffect(() => () => {
    transportRunRef.current += 1;
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    audioRef.current.stopAllSounds();
  }, []);

  useEffect(() => {
    if (!cueEnabled || phase !== "running" || currentTargets.length === 0) return;

    const cueKey = `${currentStepIndex}:${currentPulse}:${currentTargets.map((target) => target.pitch_classes.join("-")).join("|")}`;
    if (cueKey === displayedKeyRef.current) return;
    displayedKeyRef.current = cueKey;

    const cueMidi = cueMidiForPitchClass(currentTargets[0].pitch_classes[0] ?? "");
    if (cueMidi !== null) {
      audio.playGuideTone(cueMidi, undefined, 0.26);
    }
  }, [audio, cueEnabled, currentPulse, currentStepIndex, currentTargets, phase]);

  const handleMidiEvent = useEffectEvent((midiEvent: MidiNoteEvent) => {
    flushPendingScores(midiEvent.atMs);

    const closestPulse = scheduledPulseMetasRef.current
      .filter((meta) => Math.abs(meta.atMs - midiEvent.atMs) <= 180)
      .sort((left, right) => Math.abs(left.atMs - midiEvent.atMs) - Math.abs(right.atMs - midiEvent.atMs))[0];

    if (!closestPulse) return;

    const bucket = cycleEventBucketsRef.current.get(closestPulse.cycleIndex) ?? [];
    bucket.push({
      step_index: closestPulse.stepIndex,
      pulse_index: closestPulse.pulseIndex,
      midi: midiEvent.midi,
      timing_error_ms: Math.round(midiEvent.atMs - closestPulse.atMs),
    });
    cycleEventBucketsRef.current.set(closestPulse.cycleIndex, bucket);
    scheduledPulseMetasRef.current = scheduledPulseMetasRef.current.filter(
      (meta) => midiEvent.atMs - meta.atMs <= 520,
    );
  });

  useEffect(() => {
    if (!lastMidiEvent || phase !== "running" || !isPlaying) return;
    handleMidiEvent(lastMidiEvent);
  }, [isPlaying, lastMidiEvent, phase]);

  function replayCue() {
    if (currentTargets.length === 0) return;
    const cueMidi = cueMidiForPitchClass(currentTargets[0].pitch_classes[0] ?? "");
    if (cueMidi !== null) {
      audio.playGuideTone(cueMidi, undefined, 0.3);
    }
  }

  function nudgeBpm(delta: number) {
    const activePlan = planRef.current;
    if (!activePlan) return;
    const next = Math.min(260, Math.max(40, currentBpmRef.current + delta));
    if (next === currentBpmRef.current) return;
    currentBpmRef.current = next;
    setCurrentBpm(next);
  }

  const currentPulseTotal = plan && phase === "running"
    ? pulsesForDuration(plan.step_durations[currentStepIndex] ?? "quarter")
    : 0;
  const planProgressionFingerprint = plan?.progression_steps.join("|") ?? "";
  const progressionFingerprint = progression.map((step) => step.display_name).join("|");
  const tuningFingerprint = tuningStrings.join("|");

  const stopForConfigChange = useEffectEvent(() => {
    if (isPlaying) {
      stopPractice();
    }
  });

  useEffect(() => {
    stopForConfigChange();
  }, [
    accompanimentTone,
    plan?.exercise_id,
    planProgressionFingerprint,
    progressionFingerprint,
    strumStyle,
    tuningFingerprint,
  ]);

  return {
    phase,
    isPlaying,
    currentBpm,
    currentStepIndex,
    currentPulse,
    currentPulseTotal,
    currentTargets,
    currentChord,
    completedCycles,
    consecutiveCleanReps,
    countInRemainingPulses,
    countInBeat,
    heardNote,
    lastRepScore,
    repHistory,
    lastSessionSummary,
    sessionHistory,
    error,
    startPractice,
    stopPractice,
    replayCue,
    nudgeBpm,
    clearSessionHistory: () => {
      setSessionHistory([]);
      setLastSessionSummary(null);
    },
  };
}
