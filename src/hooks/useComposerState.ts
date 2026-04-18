import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useAudio } from "./useAudio";
import { useBeatComposer } from "./useBeatComposer";
import { useFretboardWindow } from "./useFretboardWindow";
import { useJamTransport } from "./useJamTransport";
import { useMicPitch } from "./useMicPitch";
import { useMidiInput } from "./useMidiInput";
import { usePersistentState } from "./usePersistentState";
import { usePracticeEngine } from "./usePracticeEngine";
import { usePracticePlanner } from "./usePracticePlanner";
import { useProjectFile } from "./useProjectFile";
import { useScaleAnalysis } from "./useScaleAnalysis";
import { buildPhraseGuides } from "../phraseGuide";
import {
  HARMONY_SCALES,
  NOTES,
  buildTuningPresets,
  resolveOpenStringMidis,
  type AccompanimentToneId,
  type NoteValueId,
  type StrumStyleId,
} from "../music";
import { phraseGuideActiveStepIndex } from "../transportMath";
import type { CommandAction } from "../components/CommandPalette";

const TUNING_PRESETS = buildTuningPresets();

export function useComposerState() {
  const [selectedTuningId, setSelectedTuningId] = usePersistentState("harmonia.tuning-id", "6-E");
  const [mainView, setMainView] = usePersistentState<
    "jam" | "practice" | "palettes" | "beat" | "riff" | "fretboard" | "dashboard"
  >("harmonia.main-view", "dashboard");
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
  const [practiceWithBeat, setPracticeWithBeat] = usePersistentState("harmonia.practice-with-beat", false);
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
    saveProgressionAsPreset,
    deleteSavedProgression,
  } = scaleAnalysis;

  const practicePlanner = usePracticePlanner({
    harmonyRoot,
    harmonyScaleName,
    selectedScale,
    activeSteps,
    currentProgression: progression,
    tuningSemitones: selectedTuningSemitones,
  });
  const projectFile = useProjectFile();
  const midiInput = useMidiInput(mainView === "practice");
  const isMicMode = mainView === "practice" && practicePlanner.plan?.input_mode === "microphone";
  const micPitch = useMicPitch(isMicMode);
  const effectiveLastEvent = isMicMode ? micPitch.lastEvent : midiInput.lastEvent;

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

  const exportRiff = (lines: string[]) => {
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "harmonia-riff.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportRiffMidi = (steps: Array<{ stringIndex: number; fret: number }>, tempo: number) => {
    const bytes: number[] = [];
    const push = (...values: number[]) => { bytes.push(...values); };
    const pushString = (value: string) => { for (const char of value) bytes.push(char.charCodeAt(0)); };
    const writeUint16 = (value: number) => {
      push((value >> 8) & 0xff, value & 0xff);
    };
    const writeUint32 = (value: number) => {
      push((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
    };
    pushString("MThd");
    writeUint32(6);
    writeUint16(0);
    writeUint16(1);
    writeUint16(480);

    const track: number[] = [];
    const tpush = (...values: number[]) => { track.push(...values); };
    const twriteVar = (value: number) => {
      const buffer = [];
      let val = value;
      buffer.push(val & 0x7f);
      while ((val >>= 7)) {
        buffer.push((val & 0x7f) | 0x80);
      }
      for (let i = buffer.length - 1; i >= 0; i -= 1) track.push(buffer[i]);
    };

    twriteVar(0);
    tpush(0xff, 0x51, 0x03);
    const tempoUs = Math.max(1, Math.round(60_000_000 / Math.max(1, tempo)));
    tpush((tempoUs >> 16) & 0xff, (tempoUs >> 8) & 0xff, tempoUs & 0xff);

    let tick = 0;
    const stepTicks = 120;
    const stringMidi = [40, 45, 50, 55, 59, 64, 69];

    steps.forEach((step) => {
      const base = stringMidi[step.stringIndex] ?? 40;
      const midi = base + step.fret;
      twriteVar(tick);
      tpush(0x90, midi & 0x7f, 0x64);
      twriteVar(stepTicks);
      tpush(0x80, midi & 0x7f, 0x40);
      tick = 0;
    });

    twriteVar(0);
    tpush(0xff, 0x2f, 0x00);

    pushString("MTrk");
    writeUint32(track.length);
    push(...track);

    const blob = new Blob([new Uint8Array(bytes)], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "harmonia-riff.mid";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

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
    lastMidiEvent: effectiveLastEvent,
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

    if (event.key.toLowerCase() === "d") {
      setMainView("dashboard");
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

    if (event.key.toLowerCase() === "r") {
      setMainView("riff");
      return;
    }

    if (event.key.toLowerCase() === "m") {
      setMainView("fretboard");
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

  // ── Beat standalone playback ──────────────────────────────────────────────
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatStepRef = useRef(0);

  function startBeatPlayback() {
    const pattern = beatComposer.beatPattern;
    if (!pattern) return;
    if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);

    const stepMs = (60 * 4000) / (bpm * pattern.steps_per_bar);
    beatStepRef.current = 0;
    setIsBeatPlaying(true);
    void audio.unlockAudio();

    const playStep = (step: number) => {
      const events = pattern.events.filter((e) => e.step === step);
      audio.playBeatStep(events, step, stepMs, pattern.swing);
    };

    playStep(0);
    beatIntervalRef.current = setInterval(() => {
      beatStepRef.current = (beatStepRef.current + 1) % pattern.steps_per_bar;
      playStep(beatStepRef.current);
    }, stepMs);
  }

  function stopBeatPlayback() {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
    setIsBeatPlaying(false);
  }

  // ── Riff playback ────────────────────────────────────────────────────────
  const [isRiffPlaying, setIsRiffPlaying] = useState(false);
  const [riffPlayStartTime, setRiffPlayStartTime] = useState<number | null>(null);
  const [riffPlayBpm, setRiffPlayBpm] = useState<number>(120);
  const [riffPlayNotesPerBar, setRiffPlayNotesPerBar] = useState<number>(4);
  const riffIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const riffStepRef = useRef(0);

  function startRiffPlayback(
    steps: Array<{ stringIndex: number; fret: number }>,
    bpm: number,
    notesPerBar: number,
  ) {
    if (!steps.length) return;
    if (riffIntervalRef.current) clearInterval(riffIntervalRef.current);

    const openStringMidis = resolveOpenStringMidis(selectedTuning.strings);
    const stepMs = (60 * 4) / (bpm * notesPerBar) * 1000;
    riffStepRef.current = 0;
    setIsRiffPlaying(true);
    setRiffPlayStartTime(Date.now());
    setRiffPlayBpm(bpm);
    setRiffPlayNotesPerBar(notesPerBar);

    void audio.unlockAudio();

    const playStep = (index: number) => {
      const step = steps[index];
      if (!step) return;
      const baseMidi = openStringMidis[step.stringIndex] ?? 40;
      audio.playGuideTone(baseMidi + step.fret);
    };

    playStep(0);
    riffIntervalRef.current = setInterval(() => {
      riffStepRef.current = (riffStepRef.current + 1) % steps.length;
      playStep(riffStepRef.current);
    }, stepMs);
  }

  function stopRiffPlayback() {
    if (riffIntervalRef.current) {
      clearInterval(riffIntervalRef.current);
      riffIntervalRef.current = null;
    }
    setIsRiffPlaying(false);
    setRiffPlayStartTime(null);
  }

  const commandActions: CommandAction[] = [
    {
      id: "view-dashboard",
      label: "Aller à Dashboard",
      group: "Navigation",
      keywords: "home overview today",
      run: () => setMainView("dashboard"),
    },
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
      id: "view-riff",
      label: "Aller à Riff",
      group: "Navigation",
      keywords: "riff composition song sketch",
      run: () => setMainView("riff"),
    },
    {
      id: "view-fretboard",
      label: "Aller à Fretboard",
      group: "Navigation",
      keywords: "manche positions exercices",
      run: () => setMainView("fretboard"),
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
    isPlaying,
    currentBeat,
    onBpmChange: clampBpm,
    onSaveProject: projectFile.saveProject,
    onLoadProject: projectFile.loadProject,
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
    dashboardProps: {
      // lastSessionSummary is in-memory; fall back to persisted sessionHistory on reload
      lastSession: practiceEngine.lastSessionSummary ?? practiceEngine.sessionHistory[0] ?? null,
      bestCleanBpm: Math.max(0, ...practiceEngine.sessionHistory.map((s) => s.best_clean_bpm ?? 0)) || null,
      streakClean: practiceEngine.consecutiveCleanReps,
      sessionHistory: practiceEngine.sessionHistory,
      selectedScaleLabel: selectedScale ? `${selectedScale.scale_root} ${selectedScale.scale_name}` : null,
      onOpenPractice: () => setMainView("practice"),
      onOpenFretboard: () => setMainView("fretboard"),
      onOpenRiff: () => setMainView("riff"),
    },
    fretboardMasteryProps: {
      harmonyRootName: NOTES[harmonyRoot],
      harmonyScaleName,
      selectedScale,
      selectedTuningName: selectedTuning.name,
      selectedTuningStrings: selectedTuning.strings,
      scalePositions,
    },
    riffLabProps: {
      harmonyRootName: NOTES[harmonyRoot],
      harmonyScaleName,
      selectedScale,
      tuningStrings: selectedTuning.strings,
      scalePositions,
      isRiffPlaying,
      riffPlayStartTime,
      riffPlayBpm,
      riffPlayNotesPerBar,
      onExportRiff: exportRiff,
      onExportRiffMidi: exportRiffMidi,
      onPlayRiff: startRiffPlayback,
      onStopRiff: stopRiffPlayback,
    },
    beatMakerProps: beatComposer.beatPattern ? {
      beatLibrary: beatComposer.beatLibrary,
      beatPattern: beatComposer.beatPattern,
      beatError: beatComposer.beatError,
      selectedBeatStyle: beatComposer.selectedBeatStyle,
      beatIntensity: beatComposer.beatIntensity,
      beatSwing: beatComposer.beatSwing,
      beatPatternDirty: beatComposer.beatPatternDirty,
      isBeatPlaying,
      onSelectBeatStyle: beatComposer.setSelectedBeatStyle,
      onBeatIntensityChange: beatComposer.setBeatIntensity,
      onBeatSwingChange: beatComposer.setBeatSwing,
      onResetBeatPattern: beatComposer.resetBeatPattern,
      onCycleBeatStep: beatComposer.cycleBeatStep,
      onPreviewVoice: (voice: string) => {
        void audio.unlockAudio();
        audio.playBeatStep([{ voice, step: 0, velocity: beatComposer.beatIntensity }], 0, 100, 0);
      },
      onStartBeat: startBeatPlayback,
      onStopBeat: stopBeatPlayback,
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
      liveMidiError: micPitch.error ?? midiInput.error ?? practiceEngine.error,
      liveHeardNote: practiceEngine.heardNote,
      liveLastRepScore: practiceEngine.lastRepScore,
      liveRepHistory: practiceEngine.repHistory,
      liveLastSessionSummary: practiceEngine.lastSessionSummary,
      liveSessionHistory: practiceEngine.sessionHistory,
      cueEnabled: practiceCueEnabled,
      onToggleCue: () => setPracticeCueEnabled((value) => !value),
      onReplayCue: practiceEngine.replayCue,
      onNudgeBpm: practiceEngine.nudgeBpm,
      onSetSoloPalette: setSoloPalette,
      practiceWithBeat,
      onTogglePracticeWithBeat: () => setPracticeWithBeat((v) => !v),
      onStartPractice: () => {
        stopJam();
        if (practiceWithBeat) startBeatPlayback();
        void practiceEngine.startPractice();
      },
      onStopPractice: () => {
        stopBeatPlayback();
        practiceEngine.stopPractice();
      },
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
      onSaveProgression: saveProgressionAsPreset,
      onDeleteSavedProgression: deleteSavedProgression,
      userSavedProgressionNames: scaleAnalysis.userSavedProgressionNames ?? [],
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
