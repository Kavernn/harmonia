import test from "node:test";
import assert from "node:assert/strict";
import { summarizePracticeSession } from "./practiceSession";
import type { PracticePlan } from "./practice";

const plan: PracticePlan = {
  exercise_id: "guide-tones-strong-beats",
  exercise_name: "Guide tones",
  exercise_description: "Hit guide tones on strong beats.",
  category: "Guide Tones",
  goal: "Hit chord tones on strong beats",
  target_strategy: "Strong beat chord tones",
  harmony_root: "A",
  harmony_scale_name: "Ionian",
  solo_scale_root: "B",
  solo_scale_name: "Dorian",
  progression_steps: ["ii", "V"],
  step_durations: ["half", "half"],
  tempo_unit: "quarter",
  tuning_notes: [4, 9, 2, 7, 11, 4],
  start_bpm: 70,
  target_bpm: 100,
  bpm_step: 5,
  reps_per_level: 2,
  count_in_bars: 1,
  input_mode: "midi",
  position_start: 5,
  window_size: 5,
  targets: [],
};

test("session summaries capture clean reps and best clean bpm", () => {
  const summary = summarizePracticeSession({
    plan,
    startedAt: "2026-04-13T10:00:00.000Z",
    endedAt: "2026-04-13T10:02:00.000Z",
    finalBpm: 95,
    repHistory: [
      {
        cycle: 1,
        bpm: 70,
        score: {
          pitch_score: 100,
          timing_score: 88,
          target_score: 100,
          resolution_score: 100,
          total_score: 96,
          clean_rep: true,
          matched_targets: 4,
          total_targets: 4,
          feedback: [],
        },
      },
      {
        cycle: 2,
        bpm: 75,
        score: {
          pitch_score: 100,
          timing_score: 62,
          target_score: 100,
          resolution_score: 100,
          total_score: 85,
          clean_rep: false,
          matched_targets: 4,
          total_targets: 4,
          feedback: [],
        },
      },
      {
        cycle: 3,
        bpm: 95,
        score: {
          pitch_score: 100,
          timing_score: 80,
          target_score: 100,
          resolution_score: 100,
          total_score: 94,
          clean_rep: true,
          matched_targets: 4,
          total_targets: 4,
          feedback: [],
        },
      },
    ],
  });

  assert.ok(summary);
  assert.equal(summary.clean_rep_count, 2);
  assert.equal(summary.best_clean_bpm, 95);
  assert.equal(summary.average_total_score, 92);
  assert.equal(summary.best_total_score, 96);
  assert.equal(summary.reached_target_bpm, false);
});

test("session summaries return null without scored reps", () => {
  const summary = summarizePracticeSession({
    plan,
    startedAt: "2026-04-13T10:00:00.000Z",
    repHistory: [],
    finalBpm: 70,
  });

  assert.equal(summary, null);
});
