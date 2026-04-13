import { useMemo } from "react";
import { noteValue, type FretPosition, type ProgressionChord, type ScaleSuggestion } from "../music";
import type { PracticePlan, PracticeRepScore, PracticeTarget } from "../practice";
import type { PracticePhase } from "../hooks/usePracticeEngine";
import { Fretboard } from "./Fretboard";

interface PracticeLivePanelProps {
  plan: PracticePlan | null;
  progression: ProgressionChord[];
  phase: PracticePhase;
  isPlaying: boolean;
  selectedScale: ScaleSuggestion | null;
  scalePositions: FretPosition[];
  tuningStrings: string[];
  currentBpm: number;
  currentStepIndex: number;
  currentPulse: number;
  currentPulseTotal: number;
  currentTargets: PracticeTarget[];
  completedCycles: number;
  consecutiveCleanReps: number;
  countInBeat: number;
  midiStatus: string;
  midiInputs: { id: string; name: string; state: MIDIPortDeviceState }[];
  midiError: string | null;
  heardNote: { noteLabel: string; inputName: string; hit: boolean } | null;
  lastRepScore: PracticeRepScore | null;
  repHistory: Array<{ cycle: number; bpm: number; score: PracticeRepScore }>;
  cueEnabled: boolean;
  onToggleCue: () => void;
  onReplayCue: () => void;
  onStartPractice: () => void;
  onStopPractice: () => void;
}

function phaseLabel(phase: PracticePhase) {
  switch (phase) {
    case "count_in":
      return "Count-in";
    case "running":
      return "Live";
    default:
      return "Setup";
  }
}

function midiStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "MIDI prêt";
    case "connecting":
      return "Connexion MIDI…";
    case "unsupported":
      return "Web MIDI indisponible";
    case "error":
      return "Erreur MIDI";
    default:
      return "MIDI inactif";
  }
}

function humanizeRole(role: string) {
  return role.replaceAll("_", " ");
}

function isResolutionRole(role: string) {
  return role === "resolution" || role === "phrase_answer";
}

function uniquePitchClasses(targets: PracticeTarget[]) {
  return Array.from(new Set(targets.flatMap((target) => target.pitch_classes)));
}

function parseMissedTarget(line: string | undefined) {
  if (!line) return null;
  const match = /^Missed ([a-z_]+) on (.+) pulse (\d+) \(expected (.+)\)\.$/.exec(line);
  if (!match) return null;

  return {
    role: humanizeRole(match[1]),
    chord: match[2],
    pulse: Number(match[3]),
    expected: match[4],
  };
}

function weakestArea(score: PracticeRepScore | null) {
  if (!score) return null;

  const areas = [
    {
      id: "pitch",
      label: "justesse",
      score: score.pitch_score,
      advice: "Ralentis et verrouille une seule cible jusqu'à la jouer juste à chaque cycle.",
    },
    {
      id: "timing",
      label: "placement",
      score: score.timing_score,
      advice: "Reste sur peu de notes et cale-les exactement sur le pulse avant d'en ajouter.",
    },
    {
      id: "targets",
      label: "cibles",
      score: score.target_score,
      advice: "Anticipe l'accord en cours et vise d'abord la cible affichée avant de remplir la phrase.",
    },
    {
      id: "resolution",
      label: "résolution",
      score: score.resolution_score,
      advice: "Laisse la tension respirer puis retombe clairement sur la note de résolution indiquée.",
    },
  ];

  return areas.sort((left, right) => left.score - right.score)[0] ?? null;
}

