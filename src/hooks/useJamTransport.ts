import { useEffect, useEffectEvent, useRef, useState } from "react";
import { noteValue, type BeatPattern, type BeatStepEvent, type NoteValueId, type ProgressionChord, type StrumStyleId } from "../music";

interface JamAudioApi {
  unlockAudio: () => Promise<void>;
  preloadChordSamples: (chordTones: string[], tuningStrings: string[]) => Promise<void>;
  playClick: (isDownbeat: boolean, when?: number) => void;
  playChordStrum: (chordTones: string[], tuningStrings: string[], strumStyle: StrumStyleId) => void;
  playBeatStep: (events: BeatStepEvent[], step: number, pulseMs: number, swing: number) => void;
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
  audio,
}: UseJamTransportArgs) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const jamRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);
  const barStepRef = useRef(0);
  const pulseRef = useRef(0);
  const remainingPulsesRef = useRef(0);
  const transportRunRef = useRef(0);

  const progressionRef = useRef(progression);
  const stepDurationsRef = useRef(stepDurations);
  const beatPatternRef = useRef(beatPattern);
  const bpmRef = useRef(bpm);
  const tempoUnitRef = useRef(tempoUnit);
  const tuningStringsRef = useRef(tuningStrings);
  const strumStyleRef = useRef(strumStyle);
  const isPlayingRef = useRef(isPlaying);
  const audioRef = useRef(audio);

  useEffect(() => {
    progressionRef.current = progression;
    stepDurationsRef.current = stepDurations;
    beatPatternRef.current = beatPattern;
    bpmRef.current = bpm;
    tempoUnitRef.current = tempoUnit;
    tuningStringsRef.current = tuningStrings;
    strumStyleRef.current = strumStyle;
    isPlayingRef.current = isPlaying;
    audioRef.current = audio;
  });

  function transportPulseQuarters(durations: NoteValueId[], tempoValue: NoteValueId) {
    const progressionPulseValues = durations.map((duration) => noteValue(duration).quarters);
    return Math.min(noteValue(tempoValue).quarters, ...progressionPulseValues, 0.25);
  }

  function pulsesForDuration(duration: NoteValueId, durations: NoteValueId[], tempoValue: NoteValueId) {
    return Math.max(1, Math.round(noteValue(duration).quarters / transportPulseQuarters(durations, tempoValue)));
  }

  function playStep(stepIndex: number, beat: number) {
    const step = progressionRef.current[stepIndex];
    if (!step) return;
    onActiveStepChange(stepIndex);
    setCurrentBeat(beat);
    audioRef.current.playChordStrum(step.chord_tones, tuningStringsRef.current, strumStyleRef.current);
  }

  async function startJam() {
    const runId = transportRunRef.current + 1;
    transportRunRef.current = runId;

    if (progressionRef.current.length === 0) return;

    await audioRef.current.unlockAudio();
    if (transportRunRef.current !== runId) return;

    const uniqueChords = Array.from(new Set(progressionRef.current.map((step) => step.chord_tones.join("|"))));
    await Promise.all(
      uniqueChords.map((tones) =>
        audioRef.current.preloadChordSamples(tones.split("|"), tuningStringsRef.current).catch(() => undefined),
      ),
    );
    if (transportRunRef.current !== runId) return;

    stepRef.current = 0;
    barStepRef.current = 0;
    pulseRef.current = 0;
    remainingPulsesRef.current = pulsesForDuration(
      stepDurationsRef.current[0] ?? "quarter",
      stepDurationsRef.current,
      tempoUnitRef.current,
    );
    setIsPlaying(true);

    const pulseQuarters = transportPulseQuarters(stepDurationsRef.current, tempoUnitRef.current);
    const pulseMs = ((60 / bpmRef.current) * 1000 * pulseQuarters) / noteValue(tempoUnitRef.current).quarters;
    const clickEvery = Math.max(1, Math.round(noteValue(tempoUnitRef.current).quarters / pulseQuarters));

    playStep(0, 0);
    audioRef.current.playClick(true);

    if (beatPatternRef.current) {
      const initialEvents = beatPatternRef.current.events.filter((event) => event.step === 0);
      audioRef.current.playBeatStep(initialEvents, 0, pulseMs, beatPatternRef.current.swing);
    }

    jamRef.current = setInterval(() => {
      if (transportRunRef.current !== runId) {
        if (jamRef.current) clearInterval(jamRef.current);
        jamRef.current = null;
        return;
      }

      pulseRef.current += 1;
      remainingPulsesRef.current -= 1;

      const pattern = beatPatternRef.current;
      if (pattern) {
        barStepRef.current = (barStepRef.current + 1) % Math.max(1, pattern.steps_per_bar);
        const beatEvents = pattern.events.filter((event) => event.step === barStepRef.current);
        audioRef.current.playBeatStep(beatEvents, barStepRef.current, pulseMs, pattern.swing);
      }

      const isTempoPulse = pulseRef.current % clickEvery === 0;

      if (remainingPulsesRef.current <= 0) {
        stepRef.current = (stepRef.current + 1) % progressionRef.current.length;
        remainingPulsesRef.current = pulsesForDuration(
          stepDurationsRef.current[stepRef.current] ?? "quarter",
          stepDurationsRef.current,
          tempoUnitRef.current,
        );
        pulseRef.current = 0;
        playStep(stepRef.current, 0);
        if (isTempoPulse) {
          audioRef.current.playClick(true);
        }
        return;
      }

      if (isTempoPulse) {
        audioRef.current.playClick(false);
      }
      setCurrentBeat(
        Math.min(
          pulseRef.current,
          pulsesForDuration(
            stepDurationsRef.current[stepRef.current] ?? "quarter",
            stepDurationsRef.current,
            tempoUnitRef.current,
          ) - 1,
        ),
      );
    }, pulseMs);
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
    remainingPulsesRef.current = 0;
  }

  const restartJam = useEffectEvent(() => {
    if (isPlayingRef.current) {
      stopJam();
      void startJam();
    }
  });

  useEffect(() => {
    restartJam();
  }, [bpm, tempoUnit, stepDurations, tuningKey, strumStyle]);

  useEffect(() => () => {
    transportRunRef.current += 1;
    if (jamRef.current) clearInterval(jamRef.current);
    audioRef.current.stopAllSounds();
  }, []);

  const currentDuration = stepDurations[activeStep] ?? "quarter";
  const currentPulseTotal = pulsesForDuration(currentDuration, stepDurations, tempoUnit);

  return {
    currentBeat,
    currentPulseTotal,
    isPlaying,
    startJam,
    stopJam,
  };
}
