import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useAudio } from "./useAudio";
import { useBeatComposer } from "./useBeatComposer";
import { useFretboardWindow } from "./useFretboardWindow";
import { useJamTransport } from "./useJamTransport";
import { useMidiInput } from "./useMidiInput";
import { usePersistentState } from "./usePersistentState";
import { usePracticeEngine } from "./usePracticeEngine";
import { usePracticePlanner } from "./usePracticePlanner";
import { useScaleAnalysis } from "./useScaleAnalysis";
import { buildPhraseGuides } from "../phraseGuide";
import {
  HARMONY_SCALES,
  NOTES,
  buildTuningPresets,
  type AccompanimentToneId,
  type NoteValueId,
  type StrumStyleId,
} from "../music";
import { phraseGuideActiveStepIndex } from "../transportMath";
import type { CommandAction } from "../components/CommandPalette";

const TUNING_PRESETS = buildTuningPresets();

export function useComposerState() {
  const [selectedTuningId, setSelectedTuningId] = usePersistentState("harmonia.tuning-id", "6-E");
  const [mainView, setMainView] = usePersistentState<"jam" | "practice" | "palettes" | "beat">("harmonia.main-view", "jam");
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState("harmonia.sidebar-collapsed", false);
  const [sidebarFilter, setSidebarFilter] = usePersistentState("harmonia.sidebar-filter", "");
  const [tab, setTab] = usePersistentState<"suggest" | "build">("harmonia.progression-tab", "suggest");
  const [bpm, setBpm] = usePersistentState("harmonia.bpm", 80);
  const [tempoUnit, setTempoUnit] = usePersistentState<NoteValueId>("harmonia.tempo-unit", "quarter");
  const [stepDurations, setStepDurations] = useState<NoteValueId[]>([]);
  const [masterVolume, setMasterVolume] = usePersistentState("harmonia.master-volume", 0.9);
  const [clickVolume, setClickVolume] = usePersistentState("harmonia.click-volume", 0.45);
  const [guitarVolume, setGuitarVolume] = usePersistentState("harmonia.guitar-volume", 0.9);
  const [strumStyle, setStrumStyle] = usePersistentState<StrumStyleId>("harmonia.strum-style", "smooth");
  const [accompanimentTone, setAccompanimentTone] = usePersistentState<AccompanimentToneId>("harmonia.accompaniment-tone", "acoustic");
  const [activeStep, setActiveStep] = useState(0);
  const [playPhraseCue, setPlayPhraseCue] = usePersistentState("harmonia.play-phrase-cue", false);
  const [practiceCueEnabled, setPracticeCueEnabled] = usePersistentState("harmonia.practice.cue-enabled", true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const lastPhraseCueRef = useRef("");

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
    harmonyRoot,
    harmonyScaleName,
    minConf,
    scales,
    selectedScale,
    namedProgs,
    compatibleModes,
    activeSteps,
    progressionStepOptions,
    progression,
    scalePositions,
    loading,
    error,
    setHarmonyRoot,
    setHarmonyScaleName,
    setMinConf,
    setSelectedScale,
    setSoloPalette,
    setActiveSteps,
  } = scaleAnalysis;

  const practicePlanner = usePracticePlanner({
    harmonyRoot,
    harmonyScaleName,
    selectedScale,
    activeSteps,
    currentProgression: progression,
    tuningSemitones: selectedTuningSemitones,
  });
  const midiInput = useMidiInput(mainView === "practice");

  const fretboardWindow = useFretboardWindow({
    scalePositions,
    progression,
    activeStep,
  });

  function handleActiveStepChange(nextStep: number) {
    fretboardWindow.triggerStepFlash(nextStep, activeStep);
    setActiveStep(nextStep);
  }

  function goToNextStep() {
    if (!progression.length) return;
    stopJam();
    handleActiveStepChange((activeStep + 1) % progression.length);
  }

  function goToPreviousStep() {
    if (!progression.length) return;
    stopJam();
    handleActiveStepChange((activeStep - 1 + progression.length) % progression.length);
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
    accompanimentTone,
    audio,
  });

  const practiceEngine = usePracticeEngine({
    enabled: mainView === "practice",
    plan: practicePlanner.plan,
    progression: practicePlanner.progressionPreview,
    tuningStrings: selectedTuning.strings,
    accompanimentTone,
    strumStyle,
    cueEnabled: practiceCueEnabled,
    lastMidiEvent: midiInput.lastEvent,
    audio,
  });

  const preloadProgressionSamples = useEffectEvent(() => {
    if (progression.length === 0) return;
    if (accompanimentTone !== "acoustic") return;
    const uniqueChords = Array.from(new Set(progression.map((step) => step.chord_tones.join("|"))));
    uniqueChords.forEach((tones) => {
      void audio.preloadChordSamples(tones.split("|"), selectedTuning.strings);
    });
  });

  useEffect(() => {
    preloadProgressionSamples();
  }, [progression, selectedTuningId, accompanimentTone]);

  function clampBpm(nextBpm: number) {
    setBpm(Math.min(200, Math.max(40, nextBpm)));
  }

  const currentStep = progression[activeStep];
  const nextStep = progression[(activeStep + 1) % Math.max(1, progression.length)] ?? currentStep;
  const currentChordTones = useMemo(() => currentStep?.chord_tones ?? [], [currentStep]);
  const currentRootNote = currentChordTones[0] ?? "";
  const phraseGuides = useMemo(
    () => (selectedScale && currentStep && nextStep
      ? buildPhraseGuides({
        scalePositions,
        currentChordTones,
        currentChordQuality: currentStep.quality,
        currentRootNote,
        nextChordTones: nextStep.chord_tones ?? [],
        nextChordQuality: nextStep.quality ?? currentStep.quality,
        nextRootNote: nextStep.chord_tones?.[0] ?? currentRootNote,
        scaleRoot: selectedScale.scale_root,
        tuningStrings: selectedTuning.strings,
        windowStart: fretboardWindow.windowStart,
        windowSize: fretboardWindow.windowSize,
      })
      : []),
    [
      currentChordTones,
      currentRootNote,
      currentStep,
      fretboardWindow.windowSize,
      fretboardWindow.windowStart,
      nextStep,
      scalePositions,
      selectedScale,
      selectedTuning.strings,
    ],
  );
  const cuePhrase = phraseGuides[0] ?? null;

  useEffect(() => {
    if (!isPlaying || !playPhraseCue || !cuePhrase || currentPulseTotal <= 0) {
      lastPhraseCueRef.current = "";
      return;
    }

    const cueStepIndex = phraseGuideActiveStepIndex(currentBeat, cuePhrase.steps.length, currentPulseTotal, tempoUnit);
    if (cueStepIndex < 0) return;

    const cueStep = cuePhrase.steps[cueStepIndex];
    if (!cueStep) return;

    const cueKey = `${activeStep}:${cuePhrase.id}:${cueStepIndex}`;
    if (cueKey === lastPhraseCueRef.current) return;

    lastPhraseCueRef.current = cueKey;
    audio.playGuideTone(cueStep.midi);
  }, [activeStep, audio, cuePhrase, currentBeat, currentPulseTotal, isPlaying, playPhraseCue, tempoUnit]);

  const handleKeyboardShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setCommandPaletteOpen((value) => !value);
      return;
    }

    if (event.key === "Escape") {
      setCommandPaletteOpen(false);
      return;
    }

    if (commandPaletteOpen) return;
    if (event.altKey) return;
    if (event.metaKey || event.ctrlKey) return;

    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName;
    if (
      tagName === "INPUT"
      || tagName === "TEXTAREA"
      || tagName === "SELECT"
      || target?.isContentEditable
    ) {
      return;
    }

    if (event.key === "/") {
      event.preventDefault();
      setCommandPaletteOpen(true);
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      if (mainView === "practice") {
        if (practiceEngine.isPlaying) {
          practiceEngine.stopPractice();
        } else {
          stopJam();
          void practiceEngine.startPractice();
        }
        return;
      }

      if (!progression.length) return;
      if (isPlaying) {
        stopJam();
      } else {
        practiceEngine.stopPractice();
        void startJam();
      }
      return;
    }

    if (event.key === "ArrowRight" && progression.length > 0) {
      event.preventDefault();
      goToNextStep();
      return;
    }

    if (event.key === "ArrowLeft" && progression.length > 0) {
      event.preventDefault();
      goToPreviousStep();
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      clampBpm(bpm + 1);
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      clampBpm(bpm - 1);
      return;
    }

    if (event.key === "1") {
      fretboardWindow.setLabelMode("function");
      return;
    }

    if (event.key === "2") {
      fretboardWindow.setLabelMode("degree");
      return;
    }

    if (event.key === "3") {
      fretboardWindow.setLabelMode("note");
      return;
    }

    if (event.key.toLowerCase() === "t") {
      fretboardWindow.setShowTabGuide((value) => !value);
      return;
    }

    if (event.key.toLowerCase() === "p") {
      fretboardWindow.setShowPhraseGuide((value) => !value);
      return;
    }

    if (event.key.toLowerCase() === "f") {
      fretboardWindow.setFollowChord((value) => !value);
      return;
    }

    if (event.key.toLowerCase() === "j") {
      setMainView("jam");
      return;
    }

    if (event.key.toLowerCase() === "w") {
      setMainView("practice");
      return;
    }

    if (event.key.toLowerCase() === "s") {
      setMainView("palettes");
      return;
    }

    if (event.key.toLowerCase() === "b") {
      setMainView("beat");
      return;
    }

    if (event.key === "[") {
      setSidebarCollapsed((value) => !value);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, []);

  const commandActions: CommandAction[] = [
    {
      id: "view-jam",
      label: "Aller à Jam",
      group: "Navigation",
      keywords: "vue impro solo",
      run: () => setMainView("jam"),
    },
    {
      id: "view-practice",
      label: "Aller à Practice",
      group: "Navigation",
      keywords: "workout practice coaching",
      run: () => setMainView("practice"),
    },
    {
      id: "practice-transport",
      label: practiceEngine.isPlaying ? "Stop workout" : "Start workout",
      group: "Practice",
      keywords: "workout start stop midi",
      run: () => {
        if (practiceEngine.isPlaying) {
          practiceEngine.stopPractice();
        } else {
          stopJam();
          void practiceEngine.startPractice();
        }
      },
    },
    {
      id: "view-palettes",
      label: "Aller à Palettes",
      group: "Navigation",
      keywords: "gammes suggestions modes",
      run: () => setMainView("palettes"),
    },
    {
      id: "view-beat",
      label: "Aller à Beat",
      group: "Navigation",
      keywords: "drums groove beatmaking",
      run: () => setMainView("beat"),
    },
    {
      id: "toggle-sidebar",
      label: sidebarCollapsed ? "Ouvrir le setup" : "Réduire le setup",
      group: "Navigation",
      keywords: "sidebar panneau gauche",
      run: () => setSidebarCollapsed((value) => !value),
    },
    {
      id: "toggle-transport",
      label: isPlaying ? "Stop transport" : "Start transport",
      group: "Transport",
      keywords: "play stop jam",
      run: () => {
        if (isPlaying) {
          stopJam();
        } else {
          practiceEngine.stopPractice();
          void startJam();
        }
      },
    },
    {
      id: "step-next",
      label: "Accord suivant",
      group: "Transport",
      keywords: "next chord step",
      run: () => goToNextStep(),
    },
    {
      id: "step-prev",
      label: "Accord précédent",
      group: "Transport",
      keywords: "previous chord step",
      run: () => goToPreviousStep(),
    },
    {
      id: "preset-jam",
      label: "Fretboard preset: Jam",
      group: "Fretboard",
      keywords: "minimal live",
      run: () => fretboardWindow.applyDisplayPreset("jam"),
    },
    {
      id: "preset-learn",
      label: "Fretboard preset: Learn",
      group: "Fretboard",
      keywords: "guide education",
      run: () => fretboardWindow.applyDisplayPreset("learn"),
    },
    {
      id: "preset-advanced",
      label: "Fretboard preset: Advanced",
      group: "Fretboard",
      keywords: "expert all layers",
      run: () => fretboardWindow.applyDisplayPreset("advanced"),
    },
    {
      id: "label-function",
      label: "Repères en fonctions d'accord",
      group: "Fretboard",
      keywords: "label accord function",
      run: () => fretboardWindow.setLabelMode("function"),
    },
    {
      id: "label-degree",
      label: "Repères en degrés",
      group: "Fretboard",
      keywords: "label degree",
      run: () => fretboardWindow.setLabelMode("degree"),
    },
    {
      id: "label-note",
      label: "Repères en notes",
      group: "Fretboard",
      keywords: "label notes",
      run: () => fretboardWindow.setLabelMode("note"),
    },
    {
      id: "toggle-tab-guide",
      label: fretboardWindow.showTabGuide ? "Masquer tab guide" : "Afficher tab guide",
      group: "Fretboard",
      keywords: "tablature",
      run: () => fretboardWindow.setShowTabGuide((value) => !value),
    },
    {
      id: "toggle-phrase-guide",
      label: fretboardWindow.showPhraseGuide ? "Masquer phrase guide" : "Afficher phrase guide",
      group: "Fretboard",
      keywords: "phrase line melody",
      run: () => fretboardWindow.setShowPhraseGuide((value) => !value),
    },
    {
      id: "toggle-follow-chord",
      label: fretboardWindow.followChord ? "Passer en position fixe" : "Suivre l'accord courant",
      group: "Fretboard",
      keywords: "follow lock position",
      run: () => fretboardWindow.setFollowChord((value) => !value),
    },
    {
      id: "tone-acoustic",
      label: "Accompagnement acoustique",
      group: "Son",
      keywords: "guitar acoustic",
      run: () => setAccompanimentTone("acoustic"),
    },
    {
      id: "tone-synth",
      label: "Accompagnement synth pad",
      group: "Son",
      keywords: "synth smooth pad",
      run: () => setAccompanimentTone("synth"),
    },
    ...NOTES.map((note, index) => ({
      id: `root-${note}`,
      label: `Centre tonal: ${note}`,
      group: "Harmonie",
      keywords: "tonalité key root",
      run: () => setHarmonyRoot(index),
    })),
    ...HARMONY_SCALES.map((scale) => ({
      id: `scale-${scale.id}`,
      label: `Harmonie: ${scale.label}`,
      group: "Harmonie",
      keywords: `${scale.detail} mode`,
      run: () => setHarmonyScaleName(scale.id),
    })),
    ...TUNING_PRESETS.map((preset) => ({
      id: `tuning-${preset.id}`,
      label: `Accordage: ${preset.name}`,
      group: "Accordage",
      keywords: preset.strings.join(" "),
      run: () => setSelectedTuningId(preset.id),
    })),
  ];

  return {
    mainView,
    setMainView,
    sidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
    commandActions,
    sidebarProps: {
      tuningPresets: TUNING_PRESETS,
      selectedTuningId,
      harmonyRoot,
      harmonyScaleName,
      minConf,
      collapsed: sidebarCollapsed,
      filterText: sidebarFilter,
      onSelectTuningId: setSelectedTuningId,
      onSelectHarmonyRoot: setHarmonyRoot,
      onSelectHarmonyScaleName: setHarmonyScaleName,
      onSelectMinConfidence: setMinConf,
      onToggleCollapsed: () => setSidebarCollapsed((value) => !value),
      onFilterTextChange: setSidebarFilter,
    },
    scaleSuggestionsProps: {
      harmonyRootName: NOTES[harmonyRoot],
      harmonyScaleName,
      scales,
      selectedScale,
      compatibleModes,
      loading,
      error,
      onSelectScale: setSelectedScale,
      onSelectCompatibleMode: setSoloPalette,
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
    practicePanelProps: {
      harmonyRootName: NOTES[harmonyRoot],
      harmonyScaleName,
      selectedScale,
      selectedTuningName: selectedTuning.name,
      selectedTuningStrings: selectedTuning.strings,
      scalePositions,
      activeSteps,
      ...practicePlanner,
      livePhase: practiceEngine.phase,
      livePlaying: practiceEngine.isPlaying,
      liveCurrentBpm: practiceEngine.currentBpm,
      liveCurrentStepIndex: practiceEngine.currentStepIndex,
      liveCurrentPulse: practiceEngine.currentPulse,
      liveCurrentPulseTotal: practiceEngine.currentPulseTotal,
      liveCurrentTargets: practiceEngine.currentTargets,
      liveCompletedCycles: practiceEngine.completedCycles,
      liveConsecutiveCleanReps: practiceEngine.consecutiveCleanReps,
      liveCountInBeat: practiceEngine.countInBeat,
      liveMidiStatus: midiInput.status,
      liveMidiInputs: midiInput.inputs,
      liveMidiError: midiInput.error ?? practiceEngine.error,
      liveHeardNote: practiceEngine.heardNote,
      liveLastRepScore: practiceEngine.lastRepScore,
      liveRepHistory: practiceEngine.repHistory,
      liveLastSessionSummary: practiceEngine.lastSessionSummary,
      liveSessionHistory: practiceEngine.sessionHistory,
      cueEnabled: practiceCueEnabled,
      onToggleCue: () => setPracticeCueEnabled((value) => !value),
      onReplayCue: practiceEngine.replayCue,
      onStartPractice: () => {
        stopJam();
        void practiceEngine.startPractice();
      },
      onStopPractice: practiceEngine.stopPractice,
      onClearPracticeHistory: practiceEngine.clearSessionHistory,
    },
    progressionJamProps: selectedScale ? {
      harmonyRootName: NOTES[harmonyRoot],
      harmonyScaleName,
      selectedScale,
      namedProgs,
      tab,
      activeSteps,
      progressionStepOptions,
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
      accompanimentTone,
      scalePositions,
      windowStart: fretboardWindow.windowStart,
      windowSize: fretboardWindow.windowSize,
      showAvoid: fretboardWindow.showAvoid,
      flash: fretboardWindow.flash,
      followChord: fretboardWindow.followChord,
      displayPreset: fretboardWindow.displayPreset,
      positionMode: fretboardWindow.positionMode,
      manualWindowStart: fretboardWindow.manualWindowStart,
      maxWindowStart: fretboardWindow.maxWindowStart,
      labelMode: fretboardWindow.labelMode,
      showTabGuide: fretboardWindow.showTabGuide,
      showPhraseGuide: fretboardWindow.showPhraseGuide,
      playPhraseCue,
      selectedTuningName: selectedTuning.name,
      selectedTuningStrings: selectedTuning.strings,
      phraseGuides,
      onTabChange: setTab,
      onSelectNamedProgression: setActiveSteps,
      onToggleStep: (step: string) => setActiveSteps((prev) =>
        prev.includes(step) ? prev.filter((item) => item !== step) : [...prev, step]
      ),
      onClearSteps: () => setActiveSteps([]),
      onSelectStep: (index: number) => {
        stopJam();
        handleActiveStepChange(index);
      },
      onStepDurationChange: (index: number, value: NoteValueId) => setStepDurations((prev) =>
        prev.map((item, itemIndex) => itemIndex === index ? value : item)
      ),
      onStartJam: () => {
        practiceEngine.stopPractice();
        void startJam();
      },
      onStopJam: stopJam,
      onBpmChange: (value: number) => clampBpm(value),
      onTempoUnitChange: setTempoUnit,
      onClickVolumeChange: setClickVolume,
      onGuitarVolumeChange: setGuitarVolume,
      onMasterVolumeChange: setMasterVolume,
      onStrumStyleChange: setStrumStyle,
      onAccompanimentToneChange: setAccompanimentTone,
      onWindowSizeChange: fretboardWindow.setWindowSize,
      onToggleShowAvoid: () => fretboardWindow.setShowAvoid((value) => !value),
      onToggleFollowChord: () => fretboardWindow.setFollowChord((value) => !value),
      onDisplayPresetChange: fretboardWindow.applyDisplayPreset,
      onPositionModeChange: (mode: "auto" | "manual") => {
        if (mode === "manual") {
          fretboardWindow.setManualWindowStart(fretboardWindow.windowStart);
        }
        fretboardWindow.setPositionMode(mode);
      },
      onManualWindowStartChange: fretboardWindow.setManualWindowStart,
      onLabelModeChange: fretboardWindow.setLabelMode,
      onToggleTabGuide: () => fretboardWindow.setShowTabGuide((value) => !value),
      onTogglePhraseGuide: () => fretboardWindow.setShowPhraseGuide((value) => !value),
      onTogglePhraseCue: () => setPlayPhraseCue((value) => !value),
    } : null,
  };
}
