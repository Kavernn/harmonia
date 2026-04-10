import { NoteValue, normalize } from "../core/notes";

export type ChordType =
  | "power"
  | "major"
  | "minor"
  | "maj7"
  | "m7"
  | "sus2"
  | "sus4"
  | "add9";

const CHORD_INTERVALS: Record<ChordType, number[]> = {
  power: [0, 7],
  major: [0, 4, 7],
  minor: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14]
};

export class Chord {
  readonly root: NoteValue;
  readonly type: ChordType;

  constructor(root: NoteValue, type: ChordType) {
    this.root = normalize(root);
    this.type = type;
  }

  getNotes(): NoteValue[] {
    return CHORD_INTERVALS[this.type].map(i =>
      normalize(this.root + i)
    );
  }
}