export function PracticeLivePanel({
  plan,
  progression,
  phase,
  isPlaying,
  selectedScale,
  scalePositions,
  tuningStrings,
  currentBpm,
  currentStepIndex,
  currentPulse,
  currentPulseTotal,
  currentTargets,
  completedCycles,
  consecutiveCleanReps,
  countInBeat,
  midiStatus,
  midiInputs,
  midiError,
  heardNote,
  lastRepScore,
  repHistory,
  cueEnabled,
  onToggleCue,
  onReplayCue,
  onStartPractice,
  onStopPractice,
}: PracticeLivePanelProps) {
  const currentChord = progression[currentStepIndex] ?? null;
  const nextChord = progression[(currentStepIndex + 1) % Math.max(1, progression.length)] ?? currentChord;
  const canStart = Boolean(plan) && progression.length > 0 && midiStatus === "ready" && midiInputs.length > 0;
  const displayedBpm = currentBpm || plan?.start_bpm || 0;
  const latestRepLabelColor = !lastRepScore
    ? "var(--color-text-primary)"
    : lastRepScore.clean_rep
      ? "#0F6E56"
      : "#9A3F1D";
  const fallbackTargets = useMemo(
    () => (plan ? plan.targets.filter((target) => target.step_index === currentStepIndex && target.pulse_index === 0) : []),
    [currentStepIndex, plan],
  );
  const focusTargets = currentTargets.length > 0 ? currentTargets : fallbackTargets;
  const highlightedPitchClasses = useMemo(() => uniquePitchClasses(focusTargets), [focusTargets]);
  const nextResolutionTarget = useMemo(() => {
    if (!plan) return null;

    return plan.targets.find((target) =>
      (target.step_index > currentStepIndex
        || (target.step_index === currentStepIndex && target.pulse_index >= currentPulse))
      && isResolutionRole(target.role)
    ) ?? plan.targets.find((target) => isResolutionRole(target.role)) ?? null;
  }, [currentPulse, currentStepIndex, plan]);
  const sanitizedScalePositions = useMemo(() => {
    const resolutionPitchClasses = new Set(nextResolutionTarget?.pitch_classes ?? []);
    return scalePositions.map((position) => ({
      ...position,
      is_characteristic: false,
      is_modal_avoid: false,
      is_resolution: resolutionPitchClasses.has(position.note),
    }));
  }, [nextResolutionTarget, scalePositions]);
  const practiceWindowSize = plan?.window_size ?? 5;
  const practiceWindowStart = (() => {
    const maxWindowStart = Math.max(0, 24 - practiceWindowSize);
    if (plan?.position_start != null) {
      return Math.min(maxWindowStart, Math.max(0, plan.position_start));
    }

    const highlightedSet = new Set([
      ...highlightedPitchClasses,
      ...(nextResolutionTarget?.pitch_classes ?? []),
    ]);
    const highlightedFrets = sanitizedScalePositions
      .filter((position) => highlightedSet.has(position.note) && !position.is_avoid && position.fret > 0)
      .map((position) => position.fret);
    if (highlightedFrets.length > 0) {
      return Math.min(maxWindowStart, Math.max(0, Math.min(...highlightedFrets) - 1));
    }

    const chordFrets = sanitizedScalePositions
      .filter((position) => currentChord?.chord_tones.includes(position.note) && !position.is_avoid && position.fret > 0)
      .map((position) => position.fret);
    if (chordFrets.length > 0) {
      return Math.min(maxWindowStart, Math.max(0, Math.min(...chordFrets) - 1));
    }

    return 0;
  })();
  const missedTarget = useMemo(
    () => parseMissedTarget(lastRepScore?.feedback.find((line) => line.startsWith("Missed "))),
    [lastRepScore],
  );
  const weakest = useMemo(() => weakestArea(lastRepScore), [lastRepScore]);
  const focusTarget = focusTargets[0] ?? null;
  const paletteLabel = selectedScale
    ? `${selectedScale.scale_root} ${selectedScale.scale_name}`
    : (plan ? `${plan.solo_scale_root} ${plan.solo_scale_name}` : "—");

  return (
    <div style={{
      padding: 14,
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      background: "var(--color-background-primary)",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
            Practice live
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}>
              {phaseLabel(phase)}
            </span>
            <span style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 999,
              background: phase === "running" ? "#E1F5EE" : phase === "count_in" ? "#FFF2DA" : "#EEEDFE",
              color: phase === "running" ? "#0F6E56" : phase === "count_in" ? "#6D4600" : "#3C3489",
            }}>
              {midiStatusLabel(midiStatus)}
            </span>
          </div>
          {plan && (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
              {plan.exercise_name} · {displayedBpm} BPM · {plan.tempo_unit}
            </div>
          )}
          {plan && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "#EEEDFE", color: "#3C3489", fontWeight: 600 }}>
                {plan.category}
              </span>
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "#E6F1FB", color: "#185FA5", fontWeight: 600 }}>
                {plan.goal}
              </span>
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "#E1F5EE", color: "#0F6E56", fontWeight: 600 }}>
                {plan.target_strategy}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onToggleCue}
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: cueEnabled ? "#EEEDFE" : "var(--color-background-primary)",
              color: cueEnabled ? "#3C3489" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cue {cueEnabled ? "on" : "off"}
          </button>
          <button
            onClick={onReplayCue}
            disabled={!currentTargets.length}
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: currentTargets.length ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: currentTargets.length ? "pointer" : "default",
              opacity: currentTargets.length ? 1 : 0.55,
            }}
          >
            Replay cue
          </button>
          {isPlaying ? (
            <button
              onClick={onStopPractice}
              style={{
                border: "1px solid #C84A21",
                background: "#FBEDE8",
                color: "#9A3F1D",
                borderRadius: "var(--border-radius-md)",
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Stop workout
            </button>
          ) : (
            <button
              onClick={onStartPractice}
              disabled={!canStart}
              style={{
                border: "1px solid #534AB7",
                background: !canStart ? "#E9E9EE" : "#534AB7",
                color: !canStart ? "#7A7A86" : "#EEEDFE",
                borderRadius: "var(--border-radius-md)",
                padding: "8px 12px",
              fontSize: 11,
              fontWeight: 700,
              cursor: !canStart ? "default" : "pointer",
            }}
          >
            Start workout
            </button>
          )}
        </div>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        padding: "10px 12px",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        background: "var(--color-background-secondary)",
      }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Progression — {progression.map((step) => step.display_name).join(" · ") || "—"}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Solo palette — {paletteLabel}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          Box {practiceWindowStart + 1}–{practiceWindowStart + practiceWindowSize} · {tuningStrings.join(" · ")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {progression.map((step, index) => {
          const active = index === currentStepIndex && phase === "running";
          const hasTarget = focusTargets.some((target) => target.step_index === index);
          const duration = noteValue(plan?.step_durations[index] ?? "quarter");

          return (
            <div
              key={`${step.roman}-${index}`}
              style={{
                minWidth: 124,
                border: active ? "2px solid #534AB7" : hasTarget ? "1.5px solid #185FA5" : "0.5px solid var(--color-border-tertiary)",
                background: active ? "#534AB7" : hasTarget ? "#E6F1FB" : "var(--color-background-secondary)",
                color: active ? "#EEEDFE" : hasTarget ? "#185FA5" : "var(--color-text-primary)",
                borderRadius: "var(--border-radius-md)",
                padding: "10px 11px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 10, color: active ? "#D8D3FF" : "var(--color-text-tertiary)" }}>
                  {step.roman}
                </div>
                <span style={{
                  borderRadius: 999,
                  padding: "2px 6px",
                  fontSize: 9,
                  fontWeight: 700,
                  background: active ? "#EEEDFE" : "rgba(255,255,255,0.7)",
                  color: active ? "#3C3489" : hasTarget ? "#185FA5" : "var(--color-text-secondary)",
                }}>
                  {duration.symbol} {duration.short}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 5 }}>
                {step.display_name}
              </div>
              <div style={{ fontSize: 10, color: active ? "#D8D3FF" : "var(--color-text-tertiary)", marginTop: 5 }}>
                {step.chord_tones.join(" · ")}
              </div>
              {hasTarget && (
                <div style={{ fontSize: 10, color: active ? "#EEEDFE" : "#185FA5", marginTop: 6, fontWeight: 600 }}>
                  Target maintenant
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(250px, 320px) 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Focus now
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
              {focusTarget ? focusTarget.chord_name : (currentChord?.display_name ?? "—")}
            </div>
            <div style={{ fontSize: 12, color: "#3C3489", marginTop: 6, fontWeight: 600 }}>
              {focusTarget
                ? `${humanizeRole(focusTarget.role)} · ${focusTarget.pitch_classes.join(" · ")}`
                : "Prépare la première cible du cycle."}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
              {focusTarget?.description ?? "Le manche te montre la box active, les ancrages d'accord et la cible du moment."}
            </div>
            {nextResolutionTarget && (
              <div style={{ fontSize: 11, color: "#185FA5", marginTop: 8 }}>
                Prochaine résolution: {nextResolutionTarget.chord_name} · {nextResolutionTarget.pitch_classes.join(" · ")}
              </div>
            )}
          </div>

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            background: "var(--color-background-secondary)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Corrige maintenant
            </div>
            {weakest ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: latestRepLabelColor, marginTop: 6 }}>
                  {weakest.label} · {weakest.score}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                  {weakest.advice}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                Lance une rep pour obtenir un retour ciblé.
              </div>
            )}
            {missedTarget && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#9A3F1D" }}>
                Cible manquée: {missedTarget.chord} · pulse {missedTarget.pulse} · {missedTarget.role} · attendu {missedTarget.expected}
              </div>
            )}
          </div>
        </div>

        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                Practice fretboard
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 3 }}>
                Box {practiceWindowStart + 1}–{practiceWindowStart + practiceWindowSize} · {currentChord?.display_name ?? "—"}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              `R` tonique · `●` accord · `+` cible · anneau bleu résolution
            </div>
          </div>

          <Fretboard
            scalePositions={sanitizedScalePositions}
            chordTones={currentChord?.chord_tones ?? []}
            chordQuality={currentChord?.quality ?? ""}
            rootNote={currentChord?.chord_tones[0] ?? ""}
            scaleRoot={selectedScale?.scale_root ?? plan?.solo_scale_root ?? "C"}
            modalCharacteristicTones={[]}
            modalAvoidTones={[]}
            modalResolutionTones={[]}
            nextChordName={nextChord?.display_name ?? ""}
            colorTones={highlightedPitchClasses}
            resolutionNote={nextResolutionTarget?.pitch_classes[0] ?? ""}
            currentPulseTotal={Math.max(1, currentPulseTotal || focusTarget?.pulse_total || 4)}
            tempoUnit={plan?.tempo_unit ?? "quarter"}
            phraseGuides={[]}
            windowStart={practiceWindowStart}
            windowSize={practiceWindowSize}
            showAvoid={false}
            flash={false}
            displayPreset="focus"
            labelMode="function"
            showTabGuide={false}
            showPhraseGuide={false}
            stringLabels={tuningStrings}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 12 }}>
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Maintenant
          </div>
          {phase === "count_in" ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#6D4600", marginTop: 6 }}>
                {countInBeat}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                Rentre sur le prochain downbeat.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
                {currentChord?.display_name ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                Pulse {currentPulseTotal > 0 ? currentPulse + 1 : 0}/{currentPulseTotal} · cycle {completedCycles + 1}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8 }}>
                {currentTargets.length > 0 ? currentTargets[0].description : "Attends le prochain repère."}
              </div>
            </>
          )}
        </div>

        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Cibles actives
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {currentTargets.length > 0 ? currentTargets.map((target, index) => (
              <div
                key={`${target.step_index}-${target.role}-${index}`}
                style={{
                  padding: "7px 9px",
                  borderRadius: "var(--border-radius-md)",
                  background: "#EEEDFE",
                  color: "#3C3489",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {target.pitch_classes.join(" · ")}
              </div>
            )) : (
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                Aucune cible sur ce pulse.
              </div>
            )}
          </div>
        </div>

        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Retour MIDI
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: heardNote ? (heardNote.hit ? "#0F6E56" : "#9A3F1D") : "var(--color-text-primary)", marginTop: 6 }}>
            {heardNote?.noteLabel ?? "—"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            {heardNote
              ? `${heardNote.hit ? "Target hit" : "Hors cible"} · ${heardNote.inputName}`
              : midiInputs.length > 0
                ? midiInputs.map((input) => input.name).join(" · ")
                : "Aucune entrée MIDI détectée"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Tempo ladder
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
            {displayedBpm}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
            cible {plan?.target_bpm ?? "—"} · +{plan?.bpm_step ?? 0}
          </div>
        </div>

        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Streak propre
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>
            {consecutiveCleanReps}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
            sur {plan?.reps_per_level ?? "—"} reps avant montée
          </div>
        </div>

        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Dernière rep
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: latestRepLabelColor, marginTop: 6 }}>
            {lastRepScore ? `${lastRepScore.total_score}%` : "—"}
          </div>
          <div style={{ fontSize: 11, color: latestRepLabelColor, marginTop: 4 }}>
            {lastRepScore ? (lastRepScore.clean_rep ? "clean rep" : "à resserrer") : "En attente du premier cycle"}
          </div>
          {lastRepScore && (
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 6 }}>
              pitch {lastRepScore.pitch_score} · timing {lastRepScore.timing_score} · targets {lastRepScore.target_score}
            </div>
          )}
        </div>

        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Historique court
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {repHistory.length > 0 ? repHistory.slice(-4).map((entry) => (
              <div
                key={`${entry.cycle}-${entry.bpm}`}
                style={{
                  padding: "6px 8px",
                  borderRadius: "var(--border-radius-md)",
                  background: entry.score.clean_rep ? "#E1F5EE" : "#FAECE7",
                  color: entry.score.clean_rep ? "#0F6E56" : "#993C1D",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                C{entry.cycle} · {entry.score.total_score}
              </div>
            )) : (
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Les scores de rep apparaissent ici.
              </div>
            )}
          </div>
        </div>
      </div>

      {lastRepScore?.feedback.length ? (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 12px",
          background: "var(--color-background-secondary)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
            Feedback
          </div>
          {lastRepScore.feedback.slice(0, 3).map((line) => (
            <div key={line} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {midiError && (
        <div style={{
          border: "0.5px solid #F5C4B3",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 12px",
          background: "#FAECE7",
          color: "#993C1D",
          fontSize: 12,
        }}>
          {midiError}
        </div>
      )}
      {!midiError && plan && progression.length === 0 && (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 12px",
          background: "var(--color-background-secondary)",
          color: "var(--color-text-secondary)",
          fontSize: 12,
        }}>
          La progression du workout est en cours de construction.
        </div>
      )}
    </div>
  );
}
