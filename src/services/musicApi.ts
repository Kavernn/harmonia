import { invoke } from "@tauri-apps/api/core";
import type {
  BeatPattern,
  CompatibleMode,
  FretPosition,
  NamedProgression,
  ProgressionChord,
  ProgressionStepOption,
  ScaleSuggestion,
} from "../music";
import type {
  PracticeExercise,
  PracticePlan,
  PracticePlanRequest,
  PracticeRepEvent,
  PracticeRepScore,
  PracticeTarget,
} from "../practice";

export async function getCommonProgressions() {
  return invoke<NamedProgression[]>("common_progressions_command");
}

export async function getSuggestedProgressions(scaleRoot: number, scaleName: string) {
  return invoke<NamedProgression[]>("suggested_progressions_command", {
    request: {
      scale_root: scaleRoot,
      scale_name: scaleName,
    },
  });
}

export async function getProgressionStepOptions(scaleRoot: number, scaleName: string) {
  return invoke<ProgressionStepOption[]>("progression_step_options_command", {
    request: {
      scale_root: scaleRoot,
      scale_name: scaleName,
    },
  });
}

export async function getCompatibleModes(scaleRoot: number, scaleName: string) {
  return invoke<CompatibleMode[]>("compatible_modes_command", {
    request: {
      scale_root: scaleRoot,
      scale_name: scaleName,
    },
  });
}

export async function getCommonBeatPatterns() {
  return invoke<BeatPattern[]>("common_beat_patterns_command");
}

export async function getBeatPattern(style: string, intensity: number, swing: number) {
  return invoke<BeatPattern>("beat_pattern_command", {
    request: { style, intensity, swing },
  });
}

export async function getPracticeLibrary() {
  return invoke<PracticeExercise[]>("practice_library_command");
}

export async function getPracticePlan(request: PracticePlanRequest) {
  return invoke<PracticePlan>("practice_plan_command", {
    request: {
      ...request,
      step_durations: request.step_durations,
      tempo_unit: request.tempo_unit,
      input_mode: request.input_mode,
      position_start: request.position_start ?? undefined,
      window_size: request.window_size,
    },
  });
}

export async function getPracticeTargets(request: PracticePlanRequest) {
  return invoke<PracticeTarget[]>("practice_targets_command", {
    request: {
      ...request,
      step_durations: request.step_durations,
      tempo_unit: request.tempo_unit,
      input_mode: request.input_mode,
      position_start: request.position_start ?? undefined,
      window_size: request.window_size,
    },
  });
}

export async function scorePracticeRep(targets: PracticeTarget[], events: PracticeRepEvent[]) {
  return invoke<PracticeRepScore>("score_practice_rep_command", {
    request: {
      targets,
      events,
    },
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

export async function analyzeProgressionRequest(
  scaleRoot: number,
  scaleName: string,
  steps: string[],
  minConfidence: string,
) {
  return invoke<ScaleSuggestion[]>("analyze_progression_command", {
    request: {
      scale_root: scaleRoot,
      scale_name: scaleName,
      steps,
      min_confidence: minConfidence,
    },
  });
}

export async function buildProgressionRequest(scaleRoot: number, scaleName: string, steps: string[]) {
  return invoke<ProgressionChord[]>("build_progression_command", {
    request: {
      scale_root: scaleRoot,
      scale_name: scaleName,
      steps,
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
