import { useEffect, useState } from "react";
import { getBeatPattern, getCommonBeatPatterns } from "../services/musicApi";
import { DEFAULT_BEAT_VELOCITY, type BeatPattern } from "../music";

function cloneBeatPattern(pattern: BeatPattern): BeatPattern {
  return {
    ...pattern,
    events: [...pattern.events].sort((left, right) => {
      if (left.step !== right.step) return left.step - right.step;
      return left.voice.localeCompare(right.voice);
    }),
  };
}

function nextBeatVelocity(currentVelocity?: number) {
  if (currentVelocity == null) return undefined;
  if (currentVelocity < 72) return null;
  if (currentVelocity < 108) return 122;
  return 58;
}

export function useBeatComposer() {
  const [beatLibrary, setBeatLibrary] = useState<BeatPattern[]>([]);
  const [selectedBeatStyle, setSelectedBeatStyle] = useState("rock");
  const [beatIntensity, setBeatIntensity] = useState(100);
  const [beatSwing, setBeatSwing] = useState(0);
  const [generatedBeatPattern, setGeneratedBeatPattern] = useState<BeatPattern | null>(null);
  const [beatPattern, setBeatPattern] = useState<BeatPattern | null>(null);
  const [beatPatternDirty, setBeatPatternDirty] = useState(false);

  useEffect(() => {
    getCommonBeatPatterns().then((patterns) => {
      setBeatLibrary(patterns);
      setGeneratedBeatPattern(patterns[0] ? cloneBeatPattern(patterns[0]) : null);
      setBeatPattern(patterns[0] ? cloneBeatPattern(patterns[0]) : null);
      setSelectedBeatStyle(patterns[0]?.style_id ?? "rock");
      setBeatPatternDirty(false);
    });
  }, []);

  useEffect(() => {
    getBeatPattern(selectedBeatStyle, beatIntensity, beatSwing)
      .then((pattern) => {
        const nextPattern = cloneBeatPattern(pattern);
        setGeneratedBeatPattern(nextPattern);
        setBeatPattern(nextPattern);
        setBeatPatternDirty(false);
      })
      .catch(console.error);
  }, [selectedBeatStyle, beatIntensity, beatSwing]);

  function cycleBeatStep(voice: string, step: number) {
    setBeatPatternDirty(true);
    setBeatPattern((prev) => {
      if (!prev) return prev;

      const nextEvents = [...prev.events];
      const index = nextEvents.findIndex((item) => item.voice === voice && item.step === step);

      if (index === -1) {
        nextEvents.push({
          voice,
          step,
          velocity: DEFAULT_BEAT_VELOCITY[voice] ?? 92,
        });
      } else {
        const current = nextEvents[index];
        const nextVelocity = nextBeatVelocity(current.velocity);
        if (nextVelocity == null) {
          nextEvents.splice(index, 1);
        } else {
          nextEvents[index] = { ...current, velocity: nextVelocity };
        }
      }

      return cloneBeatPattern({ ...prev, events: nextEvents });
    });
  }

  function resetBeatPattern() {
    if (!generatedBeatPattern) return;
    setBeatPattern(cloneBeatPattern(generatedBeatPattern));
    setBeatPatternDirty(false);
  }

  return {
    beatLibrary,
    beatPattern,
    selectedBeatStyle,
    beatIntensity,
    beatSwing,
    beatPatternDirty,
    setSelectedBeatStyle,
    setBeatIntensity,
    setBeatSwing,
    cycleBeatStep,
    resetBeatPattern,
  };
}
