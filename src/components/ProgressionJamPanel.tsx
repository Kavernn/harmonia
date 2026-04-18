import { ChordDiagram } from "./ChordDiagram";
import { Fretboard } from "./Fretboard";
import {
  ACCOMPANIMENT_TONES,
  NOTE_VALUES,
  STRUM_STYLES,
  noteValue,
  type AccompanimentToneId,
  type FretPosition,
  type NamedProgression,
  type NoteValueId,
  type ProgressionChord,
  type ProgressionStepOption,
  type ScaleSuggestion,
  type StrumStyleId,
} from "../music";
import { chordFunctionLabel, degreeLabelForNote, type FretboardLabelMode } from "../fretboardGuidance";
import type { PhraseGuide } from "../phraseGuide";
import { harmonicGuidancePhase, type HarmonicGuidancePhase } from "../transportMath";
import { usePersistentState } from "../hooks/usePersistentState";

function BeatDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }, (_, index) => (
        <div key={index} style={{
          width: index === current ? 12 : 8,
          height: index === current ? 12 : 8,
          borderRadius: "50%",
          background: index === current ? "var(--color-accent-primary)" : "var(--color-border-secondary)",
          transition: "all 0.05s ease",
        }}/>
      ))}
    </div>
  );
}

const QUALITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  major: { bg: "var(--color-accent-soft)", color: "var(--color-accent-primary)", border: "var(--color-border-tertiary)" },
  minor: { bg: "var(--color-success-soft)", color: "var(--color-success)", border: "var(--color-border-tertiary)" },
  diminished: { bg: "var(--color-danger-soft)", color: "var(--color-danger)", border: "var(--color-border-tertiary)" },
  augmented: { bg: "var(--color-warning-soft)", color: "var(--color-warning)", border: "var(--color-border-tertiary)" },
  indeterminate: {
    bg: "var(--color-background-secondary)",
    color: "var(--color-text-secondary)",
    border: "var(--color-border-tertiary)",
  },
};

function qualityStyle(quality: string) {
  return QUALITY_STYLE[quality] ?? QUALITY_STYLE.indeterminate;
}

const STEP_FAMILY_META: Record<string, { label: string; hint: string; bg: string; color: string; border: string }> = {
  diatonic: {
    label: "Diatoniques",
    hint: "dans le centre tonal",
    bg: "var(--color-success-soft)",
    color: "var(--color-success)",
    border: "var(--color-border-tertiary)",
  },
  borrowed: {
    label: "Emprunts",
    hint: "couleurs hors gamme",
    bg: "var(--color-warning-soft)",
    color: "var(--color-warning)",
    border: "var(--color-border-tertiary)",
  },
  secondary_dominant: {
    label: "Dominantes secondaires",
    hint: "tension puis résolution",
    bg: "var(--color-accent-soft)",
    color: "var(--color-accent-primary)",
    border: "var(--color-border-tertiary)",
  },
};

function stepFamilyMeta(family: string) {
  return STEP_FAMILY_META[family] ?? STEP_FAMILY_META.diatonic;
}

function harmonicRoleBadge(step: ProgressionChord) {
  if (step.harmonic_role === "secondary_dominant") {
    return step.target_step ? `Dom. sec. -> ${step.target_step}` : "Dom. sec.";
  }
  if (step.harmonic_role === "borrowed") {
    return "Emprunt";
  }
  return "Diatonique";
}

function harmonicRoleGuidance(step: ProgressionChord) {
  if (step.harmonic_role === "secondary_dominant") {
    const target = step.target_note ?? step.target_step ?? "l'accord cible";
    return `Dominante secondaire: fais entendre ${step.outside_harmony_tones.join(" · ") || "la tension"} puis résous vers ${target}.`;
  }

  if (step.harmonic_role === "borrowed") {
    return `Accord emprunté: garde la couleur ${step.outside_harmony_tones.join(" · ") || "hors tonalité"} comme tension expressive avant le retour.`;
  }

  return "Accord diatonique: reste dans la palette active et vise R, 3, 5 sur les temps forts.";
}

