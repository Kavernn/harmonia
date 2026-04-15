import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  analyzeProgressionRequest,
  buildProgressionRequest,
  getCompatibleModes,
  getProgressionStepOptions,
  getScaleFretboard,
  getSuggestedProgressions,
} from "../services/musicApi";
import {
  type CompatibleMode,
  NOTES,
  canonicalScaleName,
  defaultProgressionStepsForHarmony,
  fallbackProgressionStepOptionsForHarmony,
  type FretPosition,
  type NamedProgression,
  type ProgressionChord,
  type ProgressionStepOption,
  type ScaleSuggestion,
} from "../music";
import { usePersistentState } from "./usePersistentState";

interface UseScaleAnalysisArgs {
  tuningKey: string;
  tuningSemitones: number[];
  stopJam: () => void;
  onResetActiveStep: () => void;
  onProgressionUpdated: (progression: ProgressionChord[]) => void;
}

function sameScale(scale: ScaleSuggestion | null, rootIndex: number, scaleName: string) {
  if (!scale) return false;
  return scale.scale_root === NOTES[rootIndex]
    && canonicalScaleName(scale.scale_name) === canonicalScaleName(scaleName);
}

export function useScaleAnalysis({
  tuningKey,
  tuningSemitones,
  stopJam,
  onResetActiveStep,
  onProgressionUpdated,
}: UseScaleAnalysisArgs) {
  const [harmonyRoot, setHarmonyRoot] = usePersistentState("harmonia.harmony-root", 0);
  const [harmonyScaleName, setHarmonyScaleName] = usePersistentState("harmonia.harmony-scale", "Ionian");
  const [minConf, setMinConf] = usePersistentState("harmonia.min-confidence", "high");
  const [userSavedProgressions, setUserSavedProgressions] = usePersistentState<Array<{ name: string; steps: string[]; feel: string }>>(
    "harmonia.user-progressions",
    []
  );

  const [soloScaleRoot, setSoloScaleRoot] = usePersistentState("harmonia.solo-scale-root", 0);
  const [soloScaleName, setSoloScaleName] = usePersistentState("harmonia.solo-scale-name", "Ionian");

  const [scales, setScales] = useState<ScaleSuggestion[]>([]);
  const [namedProgs, setNamedProgs] = useState<NamedProgression[]>([]);
  const [compatibleModes, setCompatibleModes] = useState<CompatibleMode[]>([]);
  const [activeSteps, setActiveSteps] = useState<string[]>(defaultProgressionStepsForHarmony("Ionian"));
  const [progressionStepOptions, setProgressionStepOptions] = useState<ProgressionStepOption[]>(
    fallbackProgressionStepOptionsForHarmony("Ionian"),
  );
  const [progression, setProgression] = useState<ProgressionChord[]>([]);
  const [scalePositions, setScalePositions] = useState<FretPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackScaleNotes = Array.from(new Set(
    scalePositions
      .filter((position) => !position.is_avoid)
      .map((position) => position.note),
  )).sort((a, b) => NOTES.indexOf(a) - NOTES.indexOf(b));
  const matchingCompatibleMode = compatibleModes.find((mode) =>
    mode.scale_root === (NOTES[soloScaleRoot] ?? "C")
    && canonicalScaleName(mode.scale_name) === canonicalScaleName(soloScaleName)
  );

  const selectedScale = scales.find((scale) => sameScale(scale, soloScaleRoot, soloScaleName)) ?? {
    scale_name: soloScaleName,
    scale_root: NOTES[soloScaleRoot] ?? "C",
    confidence: "high" as const,
    matching_notes: [],
    outside_notes: [],
    reason: matchingCompatibleMode
      ? `Mode compatible avec ${NOTES[harmonyRoot] ?? "C"} ${harmonyScaleName}`
      : "Current solo palette",
    notes: matchingCompatibleMode?.notes ?? fallbackScaleNotes,
    characteristic_notes: matchingCompatibleMode?.characteristic_notes ?? [],
    modal_avoid_notes: matchingCompatibleMode?.modal_avoid_notes ?? [],
    resolution_notes: matchingCompatibleMode?.resolution_notes ?? [NOTES[soloScaleRoot] ?? "C"],
    guidance: matchingCompatibleMode?.guidance ?? "Fais entendre la tonique et les notes d'accord avant les couleurs.",
    mode: null,
    matching_chords: progression.length > 0 ? progression.length : undefined,
    total_chords: progression.length > 0 ? progression.length : undefined,
  };

  const namedProgsRequestIdRef = useRef(0);
  useEffect(() => {
    const requestId = ++namedProgsRequestIdRef.current;
    getSuggestedProgressions(harmonyRoot, harmonyScaleName)
      .then((result) => {
        if (requestId === namedProgsRequestIdRef.current) {
          setNamedProgs(result);
        }
      })
      .catch((cause) => {
        console.error(cause);
        if (requestId === namedProgsRequestIdRef.current) {
          setNamedProgs([]);
        }
      });
  }, [harmonyRoot, harmonyScaleName]);

  const stepOptionsRequestIdRef = useRef(0);
  useEffect(() => {
    const requestId = ++stepOptionsRequestIdRef.current;
    getProgressionStepOptions(harmonyRoot, harmonyScaleName)
      .then((result) => {
        if (requestId === stepOptionsRequestIdRef.current) {
          setProgressionStepOptions(result);
        }
      })
      .catch(console.error);
  }, [harmonyRoot, harmonyScaleName]);

  useEffect(() => {
    getCompatibleModes(harmonyRoot, harmonyScaleName)
      .then(setCompatibleModes)
      .catch((cause) => {
        console.error(cause);
        setCompatibleModes([]);
      });
  }, [harmonyRoot, harmonyScaleName]);

  useEffect(() => {
    setSoloScaleRoot(harmonyRoot);
    setSoloScaleName(harmonyScaleName);
  }, [harmonyRoot, harmonyScaleName, setSoloScaleName, setSoloScaleRoot]);

  useEffect(() => {
    setActiveSteps(defaultProgressionStepsForHarmony(harmonyScaleName));
  }, [harmonyScaleName]);

  const refreshHarmonyContext = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    stopJam();

    try {
      const [nextProgression, nextSuggestions] = await Promise.all([
        buildProgressionRequest(harmonyRoot, harmonyScaleName, activeSteps),
        analyzeProgressionRequest(harmonyRoot, harmonyScaleName, activeSteps, minConf),
      ]);

      setProgression(nextProgression);
      onProgressionUpdated(nextProgression);
      setScales(nextSuggestions);
      onResetActiveStep();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  });

  const loadScaleFretboard = useEffectEvent(async () => {
    try {
      const positions = await getScaleFretboard(
        soloScaleRoot,
        soloScaleName,
        24,
        tuningSemitones,
      );
      setScalePositions(positions);
    } catch (cause) {
      console.error(cause);
    }
  });

  useEffect(() => {
    void refreshHarmonyContext();
  }, [harmonyRoot, harmonyScaleName, activeSteps, minConf]);

  useEffect(() => {
    const paletteStillAvailable =
      scales.some((scale) => sameScale(scale, soloScaleRoot, soloScaleName))
      || compatibleModes.some((mode) =>
        mode.scale_root === (NOTES[soloScaleRoot] ?? "C")
        && canonicalScaleName(mode.scale_name) === canonicalScaleName(soloScaleName)
      );
    if (paletteStillAvailable) return;

    const harmonyPalette = scales.find((scale) => sameScale(scale, harmonyRoot, harmonyScaleName)) ?? scales[0] ?? null;
    if (!harmonyPalette) return;

    setSoloScaleRoot(NOTES.indexOf(harmonyPalette.scale_root));
    setSoloScaleName(canonicalScaleName(harmonyPalette.scale_name));
  }, [scales, compatibleModes, soloScaleRoot, soloScaleName, harmonyRoot, harmonyScaleName, setSoloScaleName, setSoloScaleRoot]);

  useEffect(() => {
    void loadScaleFretboard();
  }, [soloScaleRoot, soloScaleName, tuningKey]);

  function saveProgressionAsPreset(name: string) {
    if (!activeSteps.length) return;
    const prog = { name, steps: activeSteps, feel: "custom" };
    setUserSavedProgressions((prev) => {
      const filtered = prev.filter((p) => p.name !== name);
      return [...filtered, prog];
    });
  }

  function deleteSavedProgression(name: string) {
    setUserSavedProgressions((prev) => prev.filter((p) => p.name !== name));
  }

  const allNamedProgs = [...namedProgs, ...userSavedProgressions];

  return {
    harmonyRoot,
    harmonyScaleName,
    minConf,
    scales,
    selectedScale,
    namedProgs: allNamedProgs,
    userSavedProgressionNames: userSavedProgressions.map((p) => p.name),
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
    saveProgressionAsPreset,
    deleteSavedProgression,
    setSelectedScale: (scale: ScaleSuggestion) => {
      const rootIndex = NOTES.indexOf(scale.scale_root);
      if (rootIndex !== -1) {
        setSoloScaleRoot(rootIndex);
      }
      setSoloScaleName(canonicalScaleName(scale.scale_name));
    },
    setSoloPalette: (scaleRoot: string, scaleName: string) => {
      const rootIndex = NOTES.indexOf(scaleRoot);
      if (rootIndex !== -1) {
        setSoloScaleRoot(rootIndex);
      }
      setSoloScaleName(canonicalScaleName(scaleName));
    },
    setActiveSteps,
  };
}
