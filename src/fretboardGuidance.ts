import { NOTES, type FretPosition } from "./music";

export type FretboardLabelMode = "degree" | "note" | "function";

const DEGREE_LABELS = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];

const CHORD_FUNCTIONS: Record<string, string[]> = {
  major: ["R", "3", "5"],
  minor: ["R", "♭3", "5"],
  diminished: ["R", "♭3", "♭5"],
  augmented: ["R", "3", "#5"],
  sus2: ["R", "2", "5"],
  sus4: ["R", "4", "5"],
  power: ["R", "5"],
};

export function degreeLabelForNote(note: string, scaleRoot: string) {
  const noteIndex = NOTES.indexOf(note);
  const rootIndex = NOTES.indexOf(scaleRoot);

  if (noteIndex === -1 || rootIndex === -1) {
    return note;
  }

  return DEGREE_LABELS[(noteIndex - rootIndex + 12) % 12];
}

export function chordFunctionLabel(note: string, chordTones: string[], quality: string) {
  const chordIndex = chordTones.indexOf(note);
  if (chordIndex === -1) return null;

  const labels = CHORD_FUNCTIONS[quality] ?? ["R", "3", "5"];
  return labels[chordIndex] ?? labels[labels.length - 1] ?? null;
}

export function positionVisibleInWindow(fret: number, windowStart: number, windowSize: number) {
  if (windowStart === 0) {
    return fret >= 0 && fret <= windowSize;
  }

  return fret > windowStart && fret <= windowStart + windowSize;
}

export function visibleFretsInWindow(windowStart: number, windowSize: number) {
  if (windowStart === 0) {
    return Array.from({ length: windowSize + 1 }, (_, index) => index);
  }

  return Array.from({ length: windowSize }, (_, index) => windowStart + index + 1);
}

export function normalizedVisiblePositions(
  scalePositions: FretPosition[],
  chordTones: string[],
  rootNote: string,
  windowStart: number,
  windowSize: number,
) {
  return scalePositions
    .map((position) => ({
      ...position,
      is_chord_tone: position.is_chord_tone || chordTones.includes(position.note),
      is_root: position.is_root || (position.note === rootNote && chordTones.includes(position.note)),
      is_avoid: position.is_avoid ?? false,
      is_characteristic: position.is_characteristic ?? false,
      is_modal_avoid: position.is_modal_avoid ?? false,
      is_resolution: position.is_resolution ?? false,
    }))
    .filter((position) => positionVisibleInWindow(position.fret, windowStart, windowSize));
}
