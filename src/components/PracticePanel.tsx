import type { ReactNode } from "react";
import type { FretPosition, NoteValueId, ProgressionChord, ScaleSuggestion } from "../music";
import type {
  PracticeExercise,
  PracticeInputModeId,
  PracticePlan,
  PracticeRepScore,
  PracticeSessionSummary,
} from "../practice";
import type { PracticePhase } from "../hooks/usePracticeEngine";
import { usePersistentState } from "../hooks/usePersistentState";
import { PracticeHistoryPanel } from "./PracticeHistoryPanel";
import { PracticeLivePanel } from "./PracticeLivePanel";
import { PracticeResultsPanel } from "./PracticeResultsPanel";

interface PracticePanelProps {
  harmonyRootName: string;
  harmonyScaleName: string;
  selectedScale: ScaleSuggestion | null;
  selectedTuningName: string;
  selectedTuningStrings: string[];
  scalePositions: FretPosition[];
  activeSteps: string[];
  library: PracticeExercise[];
  activeExercise: PracticeExercise | null;
  plan: PracticePlan | null;
  progressionPreview: ProgressionChord[];
  loading: boolean;
  error: string | null;
  progressionSource: "current" | "exercise";
  tempoUnit: NoteValueId;
  startBpm: number;
  targetBpm: number;
  bpmStep: number;
  repsPerLevel: number;
  countInBars: number;
  inputMode: PracticeInputModeId;
  windowSize: number;
  livePhase: PracticePhase;
  livePlaying: boolean;
  liveCurrentBpm: number;
  liveCurrentStepIndex: number;
  liveCurrentPulse: number;
  liveCurrentPulseTotal: number;
  liveCurrentTargets: PracticePlan["targets"];
  liveCompletedCycles: number;
  liveConsecutiveCleanReps: number;
  liveCountInBeat: number;
  liveMidiStatus: string;
  liveMidiInputs: { id: string; name: string; state: MIDIPortDeviceState }[];
  liveMidiError: string | null;
  liveHeardNote: { noteLabel: string; inputName: string; hit: boolean } | null;
  liveLastRepScore: PracticeRepScore | null;
  liveRepHistory: Array<{ cycle: number; bpm: number; score: PracticeRepScore }>;
  liveLastSessionSummary: PracticeSessionSummary | null;
  liveSessionHistory: PracticeSessionSummary[];
  cueEnabled: boolean;
  noteValues: { id: NoteValueId; label: string; short: string; symbol: string }[];
  onSelectExerciseId: (exerciseId: string) => void;
  onProgressionSourceChange: (source: "current" | "exercise") => void;
  onTempoUnitChange: (value: NoteValueId) => void;
  onStartBpmChange: (value: number) => void;
  onTargetBpmChange: (value: number) => void;
  onBpmStepChange: (value: number) => void;
  onRepsPerLevelChange: (value: number) => void;
  onCountInBarsChange: (value: number) => void;
  onInputModeChange: (value: PracticeInputModeId) => void;
  onWindowSizeChange: (value: number) => void;
  onToggleCue: () => void;
  onReplayCue: () => void;
  onStartPractice: () => void;
  onStopPractice: () => void;
  onClearPracticeHistory: () => void;
}

function numberInput(
  value: number,
  min: number,
  max: number,
  onChange: (value: number) => void,
) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        width: "100%",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "8px 10px",
        fontSize: 12,
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
      }}
    />
  );
}

