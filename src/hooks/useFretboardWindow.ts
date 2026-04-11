import { useEffect, useRef, useState } from "react";
import type { FretPosition, ProgressionChord } from "../music";

function computeBestJamWindow(
  scalePositions: FretPosition[],
  progression: ProgressionChord[],
  windowSize: number,
) {
  const maxStart = Math.max(0, 24 - windowSize);
  let bestStart = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let start = 0; start <= maxStart; start += 1) {
    const end = start + windowSize;
    let score = 0;

    progression.forEach((step) => {
      const root = step.chord_tones[0];
      const inWindow = scalePositions.filter((position) => position.fret >= start && position.fret <= end && !position.is_avoid);
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

export function useFretboardWindow({
  scalePositions,
  progression,
  activeStep,
}: UseFretboardWindowArgs) {
  const [windowSize, setWindowSize] = useState(5);
  const [showAvoid, setShowAvoid] = useState(true);
  const [flash, setFlash] = useState(false);
  const [followChord, setFollowChord] = useState(false);

  const flashTimeoutRef = useRef<number | null>(null);
  const hasSeenStepRef = useRef(false);

  const windowStart = (() => {
    if (scalePositions.length === 0 || progression.length === 0) return 0;

    if (!followChord) {
      return computeBestJamWindow(scalePositions, progression, windowSize);
    }

    const activeChordTones = progression[activeStep]?.chord_tones ?? [];
    const chordFrets = scalePositions
      .filter((position) => activeChordTones.includes(position.note) && !position.is_avoid && position.fret > 0)
      .map((position) => position.fret);
    const minFret = chordFrets.length > 0 ? Math.min(...chordFrets) : 0;
    return Math.max(0, minFret - 1);
  })();

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
    setWindowSize,
    setShowAvoid,
    setFollowChord,
    triggerStepFlash,
  };
}
