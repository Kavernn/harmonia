import test from "node:test";
import assert from "node:assert/strict";
import { swingDelaySeconds } from "./music";
import {
  clickEveryPulses,
  harmonicGuidancePhase,
  harmonicGuidancePulses,
  isBarDownbeatPulse,
  isTempoClickPulse,
  pulseMsForTempo,
  phraseGuideActiveStepIndex,
  phraseGuideStepPulses,
  pulsesForDuration,
  transportBarSteps,
  transportPulseQuarters,
} from "./transportMath";

test("transport uses a stable sixteenth-note resolution", () => {
  assert.equal(transportPulseQuarters(), 0.25);
});

test("duration pulses match note values on the transport grid", () => {
  assert.equal(pulsesForDuration("whole"), 16);
  assert.equal(pulsesForDuration("half"), 8);
  assert.equal(pulsesForDuration("quarter"), 4);
  assert.equal(pulsesForDuration("eighth"), 2);
  assert.equal(pulsesForDuration("sixteenth"), 1);
});

test("tempo pulse length adapts to the selected tempo unit", () => {
  assert.equal(pulseMsForTempo(120, "quarter"), 125);
  assert.equal(pulseMsForTempo(80, "eighth"), 375);
  assert.equal(pulseMsForTempo(60, "whole"), 62.5);
});

test("metronome clicks line up with the selected tempo unit", () => {
  assert.equal(clickEveryPulses("whole"), 16);
  assert.equal(clickEveryPulses("half"), 8);
  assert.equal(clickEveryPulses("quarter"), 4);
  assert.equal(clickEveryPulses("eighth"), 2);
  assert.equal(clickEveryPulses("sixteenth"), 1);
});

test("metronome accents stay on the global bar, not on every chord change", () => {
  assert.equal(transportBarSteps(), 16);
  assert.equal(isTempoClickPulse(0, "quarter"), true);
  assert.equal(isTempoClickPulse(2, "quarter"), false);
  assert.equal(isTempoClickPulse(4, "quarter"), true);
  assert.equal(isBarDownbeatPulse(0), true);
  assert.equal(isBarDownbeatPulse(4), false);
  assert.equal(isBarDownbeatPulse(12), false);
  assert.equal(isBarDownbeatPulse(16), true);
});

test("swing delay only affects off-beat steps and respects swing amount", () => {
  assert.equal(swingDelaySeconds(0, 125, 75), 0);
  assert.equal(swingDelaySeconds(2, 125, 75), 0);
  assert.equal(swingDelaySeconds(1, 125, 0), 0);
  assert.equal(swingDelaySeconds(1, 125, 75), 0.04);
});

test("harmonic guidance pulses target the downbeat then the next tempo beat", () => {
  assert.deepEqual(harmonicGuidancePulses(8, "quarter"), {
    colorPulse: 0,
    resolutionPulse: 4,
  });
  assert.deepEqual(harmonicGuidancePulses(2, "quarter"), {
    colorPulse: 0,
    resolutionPulse: 1,
  });
});

test("harmonic guidance phase can pulse color then resolution", () => {
  assert.equal(harmonicGuidancePhase(0, 8, "quarter", true, true), "color");
  assert.equal(harmonicGuidancePhase(4, 8, "quarter", true, true), "resolve");
  assert.equal(harmonicGuidancePhase(1, 8, "quarter", true, true), "idle");
  assert.equal(harmonicGuidancePhase(0, 1, "quarter", true, true), "both");
});

test("phrase guides spread their notes across the current chord duration", () => {
  assert.deepEqual(phraseGuideStepPulses(3, 8, "quarter"), [0, 2, 4]);
  assert.deepEqual(phraseGuideStepPulses(2, 4, "quarter"), [0, 3]);
  assert.deepEqual(phraseGuideStepPulses(3, 1, "quarter"), [0, 0, 0]);
});

test("phrase guide active step advances with the transport beat", () => {
  assert.equal(phraseGuideActiveStepIndex(0, 3, 8, "quarter"), 0);
  assert.equal(phraseGuideActiveStepIndex(2, 3, 8, "quarter"), 1);
  assert.equal(phraseGuideActiveStepIndex(4, 3, 8, "quarter"), 2);
  assert.equal(phraseGuideActiveStepIndex(3, 2, 4, "quarter"), 1);
});