interface SecondarySectionProps {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function SecondarySection({ title, summary, open, onToggle, children }: SecondarySectionProps) {
  return (
    <div style={{
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      background: "var(--color-background-primary)",
      overflow: "hidden",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{title}</div>
          <div style={{
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {summary}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          flexShrink: 0,
        }}>
          {open ? "Masquer" : "Voir"}
        </div>
      </button>

      {open && (
        <div style={{
          borderTop: "0.5px solid var(--color-border-tertiary)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function PracticePanel({
  harmonyRootName,
  harmonyScaleName,
  selectedScale,
  selectedTuningName,
  selectedTuningStrings,
  scalePositions,
  activeSteps,
  library,
  activeExercise,
  plan,
  progressionPreview,
  loading,
  error,
  progressionSource,
  tempoUnit,
  startBpm,
  targetBpm,
  bpmStep,
  repsPerLevel,
  countInBars,
  inputMode,
  windowSize,
  livePhase,
  livePlaying,
  liveCurrentBpm,
  liveCurrentStepIndex,
  liveCurrentPulse,
  liveCurrentPulseTotal,
  liveCurrentTargets,
  liveCompletedCycles,
  liveConsecutiveCleanReps,
  liveCountInBeat,
  liveMidiStatus,
  liveMidiInputs,
  liveMidiError,
  liveHeardNote,
  liveLastRepScore,
  liveRepHistory,
  liveLastSessionSummary,
  liveSessionHistory,
  cueEnabled,
  noteValues,
  onSelectExerciseId,
  onProgressionSourceChange,
  onTempoUnitChange,
  onStartBpmChange,
  onTargetBpmChange,
  onBpmStepChange,
  onRepsPerLevelChange,
  onCountInBarsChange,
  onInputModeChange,
  onWindowSizeChange,
  onToggleCue,
  onReplayCue,
  onStartPractice,
  onStopPractice,
  onClearPracticeHistory,
}: PracticePanelProps) {
  const [showSessionPanels, setShowSessionPanels] = usePersistentState("harmonia.practice.show-session-panels", false);
  const [showPlanPanels, setShowPlanPanels] = usePersistentState("harmonia.practice.show-plan-panels", false);

  const sessionSummaryText = liveLastSessionSummary
    ? `Dernière session ${liveLastSessionSummary.average_total_score}/100 · clean ${liveLastSessionSummary.best_clean_bpm ?? "—"} BPM · ${liveSessionHistory.length} session${liveSessionHistory.length > 1 ? "s" : ""}`
    : liveSessionHistory.length > 0
      ? `${liveSessionHistory.length} session${liveSessionHistory.length > 1 ? "s" : ""} enregistrée${liveSessionHistory.length > 1 ? "s" : ""}`
      : "Aucune session terminée";

  const planSummaryText = plan
    ? `${plan.targets.length} repères · ${plan.start_bpm}→${plan.target_bpm} BPM · box ${plan.window_size} frettes`
    : loading
      ? "Calcul du plan en cours…"
      : activeExercise
        ? `Exercice ${activeExercise.name} prêt à configurer`
        : "Choisis un exercice pour générer le plan";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "start" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        background: "var(--color-background-primary)",
      }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6 }}>
            Practice setup
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Workout
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Harmonie {harmonyRootName} {harmonyScaleName} · palette solo {selectedScale?.scale_root ?? harmonyRootName} {selectedScale?.scale_name ?? harmonyScaleName}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
            Accordage {selectedTuningName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {library.map((exercise) => {
            const selected = exercise.id === activeExercise?.id;
            return (
              <button
                key={exercise.id}
                onClick={() => onSelectExerciseId(exercise.id)}
                style={{
                  textAlign: "left",
                  border: selected ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                  background: selected ? "#EEEDFE" : "var(--color-background-primary)",
                  color: selected ? "#3C3489" : "var(--color-text-primary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "10px 11px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{exercise.name}</div>
                <div style={{ fontSize: 11, color: selected ? "#534AB7" : "var(--color-text-tertiary)", marginTop: 4 }}>
                  {exercise.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PracticeLivePanel
          plan={plan}
          progression={progressionPreview}
          phase={livePhase}
          isPlaying={livePlaying}
          selectedScale={selectedScale}
          scalePositions={scalePositions}
          tuningStrings={selectedTuningStrings}
          currentBpm={liveCurrentBpm}
          currentStepIndex={liveCurrentStepIndex}
          currentPulse={liveCurrentPulse}
          currentPulseTotal={liveCurrentPulseTotal}
          currentTargets={liveCurrentTargets}
          completedCycles={liveCompletedCycles}
          consecutiveCleanReps={liveConsecutiveCleanReps}
          countInBeat={liveCountInBeat}
          midiStatus={liveMidiStatus}
          midiInputs={liveMidiInputs}
          midiError={liveMidiError}
          heardNote={liveHeardNote}
          lastRepScore={liveLastRepScore}
          repHistory={liveRepHistory}
          cueEnabled={cueEnabled}
          onToggleCue={onToggleCue}
          onReplayCue={onReplayCue}
          onStartPractice={onStartPractice}
          onStopPractice={onStopPractice}
        />

        <SecondarySection
          title="Session & scores"
          summary={sessionSummaryText}
          open={showSessionPanels}
          onToggle={() => setShowSessionPanels((value) => !value)}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <PracticeResultsPanel summary={liveLastSessionSummary} />
            <PracticeHistoryPanel history={liveSessionHistory} onClear={onClearPracticeHistory} />
          </div>
        </SecondarySection>

        <SecondarySection
          title="Réglages & plan"
          summary={planSummaryText}
          open={showPlanPanels}
          onToggle={() => setShowPlanPanels((value) => !value)}
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Progression
              <select
                value={progressionSource}
                onChange={(event) => onProgressionSourceChange(event.target.value as "current" | "exercise")}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              >
                <option value="current">Utiliser la grille courante</option>
                <option value="exercise">Utiliser le preset exo</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Unité
              <select
                value={tempoUnit}
                onChange={(event) => onTempoUnitChange(event.target.value as NoteValueId)}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              >
                {noteValues.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Input live
              <select
                value={inputMode === "midi" ? "midi" : "midi"}
                onChange={(event) => onInputModeChange(event.target.value as PracticeInputModeId)}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              >
                <option value="midi">MIDI</option>
              </select>
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                Le live workout est MIDI-only pour l'instant.
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Box
              {numberInput(windowSize, 4, 12, onWindowSizeChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Tempo départ
              {numberInput(startBpm, 40, 220, onStartBpmChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Tempo cible
              {numberInput(targetBpm, 40, 260, onTargetBpmChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Palier BPM
              {numberInput(bpmStep, 1, 20, onBpmStepChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Reps propres
              {numberInput(repsPerLevel, 1, 16, onRepsPerLevelChange)}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Count-in
              {numberInput(countInBars, 0, 8, onCountInBarsChange)}
            </label>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 16,
          }}>
            <div style={{
              padding: 14,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              background: "var(--color-background-primary)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Plan généré</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {plan?.exercise_name ?? activeExercise?.name ?? "Chargement…"}
                  </div>
                </div>
                {loading && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Calcul…</div>}
              </div>

              {error && (
                <div style={{ fontSize: 12, color: "#993C1D" }}>
                  {error}
                </div>
              )}

              {plan && (
                <>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {plan.exercise_description}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "#EEEDFE", color: "#3C3489" }}>
                      {plan.category}
                    </span>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "#E6F1FB", color: "#185FA5" }}>
                      {plan.goal}
                    </span>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "#E1F5EE", color: "#0F6E56" }}>
                      {plan.target_strategy}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Progression</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 4 }}>
                        {plan.progression_steps.join(" · ")}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Durées</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 4 }}>
                        {plan.step_durations.join(" · ")}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Tempo ladder</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 4 }}>
                        {plan.start_bpm} → {plan.target_bpm} (+{plan.bpm_step})
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    Source de grille: {progressionSource === "current" && activeSteps.length > 0 ? "grille courante" : "preset de l'exercice"}
                  </div>
                </>
              )}
            </div>

            <div style={{
              padding: 14,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              background: "var(--color-background-primary)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Targets</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {plan?.targets.length ?? 0} repères
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
                {plan?.targets.map((target, index) => (
                  <div
                    key={`${target.step_index}-${target.role}-${index}`}
                    style={{
                      border: "0.5px solid var(--color-border-tertiary)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "10px 11px",
                      background: "var(--color-background-secondary)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {target.chord_name} · {target.role}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                        pulse {target.pulse_index + 1}/{target.pulse_total}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#534AB7", marginTop: 4 }}>
                      {target.pitch_classes.join(" · ")} · poids {target.weight}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      {target.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SecondarySection>
      </div>
    </div>
  );
}
