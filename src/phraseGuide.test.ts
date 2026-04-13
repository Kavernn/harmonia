import test from "node:test";
import assert from "node:assert/strict";
import type { FretPosition } from "./music";
import { buildPhraseGuides } from "./phraseGuide";

const SCALE_POSITIONS: FretPosition[] = [
  { string: 0, fret: 3, note: "G", is_chord_tone: true },
  { string: 0, fret: 5, note: "A", is_chord_tone: false },
  { string: 1, fret: 2, note: "B", is_chord_tone: true },
  { string: 1, fret: 3, note: "C", is_chord_tone: false, is_root: true },
  { string: 1, fret: 5, note: "D", is_chord_tone: false },
  { string: 2, fret: 2, note: "E", is_chord_tone: true },
  { string: 2, fret: 4, note: "F#", is_chord_tone: false },
  { string: 2, fret: 5, note: "G", is_chord_tone: true },
  { string: 3, fret: 2, note: "A", is_chord_tone: false },
  { string: 3, fret: 4, note: "B", is_chord_tone: true },
  { string: 3, fret: 5, note: "C", is_chord_tone: false, is_root: true },
  { string: 4, fret: 3, note: "D", is_chord_tone: false },
  { string: 4, fret: 5, note: "E", is_chord_tone: true },
  { string: 5, fret: 3, note: "G", is_chord_tone: true },
];

test("phrase guides start on the current chord and land on the next chord", () => {
  const guides = buildPhraseGuides({
    scalePositions: SCALE_POSITIONS,
    currentChordTones: ["C", "E", "G"],
    currentChordQuality: "major",
    currentRootNote: "C",
    nextChordTones: ["D", "F#", "A"],
    nextChordQuality: "major",
    nextRootNote: "D",
    scaleRoot: "C",
    tuningStrings: ["E", "A", "D", "G", "B", "E"],
    windowStart: 0,
    windowSize: 5,
  });

  assert.equal(guides.length, 3);
  guides.forEach((guide) => {
    assert.ok(["C", "E", "G"].includes(guide.steps[0].note));
    assert.ok(["D", "F#", "A"].includes(guide.steps[guide.steps.length - 1].note));
  });
});

test("phrase guides stay inside the visible fret box", () => {
  const guides = buildPhraseGuides({
    scalePositions: SCALE_POSITIONS,
    currentChordTones: ["C", "E", "G"],
    currentChordQuality: "major",
    currentRootNote: "C",
    nextChordTones: ["G", "B", "D"],
    nextChordQuality: "major",
    nextRootNote: "G",
    scaleRoot: "C",
    tuningStrings: ["E", "A", "D", "G", "B", "E"],
    windowStart: 0,
    windowSize: 5,
  });

  guides.flatMap((guide) => guide.steps).forEach((step) => {
    assert.ok(step.fret >= 0 && step.fret <= 5);
  });
});
