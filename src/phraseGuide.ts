import { resolveOpenStringMidis, type FretPosition } from "./music";
import { chordFunctionLabel, degreeLabelForNote, normalizedVisiblePositions } from "./fretboardGuidance";

export interface PhraseGuideStep {
  string: number;
  fret: number;
  note: string;
  midi: number;
  degreeLabel: string;
  functionLabel: string | null;
  role: "start" | "passing" | "target";
}

export interface PhraseGuide {
  id: string;
  label: string;
  description: string;
  steps: PhraseGuideStep[];
}

interface PhraseGuidePosition extends FretPosition {
  midi: number;
}

interface BuildPhraseGuidesArgs {
  scalePositions: FretPosition[];
  currentChordTones: string[];
  currentChordQuality: string;
  currentRootNote: string;
  nextChordTones: string[];
  nextChordQuality: string;
  nextRootNote: string;
  scaleRoot: string;
  tuningStrings: string[];
  windowStart: number;
  windowSize: number;
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const token = key(item);
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

function pickPreferredChordTone(chordTones: string[], quality: string, kind: "guide" | "upper" | "root") {
  if (kind === "root") return chordTones[0] ?? "";
  if (quality === "minor" || quality === "diminished") return chordTones[1] ?? chordTones[0] ?? "";
  if (quality === "sus2" || quality === "sus4") return chordTones[1] ?? chordTones[0] ?? "";
  if (kind === "upper") return chordTones[2] ?? chordTones[1] ?? chordTones[0] ?? "";
  return chordTones[1] ?? chordTones[0] ?? "";
}

function enrichVisiblePositions(
  scalePositions: FretPosition[],
  currentChordTones: string[],
  currentRootNote: string,
  tuningStrings: string[],
  windowStart: number,
  windowSize: number,
) {
  const openMidis = resolveOpenStringMidis(tuningStrings);
  return normalizedVisiblePositions(scalePositions, currentChordTones, currentRootNote, windowStart, windowSize)
    .filter((position) => !position.is_avoid)
    .map((position) => ({
      ...position,
      midi: (openMidis[position.string] ?? 0) + position.fret,
    }));
}

function scorePosition(
  position: PhraseGuidePosition,
  preferredNotes: string[],
  preferredStrings: number[],
  centerFret: number,
  referenceMidi?: number,
) {
  let score = 0;

  const notePreferenceIndex = preferredNotes.indexOf(position.note);
  score += notePreferenceIndex === -1 ? -12 : 20 - notePreferenceIndex * 4;

  const stringDistance = preferredStrings.length === 0
    ? 0
    : Math.min(...preferredStrings.map((value) => Math.abs(value - position.string)));
  score += Math.max(0, 10 - stringDistance * 4);

  score -= Math.abs(position.fret - centerFret) * 1.3;

  if (referenceMidi != null) {
    score += Math.max(-16, 14 - Math.abs(position.midi - referenceMidi) * 0.4);
  }

  if (position.fret === 0) {
    score -= 2;
  }

  return score;
}

function choosePosition(
  positions: PhraseGuidePosition[],
  preferredNotes: string[],
  preferredStrings: number[],
  centerFret: number,
  referenceMidi?: number,
  exclude?: PhraseGuidePosition[],
) {
  const excluded = new Set((exclude ?? []).map((item) => `${item.string}:${item.fret}`));
  let best: PhraseGuidePosition | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  positions.forEach((position) => {
    if (excluded.has(`${position.string}:${position.fret}`)) return;
    const score = scorePosition(position, preferredNotes, preferredStrings, centerFret, referenceMidi);
    if (score > bestScore) {
      best = position;
      bestScore = score;
    }
  });

  return best;
}

function choosePassingPosition(
  positions: PhraseGuidePosition[],
  start: PhraseGuidePosition,
  target: PhraseGuidePosition,
  currentChordTones: string[],
  nextChordTones: string[],
) {
  const midpoint = (start.midi + target.midi) / 2;
  const low = Math.min(start.midi, target.midi) - 2;
  const high = Math.max(start.midi, target.midi) + 2;

  let best: PhraseGuidePosition | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  positions.forEach((position) => {
    if (`${position.string}:${position.fret}` === `${start.string}:${start.fret}`) return;
    if (`${position.string}:${position.fret}` === `${target.string}:${target.fret}`) return;
    if (position.midi < low || position.midi > high) return;

    let score = 0;
    score -= Math.abs(position.midi - midpoint) * 0.9;
    score -= Math.abs(position.string - mean([start.string, target.string])) * 2.5;
    score += currentChordTones.includes(position.note) || nextChordTones.includes(position.note) ? 1 : 8;

    if (score > bestScore) {
      best = position;
      bestScore = score;
    }
  });

  return best;
}

function toStep(
  position: PhraseGuidePosition,
  scaleRoot: string,
  chordTones: string[],
  chordQuality: string,
  role: PhraseGuideStep["role"],
) {
  return {
    string: position.string,
    fret: position.fret,
    note: position.note,
    midi: position.midi,
    degreeLabel: degreeLabelForNote(position.note, scaleRoot),
    functionLabel: chordFunctionLabel(position.note, chordTones, chordQuality),
    role,
  };
}

function buildPhrase(
  id: string,
  label: string,
  description: string,
  visible: PhraseGuidePosition[],
  scaleRoot: string,
  currentChordTones: string[],
  currentChordQuality: string,
  nextChordTones: string[],
  nextChordQuality: string,
  startPreference: { notes: string[]; strings: number[]; centerFret: number },
  targetPreference: { notes: string[]; strings: number[]; centerFret: number },
) {
  const start: PhraseGuidePosition | null = choosePosition(
    visible.filter((position) => currentChordTones.includes(position.note)),
    startPreference.notes,
    startPreference.strings,
    startPreference.centerFret,
  );
  if (!start) return null;
  const startPosition = start as PhraseGuidePosition;

  const target: PhraseGuidePosition | null = choosePosition(
    visible.filter((position) => nextChordTones.includes(position.note)),
    targetPreference.notes,
    targetPreference.strings,
    targetPreference.centerFret,
    startPosition.midi,
    [startPosition],
  );
  if (!target) return null;
  const targetPosition = target as PhraseGuidePosition;

  const passing = choosePassingPosition(visible, startPosition, targetPosition, currentChordTones, nextChordTones);

  return {
    id,
    label,
    description,
    steps: uniqueBy(
      [
        toStep(startPosition, scaleRoot, currentChordTones, currentChordQuality, "start"),
        ...(passing ? [toStep(passing, scaleRoot, currentChordTones, currentChordQuality, "passing")] : []),
        toStep(targetPosition, scaleRoot, nextChordTones, nextChordQuality, "target"),
      ],
      (step) => `${step.string}:${step.fret}:${step.role}`,
    ),
  } satisfies PhraseGuide;
}

export function buildPhraseGuides({
  scalePositions,
  currentChordTones,
  currentChordQuality,
  currentRootNote,
  nextChordTones,
  nextChordQuality,
  nextRootNote,
  scaleRoot,
  tuningStrings,
  windowStart,
  windowSize,
}: BuildPhraseGuidesArgs) {
  if (currentChordTones.length === 0 || nextChordTones.length === 0) {
    return [] as PhraseGuide[];
  }

  const visible = enrichVisiblePositions(
    scalePositions,
    currentChordTones,
    currentRootNote,
    tuningStrings,
    windowStart,
    windowSize,
  );

  if (visible.length === 0) {
    return [] as PhraseGuide[];
  }

  const centerFret = mean(visible.map((position) => position.fret));
  const topStrings = [Math.max(0, tuningStrings.length - 2), tuningStrings.length - 1].filter((value, index, items) => items.indexOf(value) === index);
  const midStrings = [
    Math.max(0, Math.floor((tuningStrings.length - 1) / 2) - 1),
    Math.max(0, Math.floor((tuningStrings.length - 1) / 2)),
    Math.min(tuningStrings.length - 1, Math.floor((tuningStrings.length - 1) / 2) + 1),
  ].filter((value, index, items) => items.indexOf(value) === index);
  const lowStrings = [0, Math.min(1, tuningStrings.length - 1), Math.min(2, tuningStrings.length - 1)].filter((value, index, items) => items.indexOf(value) === index);

  const guides = [
    buildPhrase(
      "guide-tones",
      "Guide tones",
      "Relie la note forte de l'accord courant a une note forte du prochain accord.",
      visible,
      scaleRoot,
      currentChordTones,
      currentChordQuality,
      nextChordTones,
      nextChordQuality,
      {
        notes: [
          pickPreferredChordTone(currentChordTones, currentChordQuality, "guide"),
          currentRootNote,
          pickPreferredChordTone(currentChordTones, currentChordQuality, "upper"),
        ],
        strings: midStrings,
        centerFret,
      },
      {
        notes: [
          pickPreferredChordTone(nextChordTones, nextChordQuality, "guide"),
          nextRootNote,
          pickPreferredChordTone(nextChordTones, nextChordQuality, "upper"),
        ],
        strings: midStrings,
        centerFret,
      },
    ),
    buildPhrase(
      "root-path",
      "Root path",
      "Commence sur la tonique et retombe sur la tonique suivante avec un passage simple.",
      visible,
      scaleRoot,
      currentChordTones,
      currentChordQuality,
      nextChordTones,
      nextChordQuality,
      {
        notes: [currentRootNote, pickPreferredChordTone(currentChordTones, currentChordQuality, "upper")],
        strings: lowStrings,
        centerFret: Math.max(0, centerFret - 1.5),
      },
      {
        notes: [nextRootNote, pickPreferredChordTone(nextChordTones, nextChordQuality, "upper")],
        strings: lowStrings.concat(midStrings),
        centerFret,
      },
    ),
    buildPhrase(
      "top-answer",
      "Top line",
      "Une petite reponse melodique dans les cordes aigues pour chanter au-dessus de la grille.",
      visible,
      scaleRoot,
      currentChordTones,
      currentChordQuality,
      nextChordTones,
      nextChordQuality,
      {
        notes: [
          pickPreferredChordTone(currentChordTones, currentChordQuality, "upper"),
          pickPreferredChordTone(currentChordTones, currentChordQuality, "guide"),
          currentRootNote,
        ],
        strings: topStrings,
        centerFret: centerFret + 1,
      },
      {
        notes: [
          pickPreferredChordTone(nextChordTones, nextChordQuality, "upper"),
          pickPreferredChordTone(nextChordTones, nextChordQuality, "guide"),
          nextRootNote,
        ],
        strings: topStrings,
        centerFret: centerFret + 1,
      },
    ),
  ].filter((guide): guide is PhraseGuide => guide != null);

  return uniqueBy(guides, (guide) => guide.steps.map((step) => `${step.string}:${step.fret}`).join("|")).slice(0, 3);
}
