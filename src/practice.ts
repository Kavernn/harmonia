import type { NoteValueId } from "./music";

export type PracticeInputModeId = "microphone" | "midi";

export interface PracticeExercise {
  id: string;
  name: string;
  description: string;
  category: string;
  goal: string;
  target_strategy: string;
  default_progression_steps: string[];
  default_window_size: number;
}

export interface PracticeTarget {
  step_index: number;
  step_name: string;
  chord_name: string;
  pulse_index: number;
  pulse_total: number;
  role: string;
  weight: number;
  pitch_classes: string[];
  description: string;
}

export interface PracticePlan {
  exercise_id: string;
  exercise_name: string;
  exercise_description: string;
  category: string;
  goal: string;
  target_strategy: string;
  harmony_root: string;
  harmony_scale_name: string;
  solo_scale_root: string;
  solo_scale_name: string;
  progression_steps: string[];
  step_durations: NoteValueId[];
  tempo_unit: NoteValueId;
  tuning_notes: number[];
  start_bpm: number;
  target_bpm: number;
  bpm_step: number;
  reps_per_level: number;
  count_in_bars: number;
  input_mode: PracticeInputModeId;
  position_start: number | null;
  window_size: number;
  targets: PracticeTarget[];
}

export interface PracticePlanRequest {
  exercise_id: string;
  harmony_root: number;
  harmony_scale_name: string;
  solo_scale_root: number;
  solo_scale_name: string;
  progression_steps?: string[];
  step_durations?: NoteValueId[];
  tempo_unit?: NoteValueId;
  tuning_notes?: number[];
  start_bpm?: number;
  target_bpm?: number;
  bpm_step?: number;
  reps_per_level?: number;
  count_in_bars?: number;
  input_mode?: PracticeInputModeId;
  position_start?: number | null;
  window_size?: number;
}

export interface PracticeRepEvent {
  step_index: number;
  pulse_index: number;
  midi: number;
  timing_error_ms: number;
}

export interface PracticeRepScore {
  pitch_score: number;
  timing_score: number;
  target_score: number;
  resolution_score: number;
  total_score: number;
  clean_rep: boolean;
  matched_targets: number;
  total_targets: number;
  feedback: string[];
}

export interface PracticeRepHistoryEntry {
  cycle: number;
  bpm: number;
  score: PracticeRepScore;
}

export interface PracticeSessionSummary {
  id: string;
  exercise_id: string;
  exercise_name: string;
  started_at: string;
  ended_at: string;
  rep_count: number;
  clean_rep_count: number;
  average_total_score: number;
  best_total_score: number;
  best_clean_bpm: number | null;
  final_bpm: number;
  target_bpm: number;
  reached_target_bpm: boolean;
}
