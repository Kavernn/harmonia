import { useEffect, useEffectEvent, useRef, useState } from "react";
import { type AccompanimentToneId, type BeatPattern, type BeatStepEvent, type NoteValueId, type ProgressionChord, type StrumStyleId } from "../music";
import { isBarDownbeatPulse, isTempoClickPulse, pulseMsForTempo, pulsesForDuration, transportBarSteps } from "../transportMath";

const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const START_DELAY_SECONDS = 0.05;
const VISUAL_EARLY_SECONDS = 0.01;

interface TransportVisualEvent {
  when: number;
  stepIndex: number;
  beat: number;
}

interface JamAudioApi {
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
  playBeatStep: (events: BeatStepEvent[], step: number, pulseMs: number, swing: number, when?: number) => void;
  stopAllSounds: () => void;
}

interface UseJamTransportArgs {
  activeStep: number;
  onActiveStepChange: (step: number) => void;
  progression: ProgressionChord[];
  stepDurations: NoteValueId[];
  beatPattern: BeatPattern | null;
  bpm: number;
  tempoUnit: NoteValueId;
  tuningKey: string;
  tuningStrings: string[];
  strumStyle: StrumStyleId;
  accompanimentTone: AccompanimentToneId;
  audio: JamAudioApi;
}

export function useJamTransport({
  activeStep,
  onActiveStepChange,
  progression,
  stepDurations,
  beatPattern,
  bpm,
  tempoUnit,
  tuningKey,
  tuningStrings,
  strumStyle,
  accompanimentTone,
  audio,
}: UseJamTransportArgs) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const jamRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);
  const barStepRef = useRef(0);
  const pulseRef = useRef(0);
  const globalPulseRef = useRef(0);
  const nextPulseTimeRef = useRef(0);
  const remainingPulsesRef = useRef(0);
  const transportRunRef = useRef(0);
  const pendingVisualsRef = useRef<TransportVisualEvent[]>([]);
  const displayedStepRef = useRef(activeStep);

  const progressionRef = useRef(progression);
  const stepDurationsRef = useRef(stepDurations);
  const beatPatternRef = useRef(beatPattern);
  const bpmRef = useRef(bpm);
  const tempoUnitRef = useRef(tempoUnit);
  const tuningStringsRef = useRef(tuningStrings);
  const strumStyleRef = useRef(strumStyle);
  const accompanimentToneRef = useRef(accompanimentTone);
  const isPlayingRef = useRef(isPlaying);
  const audioRef = useRef(audio);
  const onActiveStepChangeRef = useRef(onActiveStepChange);

  useEffect(() => {
    progressionRef.current = progression;
    stepDurationsRef.current = stepDurations;
    beatPatternRef.current = beatPattern;
    bpmRef.current = bpm;
    tempoUnitRef.current = tempoUnit;
    tuningStringsRef.current = tuningStrings;
    strumStyleRef.current = strumStyle;
    accompanimentToneRef.current = accompanimentTone;
    isPlayingRef.current = isPlaying;
    audioRef.current = audio;
    onActiveStepChangeRef.current = onActiveStepChange;
  });

  useEffect(() => {
    displayedStepRef.current = activeStep;
  }, [activeStep]);

  function flushVisualEvents(now: number) {
    const pending = pendingVisualsRef.current;

    while (pending.length > 0 && pending[0].when <= now + VISUAL_EARLY_SECONDS) {
      const event = pending.shift();
      if (!event) break;

      if (event.stepIndex !== displayedStepRef.current) {
        displayedStepRef.current = event.stepIndex;
        onActiveStepChangeRef.current(event.stepIndex);
      }

      setCurrentBeat(event.beat);
    }
  }

  function queueVisual(stepIndex: number, beat: number, when: number) {
    pendingVisualsRef.current.push({ when, stepIndex, beat });
  }

  function schedulePulse(when: number, pulseMs: number) {
    const stepIndex = stepRef.current;
    const step = progressionRef.current[stepIndex];
    if (!step) return;

    const beat = pulseRef.current;
    const pattern = beatPatternRef.current;
    const stepsPerBar = transportBarSteps(pattern?.steps_per_bar);

    if (beat === 0) {
      audioRef.current.playChordStrum(
        step.chord_tones,
        tuningStringsRef.current,
        strumStyleRef.current,
        accompanimentToneRef.current,
        when,
      );
    }

    queueVisual(stepIndex, beat, when);

    if (isTempoClickPulse(globalPulseRef.current, tempoUnitRef.current)) {
      audioRef.current.playClick(isBarDownbeatPulse(globalPulseRef.current, stepsPerBar), when);
    }

    if (pattern) {
      const beatEvents = pattern.events.filter((event) => event.step === barStepRef.current);
      audioRef.current.playBeatStep(beatEvents, barStepRef.current, pulseMs, pattern.swing, when);
    }

    globalPulseRef.current += 1;
    barStepRef.current = (barStepRef.current + 1) % stepsPerBar;
    remainingPulsesRef.current -= 1;

    if (remainingPulsesRef.current <= 0) {
      stepRef.current = (stepRef.current + 1) % progressionRef.current.length;
      remainingPulsesRef.current = pulsesForDuration(stepDurationsRef.current[stepRef.current] ?? "quarter");
      pulseRef.current = 0;
      return;
    }

    pulseRef.current += 1;
  }

  function scheduleLookahead(runId: number) {
    if (transportRunRef.current !== runId) {
      if (jamRef.current) clearInterval(jamRef.current);
      jamRef.current = null;
      return;
    }

    const now = audioRef.current.getCurrentTime();
    flushVisualEvents(now);

    const pulseMs = pulseMsForTempo(bpmRef.current, tempoUnitRef.current);
    const pulseSeconds = pulseMs / 1000;

    while (nextPulseTimeRef.current <= now + SCHEDULE_AHEAD_SECONDS) {
      schedulePulse(nextPulseTimeRef.current, pulseMs);
      nextPulseTimeRef.current += pulseSeconds;
    }
  }

  async function startJam() {
    const runId = transportRunRef.current + 1;
    transportRunRef.current = runId;

    if (progressionRef.current.length === 0) return;

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

    stepRef.current = 0;
    barStepRef.current = 0;
    pulseRef.current = 0;
    globalPulseRef.current = 0;
    nextPulseTimeRef.current = audioRef.current.getCurrentTime() + START_DELAY_SECONDS;
    remainingPulsesRef.current = pulsesForDuration(stepDurationsRef.current[0] ?? "quarter");
    pendingVisualsRef.current = [];
    displayedStepRef.current = activeStep;
    setCurrentBeat(0);
    setIsPlaying(true);

    scheduleLookahead(runId);
    jamRef.current = setInterval(() => {
      scheduleLookahead(runId);
    }, SCHEDULER_INTERVAL_MS);
  }

  function stopJam() {
    transportRunRef.current += 1;
    if (jamRef.current) clearInterval(jamRef.current);
    jamRef.current = null;
    audioRef.current.stopAllSounds();
    setIsPlaying(false);
    setCurrentBeat(0);
    barStepRef.current = 0;
    pulseRef.current = 0;
    globalPulseRef.current = 0;
    nextPulseTimeRef.current = 0;
    remainingPulsesRef.current = 0;
    pendingVisualsRef.current = [];
  }

  const restartJam = useEffectEvent(() => {
    if (isPlayingRef.current) {
      stopJam();
      void startJam();
    }
  });

  useEffect(() => {
    restartJam();
  }, [bpm, tempoUnit, stepDurations, tuningKey, strumStyle, accompanimentTone]);

  useEffect(() => () => {
    transportRunRef.current += 1;
    if (jamRef.current) clearInterval(jamRef.current);
    audioRef.current.stopAllSounds();
  }, []);

  const currentDuration = stepDurations[activeStep] ?? "quarter";
  const currentPulseTotal = pulsesForDuration(currentDuration);

  return {
    currentBeat,
    currentPulseTotal,
    isPlaying,
    startJam,
    stopJam,
  };
}
