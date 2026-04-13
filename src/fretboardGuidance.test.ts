import test from "node:test";
import assert from "node:assert/strict";
import { chordFunctionLabel, degreeLabelForNote, positionVisibleInWindow, visibleFretsInWindow } from "./fretboardGuidance";

test("degree labels follow interval distance from the selected scale root", () => {
  assert.equal(degreeLabelForNote("C", "C"), "1");
  assert.equal(degreeLabelForNote("E", "C"), "3");
  assert.equal(degreeLabelForNote("C", "A"), "♭3");
  assert.equal(degreeLabelForNote("G", "A"), "♭7");
});

test("chord function labels reflect chord quality", () => {
  assert.equal(chordFunctionLabel("C", ["A", "C", "E"], "minor"), "♭3");
  assert.equal(chordFunctionLabel("D", ["G", "A", "D"], "sus2"), "5");
  assert.equal(chordFunctionLabel("G", ["G", "D"], "power"), "R");
});

test("visible fret windows include open strings only at the nut", () => {
  assert.deepEqual(visibleFretsInWindow(0, 5), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(visibleFretsInWindow(4, 5), [5, 6, 7, 8, 9]);
});

test("position visibility matches the displayed box", () => {
  assert.equal(positionVisibleInWindow(0, 0, 5), true);
  assert.equal(positionVisibleInWindow(5, 0, 5), true);
  assert.equal(positionVisibleInWindow(4, 4, 5), false);
  assert.equal(positionVisibleInWindow(5, 4, 5), true);
  assert.equal(positionVisibleInWindow(9, 4, 5), true);
  assert.equal(positionVisibleInWindow(10, 4, 5), false);
});