function guidancePhaseLabel(phase: HarmonicGuidancePhase) {
  switch (phase) {
    case "color":
      return "Maintenant: fais sonner la couleur";
    case "resolve":
      return "Maintenant: résous";
    case "both":
      return "Maintenant: couleur + résolution";
    default:
      return "Laisse respirer la phrase";
  }
}

interface ProgressionJamPanelProps {
  harmonyRootName: string;
  harmonyScaleName: string;
  selectedScale: ScaleSuggestion;
  namedProgs: NamedProgression[];
  tab: "suggest" | "build";
  activeSteps: string[];
  progressionStepOptions: ProgressionStepOption[];
  progression: ProgressionChord[];
  activeStep: number;
  stepDurations: NoteValueId[];
  isPlaying: boolean;
  bpm: number;
  tempoUnit: NoteValueId;
  currentPulseTotal: number;
  currentBeat: number;
  clickVolume: number;
  guitarVolume: number;
  masterVolume: number;
  strumStyle: StrumStyleId;
  accompanimentTone: AccompanimentToneId;
  scalePositions: FretPosition[];
  windowStart: number;
  windowSize: number;
  showAvoid: boolean;
  flash: boolean;
  followChord: boolean;
  displayPreset: "focus" | "jam" | "learn" | "advanced";
  positionMode: "auto" | "manual";
  manualWindowStart: number;
  maxWindowStart: number;
  labelMode: FretboardLabelMode;
  showTabGuide: boolean;
  showPhraseGuide: boolean;
  playPhraseCue: boolean;
  selectedTuningName: string;
  selectedTuningStrings: string[];
  phraseGuides: PhraseGuide[];
  onTabChange: (tab: "suggest" | "build") => void;
  onSelectNamedProgression: (steps: string[]) => void;
  onToggleStep: (step: string) => void;
  onClearSteps: () => void;
  onSelectStep: (index: number) => void;
  onStepDurationChange: (index: number, value: NoteValueId) => void;
  onStartJam: () => void;
  onStopJam: () => void;
  onBpmChange: (value: number) => void;
  onTempoUnitChange: (value: NoteValueId) => void;
  onClickVolumeChange: (value: number) => void;
  onGuitarVolumeChange: (value: number) => void;
  onMasterVolumeChange: (value: number) => void;
  onStrumStyleChange: (value: StrumStyleId) => void;
  onAccompanimentToneChange: (value: AccompanimentToneId) => void;
  onWindowSizeChange: (size: number) => void;
  onToggleShowAvoid: () => void;
  onToggleFollowChord: () => void;
  onDisplayPresetChange: (preset: "focus" | "jam" | "learn" | "advanced") => void;
  onPositionModeChange: (mode: "auto" | "manual") => void;
  onManualWindowStartChange: (value: number) => void;
  onLabelModeChange: (mode: FretboardLabelMode) => void;
  onToggleTabGuide: () => void;
  onTogglePhraseGuide: () => void;
  onTogglePhraseCue: () => void;
  onSaveProgression: (name: string) => void;
  onDeleteSavedProgression: (name: string) => void;
  userSavedProgressionNames: string[];
}

