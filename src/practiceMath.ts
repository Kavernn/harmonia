import { NOTES, type NoteValueId } from "./music";
import type { PracticeTarget } from "./practice";
import { clickEveryPulses } from "./transportMath";

export function pitchClassNameFromMidi(midi: number) {
  return NOTES[((midi % 12) + 12) % 12];
}

export function octaveFromMidi(midi: number) {
  return Math.floor(midi / 12) - 1;
}

export function noteLabelFromMidi(midi: number) {
  return `${pitchClassNameFromMidi(midi)}${octaveFromMidi(midi)}`;
}

export function practiceTargetsForMoment(
  targets: PracticeTarget[],
  stepIndex: number,
  pulseIndex: number,
) {
  return targets.filter((target) => target.step_index === stepIndex && target.pulse_index === pulseIndex);
}

export function practiceTargetHit(targets: PracticeTarget[], midi: number) {
  const pitchClass = pitchClassNameFromMidi(midi);
  return targets.some((target) => target.pitch_classes.includes(pitchClass));
}

export function practiceCountInPulses(countInBars: number) {
  return Math.max(0, countInBars) * 16;
}

export function practiceCountInBeatLabel(
  remainingPulses: number,
  tempoUnit: NoteValueId,
) {
  const pulsesPerBeat = clickEveryPulses(tempoUnit);
  if (remainingPulses <= 0 || pulsesPerBeat <= 0) return 0;
  return Math.ceil(remainingPulses / pulsesPerBeat);
}
