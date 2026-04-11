export interface ScaleSuggestion {
  scale_name: string;
  scale_root: string;
  confidence: "high" | "medium" | "low";
  matching_notes: string[];
  outside_notes: string[];
  notes: string[];
  mode: { name: string; degree: number; root: string } | null;
}

export interface NamedProgression {
  name: string;
  degrees: number[];
  feel: string;
}

export interface ProgressionChord {
  degree: number;
  roman: string;
  display_name: string;
  quality: string;
  chord_tones: string[];
  scale_tones: string[];
}

export interface FretPosition {
  string: number;
  fret: number;
  note: string;
  is_chord_tone: boolean;
  is_root?: boolean;
  is_avoid?: boolean;
}

export type NoteValueId = "whole" | "half" | "quarter" | "eighth" | "sixteenth";
export type StrumStyleId = "smooth" | "straight" | "arpeggio";

export interface TuningPreset {
  id: string;
  name: string;
  strings: string[];
}

export interface BeatStepEvent {
  step: number;
  voice: string;
  velocity: number;
}

export interface BeatPattern {
  name: string;
  style: string;
  style_id: string;
  steps_per_bar: number;
  swing: number;
  events: BeatStepEvent[];
}

export const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const SHARPS = new Set(["C#","D#","F#","G#","A#"]);
export const QUALITIES = [
  { id: "major", label: "Major", intervals: "R 3 5" },
  { id: "minor", label: "Minor", intervals: "R ♭3 5" },
  { id: "power", label: "Power", intervals: "R 5" },
  { id: "diminished", label: "Dim", intervals: "R ♭3 ♭5" },
  { id: "sus2", label: "Sus2", intervals: "R 2 5" },
  { id: "sus4", label: "Sus4", intervals: "R 4 5" },
] as const;
export const ROMAN = ["I","II","III","IV","V","VI","VII"];
export const NOTE_VALUES: { id: NoteValueId; label: string; short: string; symbol: string; quarters: number }[] = [
  { id: "whole", label: "Ronde", short: "ronde", symbol: "◯", quarters: 4 },
  { id: "half", label: "Blanche", short: "blanche", symbol: "𝅗𝅥", quarters: 2 },
  { id: "quarter", label: "Noire", short: "noire", symbol: "♩", quarters: 1 },
  { id: "eighth", label: "Croche", short: "croche", symbol: "♪", quarters: 0.5 },
  { id: "sixteenth", label: "Double croche", short: "double", symbol: "♬", quarters: 0.25 },
];
export const STRUM_STYLES: { id: StrumStyleId; label: string; spreadMs: number; velocityDrop: number }[] = [
  { id: "smooth", label: "Smooth", spreadMs: 22, velocityDrop: 0.05 },
  { id: "straight", label: "Straight", spreadMs: 14, velocityDrop: 0.08 },
  { id: "arpeggio", label: "Arpeggio", spreadMs: 40, velocityDrop: 0.03 },
];

const STANDARD_6 = ["E", "A", "D", "G", "B", "E"];
const STANDARD_7 = ["B", "E", "A", "D", "G", "B", "E"];
const TUNING_SHIFTS = [
  { suffix: "E", shift: 0 },
  { suffix: "D#", shift: -1 },
  { suffix: "D", shift: -2 },
  { suffix: "C#", shift: -3 },
  { suffix: "C", shift: -4 },
];
const OPEN_STRING_MIDIS: Record<number, number[]> = {
  6: [40, 45, 50, 55, 59, 64],
  7: [35, 40, 45, 50, 55, 59, 64],
  8: [30, 35, 40, 45, 50, 55, 59, 64],
};

export const DRUM_VOICES = ["Kick", "Snare", "Clap", "Closed Hat", "Open Hat", "Perc"];
export const DEFAULT_BEAT_VELOCITY: Record<string, number> = {
  Kick: 104,
  Snare: 98,
  Clap: 92,
  "Closed Hat": 82,
  "Open Hat": 90,
  Perc: 78,
};

export function noteValue(id: NoteValueId) {
  return NOTE_VALUES.find((value) => value.id === id) ?? NOTE_VALUES[2];
}

export function transposeNoteName(note: string, semitones: number) {
  const index = NOTES.indexOf(note);
  return NOTES[(index + semitones + 12) % 12];
}

export function buildTuningPresets(): TuningPreset[] {
  const six = TUNING_SHIFTS.map(({ suffix, shift }) => ({
    id: `6-${suffix}`,
    name: `6 cordes Standard ${suffix}`,
    strings: STANDARD_6.map((note) => transposeNoteName(note, shift)),
  }));

  const seven = TUNING_SHIFTS.map(({ suffix, shift }) => ({
    id: `7-${suffix}`,
    name: `7 cordes Standard ${suffix}`,
    strings: STANDARD_7.map((note) => transposeNoteName(note, shift)),
  }));

  return [...six, ...seven];
}

function semitoneForNoteName(note: string) {
  return NOTES.indexOf(note);
}

export function resolveOpenStringMidis(tuningStrings: string[]) {
  const baseMidis = OPEN_STRING_MIDIS[tuningStrings.length]
    ?? tuningStrings.map((_, index) => 40 + index * 5);

  return tuningStrings.map((note, index) => {
    const targetPitchClass = semitoneForNoteName(note);
    const reference = baseMidis[index] ?? (40 + index * 5);

    if (targetPitchClass === -1) {
      return reference;
    }

    let bestMidi = reference;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let candidate = reference - 12; candidate <= reference + 12; candidate += 1) {
      if (((candidate % 12) + 12) % 12 !== targetPitchClass) continue;
      const distance = Math.abs(candidate - reference);
      if (distance < bestDistance) {
        bestMidi = candidate;
        bestDistance = distance;
      }
    }

    return bestMidi;
  });
}

export function swingDelaySeconds(step: number, pulseMs: number, swing: number) {
  if (swing <= 0 || step % 2 === 0) return 0;
  return (pulseMs / 1000) * 0.32 * (swing / 75);
}
