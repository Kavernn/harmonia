import { useEffect, useEffectEvent, useState } from "react";
import { useAudio } from "./useAudio";
import { useBeatComposer } from "./useBeatComposer";
import { useFretboardWindow } from "./useFretboardWindow";
import { useJamTransport } from "./useJamTransport";
import { useScaleAnalysis } from "./useScaleAnalysis";
import { NOTES, QUALITIES, buildTuningPresets, type NoteValueId, type StrumStyleId } from "../music";

const TUNING_PRESETS = buildTuningPresets();

export function useComposerState() {
  const [selectedTuningId, setSelectedTuningId] = useState("6-E");
  const [tab, setTab] = useState<"suggest" | "build">("suggest");
  const [bpm, setBpm] = useState(80);
  const [tempoUnit, setTempoUnit] = useState<NoteValueId>("quarter");
  const [stepDurations, setStepDurations] = useState<NoteValueId[]>([]);
  const [masterVolume, setMasterVolume] = useState(0.9);
  const [clickVolume, setClickVolume] = useState(0.45);
  const [guitarVolume, setGuitarVolume] = useState(0.9);
  const [strumStyle, setStrumStyle] = useState<StrumStyleId>("smooth");
  const [activeStep, setActiveStep] = useState(0);

  const selectedTuning = TUNING_PRESETS.find((preset) => preset.id === selectedTuningId) ?? TUNING_PRESETS[0];
  const selectedTuningSemitones = selectedTuning.strings.map((note) => NOTES.indexOf(note));

  const audio = useAudio(masterVolume, clickVolume, guitarVolume);
  const beatComposer = useBeatComposer();
  const scaleAnalysis = useScaleAnalysis({
    tuningKey: selectedTuningId,
    tuningSemitones: selectedTuningSemitones,
    stopJam: () => stopJam(),
    onResetActiveStep: () => setActiveStep(0),
    onProgressionUpdated: (nextProgression) => {
      setStepDurations((prev) => nextProgression.map((_, index) => prev[index] ?? "quarter"));
    },
  });

  const {
    root,
    quality,
    minConf,
    scales,
    selectedScale,
    namedProgs,
    activeDegrees,
    progression,
    scalePositions,
    loading,
    error,
    setRoot,
    setQuality,
    setMinConf,
    setSelectedScale,
    setActiveDegrees,
  } = scaleAnalysis;

  const fretboardWindow = useFretboardWindow({
    scalePositions,
    progression,
    activeStep,
  });

  function handleActiveStepChange(nextStep: number) {
    fretboardWindow.triggerStepFlash(nextStep, activeStep);
    setActiveStep(nextStep);
  }

  const {
    currentBeat,
    currentPulseTotal,
    isPlaying,
    startJam,
    stopJam,
  } = useJamTransport({
    activeStep,
    onActiveStepChange: handleActiveStepChange,
    progression,
    stepDurations,
    beatPattern: beatComposer.beatPattern,
    bpm,
    tempoUnit,
    tuningKey: selectedTuningId,
    tuningStrings: selectedTuning.strings,
    strumStyle,
    audio,
  });

  const preloadProgressionSamples = useEffectEvent(() => {
    if (progression.length === 0) return;
    const uniqueChords = Array.from(new Set(progression.map((step) => step.chord_tones.join("|"))));
    uniqueChords.forEach((tones) => {
      void audio.preloadChordSamples(tones.split("|"), selectedTuning.strings);
    });
  });

  useEffect(() => {
    preloadProgressionSamples();
  }, [progression, selectedTuningId]);

  const selectedQualityLabel = QUALITIES.find((item) => item.id === quality)?.label ?? quality;

  return {
    sidebarProps: {
      tuningPresets: TUNING_PRESETS,
      selectedTuningId,
      root,
      quality,
      minConf,
      onSelectTuningId: setSelectedTuningId,
      onSelectRoot: setRoot,
      onSelectQuality: setQuality,
      onSelectMinConfidence: setMinConf,
    },
    scaleSuggestionsProps: {
      rootName: NOTES[root],
      qualityLabel: selectedQualityLabel,
      scales,
      selectedScale,
      loading,
      error,
      onSelectScale: setSelectedScale,
    },
    beatMakerProps: beatComposer.beatPattern ? {
      beatLibrary: beatComposer.beatLibrary,
      beatPattern: beatComposer.beatPattern,
      selectedBeatStyle: beatComposer.selectedBeatStyle,
      beatIntensity: beatComposer.beatIntensity,
      beatSwing: beatComposer.beatSwing,
      beatPatternDirty: beatComposer.beatPatternDirty,
      onSelectBeatStyle: beatComposer.setSelectedBeatStyle,
      onBeatIntensityChange: beatComposer.setBeatIntensity,
      onBeatSwingChange: beatComposer.setBeatSwing,
      onResetBeatPattern: beatComposer.resetBeatPattern,
      onCycleBeatStep: beatComposer.cycleBeatStep,
    } : null,
    progressionJamProps: selectedScale ? {
      selectedScale,
      namedProgs,
      tab,
      activeDegrees,
      progression,
      activeStep,
      stepDurations,
      isPlaying,
      bpm,
      tempoUnit,
      currentPulseTotal,
      currentBeat,
      clickVolume,
      guitarVolume,
      masterVolume,
      strumStyle,
      scalePositions,
      windowStart: fretboardWindow.windowStart,
      windowSize: fretboardWindow.windowSize,
      showAvoid: fretboardWindow.showAvoid,
      flash: fretboardWindow.flash,
      followChord: fretboardWindow.followChord,
      selectedTuningName: selectedTuning.name,
      selectedTuningStrings: selectedTuning.strings,
      onTabChange: setTab,
      onSelectNamedProgression: setActiveDegrees,
      onToggleDegree: (degree: number) => setActiveDegrees((prev) =>
        prev.includes(degree) ? prev.filter((item) => item !== degree) : [...prev, degree]
      ),
      onClearDegrees: () => setActiveDegrees([]),
      onSelectStep: (index: number) => {
        stopJam();
        handleActiveStepChange(index);
      },
      onStepDurationChange: (index: number, value: NoteValueId) => setStepDurations((prev) =>
        prev.map((item, itemIndex) => itemIndex === index ? value : item)
      ),
      onStartJam: () => { void startJam(); },
      onStopJam: stopJam,
      onBpmChange: setBpm,
      onTempoUnitChange: setTempoUnit,
      onClickVolumeChange: setClickVolume,
      onGuitarVolumeChange: setGuitarVolume,
      onMasterVolumeChange: setMasterVolume,
      onStrumStyleChange: setStrumStyle,
      onWindowSizeChange: fretboardWindow.setWindowSize,
      onToggleShowAvoid: () => fretboardWindow.setShowAvoid((value) => !value),
      onToggleFollowChord: () => fretboardWindow.setFollowChord((value) => !value),
    } : null,
  };
}
