import { useEffect, useRef, useState } from "react";
import type { FretPosition, ProgressionChord } from "../music";
import type { FretboardLabelMode } from "../fretboardGuidance";
import { usePersistentState } from "./usePersistentState";

const MAX_FRET = 24;

function fretVisibleInWindow(fret: number, windowStart: number, windowSize: number) {
  if (windowStart === 0) {
    return fret >= 0 && fret <= windowSize;
  }

  return fret > windowStart && fret <= windowStart + windowSize;
}

function computeBestJamWindow(
  scalePositions: FretPosition[],
  progression: ProgressionChord[],
  windowSize: number,
) {
  const maxStart = Math.max(0, MAX_FRET - windowSize);
  let bestStart = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let start = 0; start <= maxStart; start += 1) {
    let score = 0;

    progression.forEach((step) => {
      const root = step.chord_tones[0];
      const inWindow = scalePositions.filter((position) =>
        fretVisibleInWindow(position.fret, start, windowSize) && !position.is_avoid
      );
      const rootCount = inWindow.filter((position) => position.note === root).length;
      const chordCount = inWindow.filter((position) => step.chord_tones.includes(position.note)).length;
      score += rootCount * 6 + chordCount * 2 + inWindow.length * 0.1;
    });

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  return bestStart;
}

interface UseFretboardWindowArgs {
  scalePositions: FretPosition[];
  progression: ProgressionChord[];
  activeStep: number;
}

type FretboardPositionMode = "auto" | "manual";
type FretboardDisplayPreset = "focus" | "jam" | "learn" | "advanced";

export function useFretboardWindow({
  scalePositions,
  progression,
  activeStep,
}: UseFretboardWindowArgs) {
  const [windowSize, setWindowSize] = usePersistentState("harmonia.window-size", 5);
  const [showAvoid, setShowAvoid] = usePersistentState("harmonia.show-avoid", false);
  const [flash, setFlash] = useState(false);
  const [followChord, setFollowChord] = usePersistentState("harmonia.follow-chord", false);
  const [labelMode, setLabelMode] = usePersistentState<FretboardLabelMode>("harmonia.label-mode", "function");
  const [showTabGuide, setShowTabGuide] = usePersistentState("harmonia.show-tab-guide", false);
  const [showPhraseGuide, setShowPhraseGuide] = usePersistentState("harmonia.show-phrase-guide", false);
  const [positionMode, setPositionMode] = usePersistentState<FretboardPositionMode>("harmonia.position-mode", "auto");
  const [manualWindowStart, setManualWindowStartState] = usePersistentState("harmonia.manual-window-start", 4);
  const [displayPreset, setDisplayPreset] = usePersistentState<FretboardDisplayPreset>("harmonia.display-preset", "jam");

  const flashTimeoutRef = useRef<number | null>(null);
  const hasSeenStepRef = useRef(false);
  const maxWindowStart = Math.max(0, MAX_FRET - windowSize);

  const autoWindowStart = (() => {
    if (scalePositions.length === 0 || progression.length === 0) return 0;

    if (!followChord) {
      return computeBestJamWindow(scalePositions, progression, windowSize);
    }

    const activeChordTones = progression[activeStep]?.chord_tones ?? [];
    const chordFrets = scalePositions
      .filter((position) => activeChordTones.includes(position.note) && !position.is_avoid && position.fret > 0)
      .map((position) => position.fret);
    const minFret = chordFrets.length > 0 ? Math.min(...chordFrets) : 0;
    return Math.min(maxWindowStart, Math.max(0, minFret - 1));
  })();

  const clampedManualWindowStart = Math.min(maxWindowStart, manualWindowStart);

  const windowStart = followChord || positionMode === "auto"
    ? autoWindowStart
    : clampedManualWindowStart;

  function setManualWindowStart(nextStart: number) {
    setManualWindowStartState(Math.min(maxWindowStart, Math.max(0, nextStart)));
  }

  function applyDisplayPreset(nextPreset: FretboardDisplayPreset) {
    setDisplayPreset(nextPreset);
    if (nextPreset === "focus") {
      setLabelMode("function");
      setShowAvoid(false);
      setShowTabGuide(false);
      setShowPhraseGuide(false);
      return;
    }

    if (nextPreset === "jam") {
      setLabelMode("function");
      setShowAvoid(false);
      setShowTabGuide(false);
      setShowPhraseGuide(false);
      return;
    }

    if (nextPreset === "learn") {
      setLabelMode("function");
      setShowAvoid(true);
      setShowTabGuide(true);
      setShowPhraseGuide(true);
      return;
    }

    setLabelMode("degree");
    setShowAvoid(true);
    setShowTabGuide(true);
    setShowPhraseGuide(true);
  }

  useEffect(() => {
    if (displayPreset !== "focus") return;

    if (labelMode !== "function") {
      setLabelMode("function");
    }
    if (showAvoid) {
      setShowAvoid(false);
    }
    if (showTabGuide) {
      setShowTabGuide(false);
    }
    if (showPhraseGuide) {
      setShowPhraseGuide(false);
    }
  }, [displayPreset, labelMode, setLabelMode, setShowAvoid, setShowPhraseGuide, setShowTabGuide, showAvoid, showPhraseGuide, showTabGuide]);

  function triggerStepFlash(nextStep: number, currentStep: number) {
    if (!hasSeenStepRef.current) {
      hasSeenStepRef.current = true;
      return;
    }

    if (nextStep === currentStep) return;
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    setFlash(true);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlash(false);
      flashTimeoutRef.current = null;
    }, 180);
  }

  useEffect(() => () => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
  }, []);

  return {
    windowStart,
    windowSize,
    showAvoid,
    flash,
    followChord,
    displayPreset,
    positionMode,
    manualWindowStart: clampedManualWindowStart,
    maxWindowStart,
    labelMode,
    showTabGuide,
    showPhraseGuide,
    setWindowSize,
    setShowAvoid,
    setFollowChord,
    applyDisplayPreset,
    setPositionMode,
    setManualWindowStart,
    setLabelMode,
    setShowTabGuide,
    setShowPhraseGuide,
    triggerStepFlash,
  };
}
