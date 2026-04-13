import assert from "node:assert/strict";
import test from "node:test";
import type { PracticeTarget } from "./practice";
import {
  noteLabelFromMidi,
  pitchClassNameFromMidi,
  practiceCountInBeatLabel,
  practiceCountInPulses,
  practiceTargetHit,
  practiceTargetsForMoment,
} from "./practiceMath";

const SAMPLE_TARGETS: PracticeTarget[] = [
  {
    step_index: 0,
    step_name: "ii",
    chord_name: "Dm",
    pulse_index: 0,
    pulse_total: 4,
    role: "strong_beat",
    weight: 100,
    pitch_classes: ["D", "F", "A"],
    description: "Aim the chord tones",
  },
  {
    step_index: 0,
    step_name: "ii",
    chord_name: "Dm",
    pulse_index: 2,
    pulse_total: 4,
    role: "resolution",
    weight: 80,
    pitch_classes: ["A"],
    description: "Land on A",
  },
];

test("pitch class labels derived from midi stay stable", () => {
  assert.equal(pitchClassNameFromMidi(60), "C");
  assert.equal(pitchClassNameFromMidi(71), "B");
  assert.equal(noteLabelFromMidi(64), "E4");
});

test("practice targets filter by step and pulse", () => {
  assert.equal(practiceTargetsForMoment(SAMPLE_TARGETS, 0, 0).length, 1);
  assert.equal(practiceTargetsForMoment(SAMPLE_TARGETS, 0, 2).length, 1);
  assert.equal(practiceTargetsForMoment(SAMPLE_TARGETS, 1, 0).length, 0);
});

test("midi notes can be matched against target pitch classes", () => {
  assert.equal(practiceTargetHit(practiceTargetsForMoment(SAMPLE_TARGETS, 0, 0), 62), true);
  assert.equal(practiceTargetHit(practiceTargetsForMoment(SAMPLE_TARGETS, 0, 0), 64), false);
});

test("count-in helpers expose pulse and beat counts", () => {
  assert.equal(practiceCountInPulses(2), 32);
  assert.equal(practiceCountInBeatLabel(8, "quarter"), 2);
  assert.equal(practiceCountInBeatLabel(4, "quarter"), 1);
});
