import test from "node:test";
import assert from "node:assert/strict";
import { buildGuitarVoicing, midiPitchClass } from "./guitarVoicing";

const STANDARD_6 = ["E", "A", "D", "G", "B", "E"];

test("guitar voicings stay ascending across sounding strings", () => {
  const voicing = buildGuitarVoicing({
    chordTones: ["C", "E", "G"],
    tuningStrings: STANDARD_6,
  }).filter((midi): midi is number => midi != null);

  assert.ok(voicing.length >= 4);
  for (let index = 1; index < voicing.length; index += 1) {
    assert.ok(voicing[index] > voicing[index - 1]);
  }
});

test("guitar voicings cover the full chord and keep root or fifth in the bass", () => {
  const voicing = buildGuitarVoicing({
    chordTones: ["C", "E", "G"],
    tuningStrings: STANDARD_6,
  });
  const sounding = voicing.filter((midi): midi is number => midi != null);
  const pitchClasses = new Set(sounding.map((midi) => midiPitchClass(midi)));

  assert.ok(pitchClasses.has("C"));
  assert.ok(pitchClasses.has("E"));
  assert.ok(pitchClasses.has("G"));
  assert.ok(["C", "G"].includes(midiPitchClass(sounding[0])));
});

test("repeating the same chord keeps a stable voicing for smoother accompaniment", () => {
  const first = buildGuitarVoicing({
    chordTones: ["G", "B", "D"],
    tuningStrings: STANDARD_6,
  });
  const second = buildGuitarVoicing({
    chordTones: ["G", "B", "D"],
    tuningStrings: STANDARD_6,
    previousVoicing: first,
  });

  assert.deepEqual(second, first);
});
