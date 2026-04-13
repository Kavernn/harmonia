import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalScaleName,
  defaultProgressionStepsForHarmony,
  diatonicProgressionStepsForHarmony,
} from "./music";

test("major and natural minor aliases normalize to modal names", () => {
  assert.equal(canonicalScaleName("Major"), "Ionian");
  assert.equal(canonicalScaleName("Natural Minor"), "Aeolian");
  assert.equal(canonicalScaleName("Dorian"), "Dorian");
});

test("modal defaults stay centered on their characteristic harmony", () => {
  assert.deepEqual(defaultProgressionStepsForHarmony("Dorian"), ["i", "IV", "i", "IV"]);
  assert.deepEqual(defaultProgressionStepsForHarmony("Phrygian"), ["i", "II", "i", "VII"]);
  assert.deepEqual(defaultProgressionStepsForHarmony("Mixolydian"), ["I", "VII", "IV", "I"]);
});

test("modal diatonic degree lists expose the expected chord qualities", () => {
  assert.deepEqual(diatonicProgressionStepsForHarmony("Ionian"), ["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
  assert.deepEqual(diatonicProgressionStepsForHarmony("Dorian"), ["i", "ii", "III", "IV", "v", "vi°", "VII"]);
  assert.deepEqual(diatonicProgressionStepsForHarmony("Locrian"), ["i°", "II", "iii", "iv", "V", "VI", "vii"]);
});
