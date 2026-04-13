import { NOTES, resolveOpenStringMidis } from "./music";

const MAX_FRET = 12;
const MAX_CANDIDATES_PER_STRING = 5;

interface VoicingCandidate {
  midi: number | null;
  fret: number | null;
  pitchClass: string | null;
  baseScore: number;
}

interface BuildGuitarVoicingArgs {
  chordTones: string[];
  tuningStrings: string[];
  previousVoicing?: Array<number | null> | null;
}

export function midiPitchClass(midi: number) {
  return NOTES[((midi % 12) + 12) % 12];
}

function uniquePitchClasses(chordTones: string[]) {
  return chordTones.filter((pitchClass, index) => chordTones.indexOf(pitchClass) === index);
}

function fretsForPitchClass(openMidi: number, pitchClass: string) {
  const target = NOTES.indexOf(pitchClass);
  if (target < 0) return [];

  const frets: number[] = [];
  for (let fret = 0; fret <= MAX_FRET; fret += 1) {
    if (((openMidi + fret) % 12 + 12) % 12 === target) {
      frets.push(fret);
    }
  }
  return frets;
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function targetCenterFret(
  openStringMidis: number[],
  chordPitchClasses: string[],
  previousVoicing?: Array<number | null> | null,
) {
  const previousFrets = (previousVoicing ?? [])
    .flatMap((midi, stringIndex) => midi == null ? [] : [Math.max(0, midi - openStringMidis[stringIndex])]);

  if (previousFrets.length > 0) {
    return average(previousFrets);
  }

  const rootPitchClass = chordPitchClasses[0];
  const rootFrets = openStringMidis
    .slice(1)
    .flatMap((openMidi) => fretsForPitchClass(openMidi, rootPitchClass).filter((fret) => fret <= 7));

  if (rootFrets.length === 0) return 4;
  const sorted = [...rootFrets].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function buildCandidatesForString(
  openMidi: number,
  stringIndex: number,
  stringCount: number,
  chordPitchClasses: string[],
  centerFret: number,
  previousVoicing?: Array<number | null> | null,
) {
  const rootPitchClass = chordPitchClasses[0];
  const upperPrimaryPitchClass = chordPitchClasses[1] ?? rootPitchClass;
  const upperSecondaryPitchClass = chordPitchClasses[2] ?? upperPrimaryPitchClass;
  const previousMidi = previousVoicing?.[stringIndex] ?? null;
  const targetFret = centerFret + (stringIndex - (stringCount - 1) / 2) * 0.35;

  const noteCandidates = chordPitchClasses
    .flatMap((pitchClass) => fretsForPitchClass(openMidi, pitchClass).map((fret) => {
      const midi = openMidi + fret;
      let baseScore = -Math.abs(fret - targetFret) * 1.5;

      if (stringIndex === 0) {
        baseScore += pitchClass === rootPitchClass ? 18 : pitchClass === upperSecondaryPitchClass ? 10 : -4;
      } else if (stringIndex === 1) {
        baseScore += pitchClass === rootPitchClass ? 10 : pitchClass === upperPrimaryPitchClass ? 8 : 6;
      } else if (stringIndex >= stringCount - 2) {
        baseScore += pitchClass === upperPrimaryPitchClass ? 6 : pitchClass === rootPitchClass ? 4 : 3;
      } else {
        baseScore += pitchClass === upperPrimaryPitchClass ? 4 : pitchClass === rootPitchClass ? 3 : 2;
      }

      if (previousMidi != null) {
        baseScore += Math.max(-16, 10 - Math.abs(midi - previousMidi) * 0.55);
      }

      if (fret === 0) {
        baseScore += pitchClass === rootPitchClass || pitchClass === upperSecondaryPitchClass ? 4 : 1;
      }

      if (midi < 45 && pitchClass !== rootPitchClass && pitchClass !== upperSecondaryPitchClass) {
        baseScore -= 14;
      }
      if (midi < 40 && pitchClass !== rootPitchClass) {
        baseScore -= 24;
      }
      if (midi > 76) {
        baseScore -= (midi - 76) * 0.4;
      }

      return { midi, fret, pitchClass, baseScore };
    }))
    .reduce<VoicingCandidate[]>((unique, candidate) => {
      const existing = unique.findIndex((item) => item.midi === candidate.midi);
      if (existing === -1) {
        unique.push(candidate);
      } else if (unique[existing].baseScore < candidate.baseScore) {
        unique[existing] = candidate;
      }
      return unique;
    }, [])
    .sort((left, right) => right.baseScore - left.baseScore);

  const mutePenalty = stringIndex === 0 && stringCount >= 7
    ? -2
    : stringIndex === 0
      ? -10
      : stringIndex === stringCount - 1
        ? -5
        : stringIndex > 1 && stringIndex < stringCount - 2
          ? -18
          : -8;

  return [
    { midi: null, fret: null, pitchClass: null, baseScore: mutePenalty },
    ...noteCandidates.slice(0, MAX_CANDIDATES_PER_STRING - 1),
  ];
}

function scoreVoicing(
  voicing: VoicingCandidate[],
  chordPitchClasses: string[],
  centerFret: number,
  previousVoicing?: Array<number | null> | null,
) {
  const sounding = voicing
    .map((candidate, stringIndex) => ({ ...candidate, stringIndex }))
    .filter((candidate) => candidate.midi != null && candidate.fret != null && candidate.pitchClass != null);

  if (sounding.length === 0) return Number.NEGATIVE_INFINITY;

  let score = voicing.reduce((total, candidate) => total + candidate.baseScore, 0);
  const pitchClassCounts = new Map<string, number>();

  sounding.forEach((candidate) => {
    pitchClassCounts.set(candidate.pitchClass!, (pitchClassCounts.get(candidate.pitchClass!) ?? 0) + 1);
  });

  score += pitchClassCounts.size * 18;
  score -= (chordPitchClasses.length - pitchClassCounts.size) * 42;

  const bassPitchClass = sounding[0].pitchClass!;
  const bassFifth = chordPitchClasses[2] ?? chordPitchClasses[1] ?? chordPitchClasses[0];
  if (bassPitchClass === chordPitchClasses[0]) {
    score += 24;
  } else if (bassPitchClass === bassFifth) {
    score += 10;
  } else {
    score -= 34;
  }

  if (sounding.length < 4) {
    score -= (4 - sounding.length) * 30;
  }
  if (sounding.length > 6) {
    score -= (sounding.length - 6) * 12;
  }

  const frets = sounding.map((candidate) => candidate.fret!);
  const fretSpan = Math.max(...frets) - Math.min(...frets);
  if (fretSpan > 5) {
    score -= (fretSpan - 5) * 8;
  }
  score -= Math.abs(average(frets) - centerFret) * 0.8;

  pitchClassCounts.forEach((count) => {
    if (count > 2) {
      score -= (count - 2) * 10;
    }
  });

  const firstSoundingIndex = voicing.findIndex((candidate) => candidate.midi != null);
  const lastSoundingIndex = voicing.length - 1 - [...voicing].reverse().findIndex((candidate) => candidate.midi != null);
  for (let index = firstSoundingIndex + 1; index < lastSoundingIndex; index += 1) {
    if (voicing[index].midi == null) {
      score -= 18;
    }
  }

  for (let index = 1; index < sounding.length; index += 1) {
    const interval = sounding[index].midi! - sounding[index - 1].midi!;
    if (interval < 3) {
      score -= 9;
    }
    if (sounding[index].midi! < 55 && interval < 5) {
      score -= 8;
    }
    if (interval > 12) {
      score -= (interval - 12) * 1.5;
    }
  }

  if (previousVoicing) {
    sounding.forEach((candidate) => {
      const previousMidi = previousVoicing[candidate.stringIndex];
      if (previousMidi != null) {
        score -= Math.abs(candidate.midi! - previousMidi) * 0.15;
      }
    });
  }

  if (voicing.length >= 7 && sounding[0].stringIndex === 0 && sounding[0].midi! < 40 && bassPitchClass !== chordPitchClasses[0]) {
    score -= 24;
  }

  return score;
}

export function buildGuitarVoicing({
  chordTones,
  tuningStrings,
  previousVoicing = null,
}: BuildGuitarVoicingArgs) {
  const chordPitchClasses = uniquePitchClasses(chordTones);
  const openStringMidis = resolveOpenStringMidis(tuningStrings);

  if (chordPitchClasses.length === 0 || openStringMidis.length === 0) {
    return openStringMidis.map(() => null);
  }

  const centerFret = targetCenterFret(openStringMidis, chordPitchClasses, previousVoicing);
  const candidateMatrix = openStringMidis.map((openMidi, stringIndex) =>
    buildCandidatesForString(openMidi, stringIndex, openStringMidis.length, chordPitchClasses, centerFret, previousVoicing),
  );

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestVoicing = openStringMidis.map(() => null) as Array<number | null>;

  function search(stringIndex: number, previousMidi: number | null, partial: VoicingCandidate[]) {
    if (stringIndex >= candidateMatrix.length) {
      const score = scoreVoicing(partial, chordPitchClasses, centerFret, previousVoicing);
      if (score > bestScore) {
        bestScore = score;
        bestVoicing = partial.map((candidate) => candidate.midi);
      }
      return;
    }

    candidateMatrix[stringIndex].forEach((candidate) => {
      if (candidate.midi != null && previousMidi != null && candidate.midi <= previousMidi) {
        return;
      }

      search(
        stringIndex + 1,
        candidate.midi ?? previousMidi,
        [...partial, candidate],
      );
    });
  }

  search(0, null, []);

  return bestVoicing;
}
