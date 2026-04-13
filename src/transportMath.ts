import { noteValue, type NoteValueId } from "./music";

export type HarmonicGuidancePhase = "idle" | "color" | "resolve" | "both";

export function transportResolutionQuarters() {
  return 0.25;
}

export function transportPulseQuarters() {
  return transportResolutionQuarters();
}

export function pulsesForDuration(duration: NoteValueId) {
  return Math.max(1, Math.round(noteValue(duration).quarters / transportResolutionQuarters()));
}

export function pulseMsForTempo(bpm: number, tempoUnit: NoteValueId) {
  return ((60 / bpm) * 1000 * transportResolutionQuarters()) / noteValue(tempoUnit).quarters;
}

export function clickEveryPulses(tempoUnit: NoteValueId) {
  return Math.max(1, Math.round(noteValue(tempoUnit).quarters / transportResolutionQuarters()));
}

export function transportBarSteps(stepsPerBar?: number) {
  return Math.max(1, stepsPerBar ?? 16);
}

export function isTempoClickPulse(globalPulse: number, tempoUnit: NoteValueId) {
  return globalPulse % clickEveryPulses(tempoUnit) === 0;
}

export function isBarDownbeatPulse(globalPulse: number, stepsPerBar?: number) {
  return globalPulse % transportBarSteps(stepsPerBar) === 0;
}

export function harmonicGuidancePulses(currentPulseTotal: number, tempoUnit: NoteValueId) {
  const colorPulse = 0;
  const resolutionPulse = Math.max(0, Math.min(currentPulseTotal - 1, clickEveryPulses(tempoUnit)));

  return {
    colorPulse,
    resolutionPulse,
  };
}

export function harmonicGuidancePhase(
  currentBeat: number,
  currentPulseTotal: number,
  tempoUnit: NoteValueId,
  hasColor: boolean,
  hasResolution: boolean,
): HarmonicGuidancePhase {
  if (currentPulseTotal <= 0 || (!hasColor && !hasResolution)) {
    return "idle";
  }

  const { colorPulse, resolutionPulse } = harmonicGuidancePulses(currentPulseTotal, tempoUnit);
  const onColorPulse = hasColor && currentBeat === colorPulse;
  const onResolutionPulse = hasResolution && currentBeat === resolutionPulse;

  if (onColorPulse && onResolutionPulse) return "both";
  if (onColorPulse) return "color";
  if (onResolutionPulse) return "resolve";
  return "idle";
}

export function phraseGuideStepPulses(
  stepCount: number,
  currentPulseTotal: number,
  tempoUnit: NoteValueId,
) {
  if (stepCount <= 0 || currentPulseTotal <= 0) {
    return [] as number[];
  }

  if (stepCount === 1) {
    return [0];
  }

  const maxPulse = Math.max(0, currentPulseTotal - 1);
  const { resolutionPulse } = harmonicGuidancePulses(currentPulseTotal, tempoUnit);
  const finalPulse = Math.min(maxPulse, Math.max(resolutionPulse, Math.min(maxPulse, stepCount - 1)));

  return Array.from({ length: stepCount }, (_, index) => {
    if (index === 0) return 0;
    if (index === stepCount - 1) return finalPulse;
    return Math.round((finalPulse * index) / (stepCount - 1));
  });
}

export function phraseGuideActiveStepIndex(
  currentBeat: number,
  stepCount: number,
  currentPulseTotal: number,
  tempoUnit: NoteValueId,
) {
  const pulses = phraseGuideStepPulses(stepCount, currentPulseTotal, tempoUnit);
  if (pulses.length === 0) return -1;

  for (let index = pulses.length - 1; index >= 0; index -= 1) {
    if (currentBeat >= pulses[index]) {
      return index;
    }
  }

  return 0;
}