export function ProgressionJamPanel({
  harmonyRootName,
  harmonyScaleName,
  selectedScale,
  namedProgs,
  tab,
  activeSteps,
  progressionStepOptions,
  progression,
  activeStep,
  stepDurations,
  isPlaying,
  bpm,
  tempoUnit,
  currentPulseTotal,
  currentBeat,
  clickVolume,
  guitarVolume,
  masterVolume,
  strumStyle,
  accompanimentTone,
  scalePositions,
  windowStart,
  windowSize,
  showAvoid,
  flash,
  followChord,
  displayPreset,
  positionMode,
  manualWindowStart,
  maxWindowStart,
  labelMode,
  showTabGuide,
  showPhraseGuide,
  playPhraseCue,
  selectedTuningName,
  selectedTuningStrings,
  phraseGuides,
  onTabChange,
  onSelectNamedProgression,
  onToggleStep,
  onClearSteps,
  onSelectStep,
  onStepDurationChange,
  onStartJam,
  onStopJam,
  onBpmChange,
  onTempoUnitChange,
  onClickVolumeChange,
  onGuitarVolumeChange,
  onMasterVolumeChange,
  onStrumStyleChange,
  onAccompanimentToneChange,
  onWindowSizeChange,
  onToggleShowAvoid,
  onToggleFollowChord,
  onDisplayPresetChange,
  onPositionModeChange,
  onManualWindowStartChange,
  onLabelModeChange,
  onToggleTabGuide,
  onTogglePhraseGuide,
  onTogglePhraseCue,
  onSaveProgression,
  onDeleteSavedProgression,
  userSavedProgressionNames,
}: ProgressionJamPanelProps) {
  const [showTransportDetails, setShowTransportDetails] = usePersistentState("harmonia.transport-details", false);
  const [showTheoryDetails, setShowTheoryDetails] = usePersistentState("harmonia.theory-details", false);
  const currentStep = progression[activeStep];
  const nextStep = progression[(activeStep + 1) % Math.max(1, progression.length)] ?? currentStep;
  const loopsToStart = progression.length > 1 && activeStep === progression.length - 1;
  const currentChordTones = currentStep?.chord_tones ?? [];
  const currentRootNote = currentChordTones[0] ?? "";
  const currentDuration = stepDurations[activeStep] ?? "quarter";
  const targetBoxLabel = windowSize === 5 ? "Jam box" : "Full neck";
  const nextChordLabel = loopsToStart
    ? `la reprise sur ${nextStep?.display_name ?? currentStep?.display_name ?? ""}`
    : nextStep?.display_name ?? currentStep?.display_name ?? "";
  const positionPresets = [0, 2, 4, 6, 8, 11, 14].filter((start) => start <= maxWindowStart);
  const strongBeatTargets = currentChordTones
    .map((note) => `${degreeLabelForNote(note, selectedScale.scale_root)} (${note})`)
    .join(" · ");
  const modalCharacteristicDegrees = selectedScale.characteristic_notes
    .map((note) => `${degreeLabelForNote(note, selectedScale.scale_root)} (${note})`)
    .join(" · ");
  const modalAvoidDegrees = selectedScale.modal_avoid_notes
    .map((note) => `${degreeLabelForNote(note, selectedScale.scale_root)} (${note})`)
    .join(" · ");
  const modalResolutionDegrees = selectedScale.resolution_notes
    .map((note) => `${degreeLabelForNote(note, selectedScale.scale_root)} (${note})`)
    .join(" · ");
  const chordFunctions = currentChordTones
    .map((note) => chordFunctionLabel(note, currentChordTones, currentStep?.quality ?? "") ?? note)
    .join(" · ");
  const passingDegrees = selectedScale.notes
    .filter((note) => !currentChordTones.includes(note) && !selectedScale.modal_avoid_notes.includes(note))
    .map((note) => `${degreeLabelForNote(note, selectedScale.scale_root)} (${note})`)
    .join(" · ");
  const currentColorTones = currentStep?.outside_harmony_tones ?? [];
  const currentResolutionNote = currentStep?.target_note ?? (currentColorTones.length > 0 ? (nextStep?.chord_tones?.[0] ?? "") : "");
  const contextualFocusTones = currentStep?.modal_focus_tones?.length
    ? currentStep.modal_focus_tones
    : selectedScale.characteristic_notes;
  const contextualReleaseTones = currentStep?.modal_release_tones?.length
    ? currentStep.modal_release_tones
    : selectedScale.resolution_notes;
  const contextualFocusDegrees = contextualFocusTones
    .map((note) => `${degreeLabelForNote(note, selectedScale.scale_root)} (${note})`)
    .join(" · ");
  const contextualReleaseDegrees = contextualReleaseTones
    .map((note) => `${degreeLabelForNote(note, selectedScale.scale_root)} (${note})`)
    .join(" · ");
  const contextualAdvice = currentStep?.modal_advice || selectedScale.guidance;
  const guidancePhase = isPlaying
    ? harmonicGuidancePhase(
      currentBeat,
      currentPulseTotal,
      tempoUnit,
      currentColorTones.length > 0,
      Boolean(currentResolutionNote),
    )
    : "idle";
  const groupedStepOptions = Object.entries(
    progressionStepOptions.reduce<Record<string, ProgressionStepOption[]>>((groups, option) => {
      const family = option.family;
      groups[family] ??= [];
      groups[family].push(option);
      return groups;
    }, {}),
  ).sort(([familyA], [familyB]) => {
    const familyOrder = ["diatonic", "borrowed", "secondary_dominant"];
    return familyOrder.indexOf(familyA) - familyOrder.indexOf(familyB);
  });
  const fretboardPresets = [
    { id: "focus" as const, label: "Focus", hint: "ultra minimal" },
    { id: "jam" as const, label: "Jam", hint: "lecture minimale" },
    { id: "learn" as const, label: "Learn", hint: "guides visibles" },
    { id: "advanced" as const, label: "Advanced", hint: "toutes les couches" },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12 }}>
        Progression — {harmonyRootName} {harmonyScaleName} · Solo palette — {selectedScale.scale_root} {selectedScale.scale_name}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {(["suggest", "build"] as const).map((currentTab) => (
          <button key={currentTab} onClick={() => onTabChange(currentTab)} style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: tab === currentTab ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
            color: tab === currentTab ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "5px 12px",
            fontSize: 11,
            cursor: "pointer",
            fontWeight: tab === currentTab ? 500 : 400,
          }}>
            {currentTab === "suggest" ? "Suggestions" : "Manual"}
          </button>
        ))}
      </div>

      {tab === "suggest" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          {namedProgs.map((progressionOption, index) => {
            const active = JSON.stringify(activeSteps) === JSON.stringify(progressionOption.steps);
            return (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => onSelectNamedProgression(progressionOption.steps)} style={{
                  flex: 1,
                  border: active ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                  background: active ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "7px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: active ? "var(--color-accent-strong)" : "var(--color-text-primary)" }}>
                    {progressionOption.name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{progressionOption.feel}</span>
                </button>
                {userSavedProgressionNames.includes(progressionOption.name) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteSavedProgression(progressionOption.name); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 10, padding: "0 2px" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          {activeSteps.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input
                type="text"
                placeholder="Nom du preset..."
                id="prog-save-name"
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-primary)",
                  flex: 1,
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById("prog-save-name") as HTMLInputElement;
                  const name = input?.value.trim();
                  if (name) { onSaveProgression(name); input.value = ""; }
                }}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sauvegarder
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "build" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>Construis la grille par famille harmonique</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
            {groupedStepOptions.map(([family, options]) => {
              const familyMeta = stepFamilyMeta(family);
              return (
                <div key={family} style={{
                  border: `0.5px solid ${familyMeta.border}`,
                  borderRadius: "var(--border-radius-md)",
                  padding: "8px 10px",
                  background: "var(--color-background-primary)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: familyMeta.color }}>
                      {familyMeta.label}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                      {familyMeta.hint}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {options.map((option) => {
                      const inProgression = activeSteps.includes(option.token);
                      return (
                        <button key={option.token} onClick={() => onToggleStep(option.token)} style={{
                          border: inProgression ? "1.5px solid var(--color-accent-primary)" : `0.5px solid ${familyMeta.border}`,
                          background: inProgression ? "var(--color-accent-primary)" : familyMeta.bg,
                          color: inProgression ? "var(--color-accent-contrast)" : familyMeta.color,
                          borderRadius: "var(--border-radius-md)",
                          padding: "6px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}>
                          {option.token}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={onClearSteps} style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: "transparent",
            color: "var(--color-text-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "4px 10px",
            fontSize: 11,
            cursor: "pointer",
          }}>
            Effacer
          </button>
        </div>
      )}

      {progression.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {progression.map((step, index) => {
            const style = qualityStyle(step.quality);
            const active = activeStep === index;
            const duration = stepDurations[index] ?? "quarter";

            return (
              <div key={index} onClick={() => onSelectStep(index)} style={{
                flex: "0 0 auto",
                minWidth: 64,
                textAlign: "center",
                border: active ? "2px solid var(--color-accent-primary)" : `0.5px solid ${style.border}`,
                background: active ? "var(--color-accent-primary)" : style.bg,
                borderRadius: "var(--border-radius-md)",
                padding: "10px 8px",
                cursor: "pointer",
              }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: active ? "var(--color-accent-contrast)" : style.color }}>
                  {step.display_name}
                </div>
                <div style={{ fontSize: 11, color: active ? "var(--color-accent-contrast)" : "var(--color-text-tertiary)", marginTop: 2 }}>
                  {step.roman}
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 99,
                    padding: "2px 6px",
                    background: active ? "var(--color-accent-soft)" : "var(--color-background-tertiary)",
                    color: active ? "var(--color-accent-strong)" : style.color,
                  }}>
                    {harmonicRoleBadge(step)}
                  </span>
                </div>
                {step.outside_harmony_tones.length > 0 && (
                  <div style={{ fontSize: 10, color: active ? "var(--color-accent-contrast)" : "var(--color-text-tertiary)", marginTop: 5 }}>
                    Couleur: {step.outside_harmony_tones.join(" · ")}
                  </div>
                )}
                <div style={{ marginTop: 7, display: "flex", justifyContent: "center" }}>
                  <span style={{
                    borderRadius: 99,
                    padding: "3px 8px",
                    fontSize: 10,
                    fontWeight: 600,
                    background: active ? "var(--color-accent-soft)" : "var(--color-background-tertiary)",
                    color: active ? "var(--color-accent-strong)" : style.color,
                  }}>
                    {noteValue(duration).symbol} {noteValue(duration).short}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {currentStep && progression.length > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
          padding: "10px 12px",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-primary)",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>
            Durée de {currentStep.display_name}
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {NOTE_VALUES.map((value) => {
              const active = currentDuration === value.id;
              return (
                <button
                  key={value.id}
                  onClick={() => onStepDurationChange(activeStep, value.id)}
                  style={{
                    border: active ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                    background: active ? "var(--color-accent-primary)" : "var(--color-background-secondary)",
                    color: active ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
                    borderRadius: 99,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                  }}
                  title={value.label}
                >
                  {value.symbol} {value.short}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {progression.length > 0 && (
        <div style={{
          position: "sticky",
          top: 66,
          zIndex: 6,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "12px 16px",
          marginBottom: 16,
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={isPlaying ? onStopJam : onStartJam} style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              background: isPlaying ? "var(--color-danger)" : "var(--color-accent-primary)",
              color: "#fff",
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {isPlaying ? "■" : "▶"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>BPM</span>
              <input
                type="number"
                min={40}
                max={200}
                step={1}
                value={bpm}
                onChange={(event) => onBpmChange(Number(event.target.value) || 40)}
                style={{
                  width: 72,
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "7px 8px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px", minWidth: 220 }}>
              <input
                type="range"
                min={40}
                max={200}
                step={1}
                value={bpm}
                onChange={(event) => onBpmChange(Number(event.target.value))}
                style={{ flex: 1 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Tempo</span>
              {NOTE_VALUES.map((value) => (
                <button key={value.id} onClick={() => onTempoUnitChange(value.id)} style={{
                  minWidth: 42,
                  height: 30,
                  border: tempoUnit === value.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                  background: tempoUnit === value.id ? "var(--color-accent-primary)" : "var(--color-background-primary)",
                  color: tempoUnit === value.id ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "0 8px",
                }} title={value.label}>
                  {value.symbol}
                </button>
              ))}
            </div>

            {isPlaying && <BeatDots total={currentPulseTotal} current={currentBeat}/>}

            <button onClick={() => setShowTransportDetails((value) => !value)} style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: showTransportDetails ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
              color: showTransportDetails ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
            }}>
              {showTransportDetails ? "Masquer mix & son" : "Mix & son"}
            </button>
          </div>

          {showTransportDetails && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Clic</span>
                <input type="range" min={0} max={100} step={1} value={Math.round(clickVolume * 100)}
                  onChange={(event) => onClickVolumeChange(Number(event.target.value) / 100)} style={{ flex: 1 }}/>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Guitare</span>
                <input type="range" min={0} max={100} step={1} value={Math.round(guitarVolume * 100)}
                  onChange={(event) => onGuitarVolumeChange(Number(event.target.value) / 100)} style={{ flex: 1 }}/>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Master</span>
                <input type="range" min={0} max={100} step={1} value={Math.round(masterVolume * 100)}
                  onChange={(event) => onMasterVolumeChange(Number(event.target.value) / 100)} style={{ flex: 1 }}/>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Accompagnement</span>
                {ACCOMPANIMENT_TONES.map((tone) => (
                  <button key={tone.id} onClick={() => onAccompanimentToneChange(tone.id)} style={{
                    border: accompanimentTone === tone.id ? "1.5px solid var(--color-warning)" : "0.5px solid var(--color-border-tertiary)",
                    background: accompanimentTone === tone.id ? "var(--color-warning-soft)" : "var(--color-background-primary)",
                    color: accompanimentTone === tone.id ? "var(--color-warning)" : "var(--color-text-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    fontSize: 10,
                    cursor: "pointer",
                    padding: "6px 10px",
                  }} title={tone.detail}>
                    {tone.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Strum</span>
                {STRUM_STYLES.map((style) => (
                  <button key={style.id} onClick={() => onStrumStyleChange(style.id)} style={{
                    border: strumStyle === style.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                    background: strumStyle === style.id ? "var(--color-accent-primary)" : "var(--color-background-primary)",
                    color: strumStyle === style.id ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    fontSize: 10,
                    cursor: "pointer",
                    padding: "6px 10px",
                  }}>
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep && scalePositions.length > 0 && (
        <div>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <ChordDiagram
                chordTones={currentChordTones}
                tuningStrings={selectedTuningStrings}
                label={currentStep.display_name}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {currentStep.display_name} dans {harmonyRootName} {harmonyScaleName}
              </span>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                padding: "9px 10px",
                marginTop: 4,
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                background: "var(--color-background-secondary)",
                maxWidth: 620,
              }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  Temps forts: {strongBeatTargets || "1"} · Fonctions: {chordFunctions || "R"}
                </span>
                <span style={{
                  fontSize: 12,
                  color: guidancePhase === "color" || guidancePhase === "both" ? "var(--color-warning)" : "var(--color-accent-primary)",
                  fontWeight: 600,
                }}>
                  Fais ressortir: {contextualFocusDegrees || "la tonique"}
                </span>
                <span style={{
                  fontSize: 12,
                  color: guidancePhase === "resolve" || guidancePhase === "both" ? "var(--color-accent-primary)" : "var(--color-text-tertiary)",
                  fontWeight: 600,
                }}>
                  Point d'arrivée: {contextualReleaseDegrees || "la tonique"}
                </span>
                {(currentColorTones.length > 0 || currentResolutionNote) && (
                  <span style={{
                    fontSize: 12,
                    color: guidancePhase === "resolve" ? "var(--color-accent-primary)" : guidancePhase === "color" ? "var(--color-warning)" : "var(--color-text-tertiary)",
                    fontWeight: guidancePhase === "idle" ? 400 : 600,
                  }}>
                    {guidancePhaseLabel(guidancePhase)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  Palette: {selectedScale.scale_root} {selectedScale.scale_name}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  Durée: {noteValue(currentDuration).symbol} {noteValue(currentDuration).label} · Tempo: {bpm} à la {noteValue(tempoUnit).label.toLowerCase()} {noteValue(tempoUnit).symbol}
                </span>
                <button onClick={() => setShowTheoryDetails((value) => !value)} style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: showTheoryDetails ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
                  color: showTheoryDetails ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "5px 9px",
                  fontSize: 11,
                  cursor: "pointer",
                }}>
                  {showTheoryDetails ? "Masquer détails" : "Détails théorie"}
                </button>
              </div>
              {showTheoryDetails && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 720 }}>
                  <span style={{ fontSize: 12, color: "var(--color-accent-primary)" }}>
                    Repère modal: {modalCharacteristicDegrees || "aucun"}{selectedScale.guidance ? ` — ${selectedScale.guidance}` : ""}
                  </span>
                  {contextualAdvice && (
                    <span style={{ fontSize: 12, color: "var(--color-accent-primary)" }}>
                      Conseil du moment: {contextualAdvice}
                    </span>
                  )}
                  {modalAvoidDegrees && (
                    <span style={{ fontSize: 12, color: "var(--color-warning)" }}>
                      Évite sur les appuis longs: {modalAvoidDegrees}
                    </span>
                  )}
                  {modalResolutionDegrees && (
                    <span style={{ fontSize: 12, color: "var(--color-accent-primary)" }}>
                      Résolutions modales: {modalResolutionDegrees}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: currentStep.harmonic_role === "diatonic" ? "var(--color-text-tertiary)" : "var(--color-warning)" }}>
                    {harmonicRoleGuidance(currentStep)}
                  </span>
                  {currentColorTones.length > 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-warning)" }}>
                      Notes couleur sur cet accord: {currentColorTones.join(" · ")}
                    </span>
                  )}
                  {currentResolutionNote && (
                    <span style={{ fontSize: 12, color: "var(--color-accent-primary)" }}>
                      Résolution visée sur le manche: {currentResolutionNote}
                      {currentStep.target_step ? ` (${currentStep.target_step})` : ""}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    Passages sûrs dans {selectedScale.scale_root} {selectedScale.scale_name}: {passingDegrees || "aucun"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    Tuning: {selectedTuningName} · {selectedTuningStrings.join(" · ")}
                  </span>
                </div>
              )}
            </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {fretboardPresets.map((preset) => (
                  <button key={preset.id} onClick={() => onDisplayPresetChange(preset.id)} style={{
                    border: displayPreset === preset.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                    background: displayPreset === preset.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                    color: displayPreset === preset.id ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                  }} title={preset.hint}>
                    {preset.label}
                  </button>
                ))}
              </div>
              <button onClick={() => onWindowSizeChange(5)} style={{
                border: windowSize === 5 ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                background: windowSize === 5 ? "var(--color-accent-primary)" : "var(--color-background-primary)",
                color: windowSize === 5 ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                5 frets
              </button>
              <button onClick={() => onWindowSizeChange(12)} style={{
                border: windowSize === 12 ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                background: windowSize === 12 ? "var(--color-accent-primary)" : "var(--color-background-primary)",
                color: windowSize === 12 ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                12 frets
              </button>
              <button onClick={onToggleShowAvoid} style={{
                border: showAvoid ? "1.5px solid var(--color-danger)" : "0.5px solid var(--color-border-tertiary)",
                background: showAvoid ? "var(--color-danger-soft)" : "var(--color-background-primary)",
                color: showAvoid ? "var(--color-danger)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                {showAvoid ? "Avoid on" : "Avoid off"}
              </button>
              {displayPreset !== "focus" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {([
                    { id: "function", label: "Accord" },
                    { id: "degree", label: "Degrés" },
                    { id: "note", label: "Notes" },
                  ] as const).map((mode) => (
                    <button key={mode.id} onClick={() => onLabelModeChange(mode.id)} style={{
                      border: labelMode === mode.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                      background: labelMode === mode.id ? "var(--color-accent-primary)" : "var(--color-background-primary)",
                      color: labelMode === mode.id ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              )}
              {displayPreset !== "focus" && (
                <button onClick={onToggleTabGuide} style={{
                  border: showTabGuide ? "1.5px solid var(--color-success)" : "0.5px solid var(--color-border-tertiary)",
                  background: showTabGuide ? "var(--color-success-soft)" : "var(--color-background-primary)",
                  color: showTabGuide ? "var(--color-success)" : "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                }}>
                  {showTabGuide ? "Tab guide on" : "Tab guide off"}
                </button>
              )}
              {displayPreset !== "focus" && (
                <button onClick={onTogglePhraseGuide} style={{
                  border: showPhraseGuide ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                  background: showPhraseGuide ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                  color: showPhraseGuide ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                }}>
                  {showPhraseGuide ? "Phrase guide on" : "Phrase guide off"}
                </button>
              )}
              <button onClick={onTogglePhraseCue} style={{
                border: playPhraseCue ? "1.5px solid var(--color-warning)" : "0.5px solid var(--color-border-tertiary)",
                background: playPhraseCue ? "var(--color-warning-soft)" : "var(--color-background-primary)",
                color: playPhraseCue ? "var(--color-warning)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                {playPhraseCue ? "Phrase cue on" : "Phrase cue off"}
              </button>
              <button onClick={onToggleFollowChord} style={{
                border: followChord ? "1.5px solid var(--color-success)" : "0.5px solid var(--color-border-tertiary)",
                background: followChord ? "var(--color-success-soft)" : "var(--color-background-primary)",
                color: followChord ? "var(--color-success)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                {followChord ? "Follow chord" : "Lock position"}
              </button>
              {!followChord && (
                <div style={{ display: "flex", gap: 4 }}>
                  {([
                    { id: "auto", label: "Auto box" },
                    { id: "manual", label: "Position fixe" },
                  ] as const).map((mode) => (
                    <button key={mode.id} onClick={() => onPositionModeChange(mode.id)} style={{
                      border: positionMode === mode.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                      background: positionMode === mode.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                      color: positionMode === mode.id ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{
              padding: "6px 10px",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-warning-soft)",
              color: "var(--color-warning)",
              fontSize: 11,
              fontWeight: 500,
            }}>
              {targetBoxLabel} autour de la frette {windowStart + 1}
            </div>
            <div style={{
              padding: "6px 10px",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-tertiary)",
              fontSize: 11,
            }}>
              {followChord
                ? "La box suit l'accord courant"
                : positionMode === "manual"
                  ? `Position fixe autour de la frette ${manualWindowStart + 1}`
                  : "Position CAGED stable pour toute la grille"}
            </div>
            <div style={{
              padding: "6px 10px",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-tertiary)",
              fontSize: 11,
            }}>
              {displayPreset === "focus" ? "Mode focus: lis les formes et vise les zones fortes" : "Vise les carrés orange sur les temps forts"}
            </div>
            {!followChord && positionMode === "manual" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {positionPresets.map((start) => (
                  <button key={start} onClick={() => onManualWindowStartChange(start)} style={{
                    border: manualWindowStart === start ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                    background: manualWindowStart === start ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                    color: manualWindowStart === start ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                    borderRadius: 99,
                    padding: "5px 9px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}>
                    Pos {start + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {displayPreset !== "focus" && (
            <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--color-fretboard-root)" }}/>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Tonique</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-accent-primary)" }}/>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Chord tone</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-success)" }}/>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Scale tone</span>
              </div>
              {displayPreset !== "jam" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--color-fretboard-modal)", background: "transparent" }}/>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Repère modal</span>
                </div>
              )}
              {displayPreset === "advanced" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px dashed var(--color-warning)", background: "transparent" }}/>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Avoid modal</span>
                </div>
              )}
              {currentColorTones.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-fretboard-color)" }}/>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Note couleur</span>
                </div>
              )}
              {currentResolutionNote && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--color-fretboard-resolution)", background: "transparent" }}/>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Resolution</span>
                </div>
              )}
              {showAvoid && displayPreset !== "jam" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-danger)", opacity: 0.5 }}/>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Avoid note</span>
                </div>
              )}
            </div>
          )}

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px 8px",
            background: "var(--color-background-secondary)",
          }}>
            <Fretboard
              scalePositions={scalePositions}
              chordTones={currentChordTones}
              chordQuality={currentStep.quality}
              rootNote={currentRootNote}
              scaleRoot={selectedScale.scale_root}
              modalCharacteristicTones={selectedScale.characteristic_notes}
              modalAvoidTones={selectedScale.modal_avoid_notes}
              modalResolutionTones={selectedScale.resolution_notes}
              nextChordName={nextChordLabel}
              colorTones={currentColorTones}
              resolutionNote={currentResolutionNote}
              currentPulseTotal={currentPulseTotal}
              tempoUnit={tempoUnit}
              phraseGuides={phraseGuides}
              windowStart={windowStart}
              windowSize={windowSize}
              showAvoid={showAvoid}
              flash={flash}
              displayPreset={displayPreset}
              labelMode={labelMode}
              showTabGuide={showTabGuide}
              showPhraseGuide={showPhraseGuide}
              stringLabels={selectedTuningStrings}
            />
          </div>
        </div>
      )}
    </div>
  );
}
