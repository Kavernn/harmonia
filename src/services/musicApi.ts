import { invoke } from "@tauri-apps/api/core";
import type { BeatPattern, FretPosition, NamedProgression, ProgressionChord, ScaleSuggestion } from "../music";

export async function getCommonProgressions() {
  return invoke<NamedProgression[]>("common_progressions_command");
}

export async function getCommonBeatPatterns() {
  return invoke<BeatPattern[]>("common_beat_patterns_command");
}

export async function getBeatPattern(style: string, intensity: number, swing: number) {
  return invoke<BeatPattern>("beat_pattern_command", {
    request: { style, intensity, swing },
  });
}

export async function analyzeChordRequest(root: number, quality: string, minConfidence: string) {
  return invoke<ScaleSuggestion[]>("analyze_chord_command", {
    request: {
      root,
      quality,
      min_confidence: minConfidence,
    },
  });
}

export async function buildProgressionRequest(scaleRoot: number, scaleName: string, degrees: number[]) {
  return invoke<ProgressionChord[]>("build_progression_command", {
    request: {
      scale_root: scaleRoot,
      scale_name: scaleName,
      degrees,
    },
  });
}

export async function getScaleFretboard(
  scaleRoot: number,
  scaleName: string,
  maxFret: number,
  tuningNotes: number[],
) {
  return invoke<FretPosition[]>("scale_fretboard_command", {
    request: {
      scale_root: scaleRoot,
      scale_name: scaleName,
      max_fret: maxFret,
      tuning_notes: tuningNotes,
    },
  });
}
