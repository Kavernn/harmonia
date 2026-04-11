import { useEffect, useEffectEvent, useState } from "react";
import {
  analyzeChordRequest,
  buildProgressionRequest,
  getCommonProgressions,
  getScaleFretboard,
} from "../services/musicApi";
import { NOTES, type FretPosition, type NamedProgression, type ProgressionChord, type ScaleSuggestion } from "../music";

interface UseScaleAnalysisArgs {
  tuningKey: string;
  tuningSemitones: number[];
  stopJam: () => void;
  onResetActiveStep: () => void;
  onProgressionUpdated: (progression: ProgressionChord[]) => void;
}

export function useScaleAnalysis({
  tuningKey,
  tuningSemitones,
  stopJam,
  onResetActiveStep,
  onProgressionUpdated,
}: UseScaleAnalysisArgs) {
  const [root, setRoot] = useState(0);
  const [quality, setQuality] = useState("major");
  const [minConf, setMinConf] = useState("high");

  const [scales, setScales] = useState<ScaleSuggestion[]>([]);
  const [selectedScale, setSelectedScale] = useState<ScaleSuggestion | null>(null);
  const [namedProgs, setNamedProgs] = useState<NamedProgression[]>([]);
  const [activeDegrees, setActiveDegrees] = useState<number[]>([0, 3, 4, 0]);
  const [progression, setProgression] = useState<ProgressionChord[]>([]);
  const [scalePositions, setScalePositions] = useState<FretPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCommonProgressions().then(setNamedProgs);
  }, []);

  const analyzeChord = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    stopJam();
    setProgression([]);
    setScalePositions([]);
    onProgressionUpdated([]);

    try {
      const results = await analyzeChordRequest(root, quality, minConf);
      setScales(results);
      setSelectedScale(results[0] ?? null);
      onResetActiveStep();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  });

  const buildProgression = useEffectEvent(async () => {
    if (!selectedScale) return;
    stopJam();

    try {
      const nextProgression = await buildProgressionRequest(
        NOTES.indexOf(selectedScale.scale_root),
        selectedScale.scale_name,
        activeDegrees,
      );
      setProgression(nextProgression);
      onProgressionUpdated(nextProgression);
      onResetActiveStep();
    } catch (cause) {
      console.error(cause);
    }
  });

  const loadScaleFretboard = useEffectEvent(async () => {
    if (!selectedScale) return;

    try {
      const positions = await getScaleFretboard(
        NOTES.indexOf(selectedScale.scale_root),
        selectedScale.scale_name,
        24,
        tuningSemitones,
      );
      setScalePositions(positions);
    } catch (cause) {
      console.error(cause);
    }
  });

  useEffect(() => {
    void analyzeChord();
  }, [root, quality, minConf]);

  useEffect(() => {
    if (selectedScale) {
      void buildProgression();
    }
  }, [selectedScale, activeDegrees]);

  useEffect(() => {
    if (selectedScale) {
      void loadScaleFretboard();
    }
  }, [selectedScale, tuningKey]);

  return {
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
  };
}
