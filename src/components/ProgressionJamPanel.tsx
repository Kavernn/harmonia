import { Fretboard } from "./Fretboard";
import {
  NOTE_VALUES,
  ROMAN,
  STRUM_STYLES,
  noteValue,
  type FretPosition,
  type NamedProgression,
  type NoteValueId,
  type ProgressionChord,
  type ScaleSuggestion,
  type StrumStyleId,
} from "../music";

function BeatDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }, (_, index) => (
        <div key={index} style={{
          width: index === current ? 12 : 8,
          height: index === current ? 12 : 8,
          borderRadius: "50%",
          background: index === current ? "#534AB7" : "var(--color-border-secondary)",
          transition: "all 0.05s ease",
        }}/>
      ))}
    </div>
  );
}

const QUALITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  major: { bg: "#E6F1FB", color: "#185FA5", border: "#B5D4F4" },
  minor: { bg: "#EAF3DE", color: "#3B6D11", border: "#C0DD97" },
  diminished: { bg: "#FAECE7", color: "#993C1D", border: "#F5C4B3" },
  indeterminate: {
    bg: "var(--color-background-secondary)",
    color: "var(--color-text-secondary)",
    border: "var(--color-border-tertiary)",
  },
};

function qualityStyle(quality: string) {
  return QUALITY_STYLE[quality] ?? QUALITY_STYLE.indeterminate;
}

interface ProgressionJamPanelProps {
  selectedScale: ScaleSuggestion;
  namedProgs: NamedProgression[];
  tab: "suggest" | "build";
  activeDegrees: number[];
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
  scalePositions: FretPosition[];
  windowStart: number;
  windowSize: number;
  showAvoid: boolean;
  flash: boolean;
  followChord: boolean;
  selectedTuningName: string;
  selectedTuningStrings: string[];
  onTabChange: (tab: "suggest" | "build") => void;
  onSelectNamedProgression: (degrees: number[]) => void;
  onToggleDegree: (degree: number) => void;
  onClearDegrees: () => void;
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
  onWindowSizeChange: (size: number) => void;
  onToggleShowAvoid: () => void;
  onToggleFollowChord: () => void;
}

export function ProgressionJamPanel({
  selectedScale,
  namedProgs,
  tab,
  activeDegrees,
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
  scalePositions,
  windowStart,
  windowSize,
  showAvoid,
  flash,
  followChord,
  selectedTuningName,
  selectedTuningStrings,
  onTabChange,
  onSelectNamedProgression,
  onToggleDegree,
  onClearDegrees,
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
  onWindowSizeChange,
  onToggleShowAvoid,
  onToggleFollowChord,
}: ProgressionJamPanelProps) {
  const currentStep = progression[activeStep];
  const currentChordTones = currentStep?.chord_tones ?? [];
  const currentRootNote = currentChordTones[0] ?? "";
  const currentDuration = stepDurations[activeStep] ?? "quarter";
  const targetBoxLabel = windowSize === 5 ? "Jam box" : "Full neck";

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12 }}>
        Progression — {selectedScale.scale_root} {selectedScale.scale_name}
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
            const active = JSON.stringify(activeDegrees) === JSON.stringify(progressionOption.degrees);
            return (
              <button key={index} onClick={() => onSelectNamedProgression(progressionOption.degrees)} style={{
                border: active ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: active ? "#EEEDFE" : "var(--color-background-primary)",
                borderRadius: "var(--border-radius-md)",
                padding: "7px 12px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: active ? "#3C3489" : "var(--color-text-primary)" }}>
                  {progressionOption.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{progressionOption.feel}</span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "build" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>Click degrees to add</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {ROMAN.map((roman, index) => {
              const inProgression = activeDegrees.includes(index);
              return (
                <button key={index} onClick={() => onToggleDegree(index)} style={{
                  border: inProgression ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                  background: inProgression ? "#534AB7" : "var(--color-background-primary)",
                  color: inProgression ? "#EEEDFE" : "var(--color-text-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 500,
                }}>
                  {roman}
                </button>
              );
            })}
          </div>
          <button onClick={onClearDegrees} style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: "transparent",
            color: "var(--color-text-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "4px 10px",
            fontSize: 11,
            cursor: "pointer",
          }}>
            Clear
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
                border: active ? "2px solid #534AB7" : `0.5px solid ${style.border}`,
                background: active ? "#534AB7" : style.bg,
                borderRadius: "var(--border-radius-md)",
                padding: "10px 8px",
                cursor: "pointer",
              }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: active ? "#EEEDFE" : style.color }}>
                  {step.display_name}
                </div>
                <div style={{ fontSize: 10, color: active ? "#AFA9EC" : "var(--color-text-tertiary)", marginTop: 2 }}>
                  {step.roman}
                </div>
                <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
                  {NOTE_VALUES.map((value) => (
                    <button
                      key={value.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onStepDurationChange(index, value.id);
                      }}
                      style={{
                        border: duration === value.id ? "1px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                        background: duration === value.id ? (active ? "#EEEDFE" : "#F6F3FF") : "transparent",
                        color: duration === value.id ? "#3C3489" : "var(--color-text-tertiary)",
                        borderRadius: 99,
                        padding: "2px 6px",
                        fontSize: 9,
                        cursor: "pointer",
                      }}
                      title={value.label}
                    >
                      {value.symbol}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {progression.length > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 16px",
          marginBottom: 16,
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
          flexWrap: "wrap",
        }}>
          <button onClick={isPlaying ? onStopJam : onStartJam} style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: isPlaying ? "#993C1D" : "#534AB7",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            {isPlaying ? "■" : "▶"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>BPM</span>
            <input type="range" min={40} max={200} step={1} value={bpm}
              onChange={(event) => onBpmChange(Number(event.target.value))} style={{ flex: 1 }}/>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", minWidth: 28, textAlign: "right" }}>{bpm}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Tempo sur</span>
            {NOTE_VALUES.map((value) => (
              <button key={value.id} onClick={() => onTempoUnitChange(value.id)} style={{
                minWidth: 44,
                height: 28,
                border: tempoUnit === value.id ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: tempoUnit === value.id ? "#534AB7" : "var(--color-background-primary)",
                color: tempoUnit === value.id ? "#EEEDFE" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                fontSize: 15,
                cursor: "pointer",
                padding: "0 8px",
              }} title={value.label}>
                {value.symbol}
              </button>
            ))}
          </div>

          {isPlaying && <BeatDots total={currentPulseTotal} current={currentBeat}/>}

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Clic</span>
            <input type="range" min={0} max={100} step={1} value={Math.round(clickVolume * 100)}
              onChange={(event) => onClickVolumeChange(Number(event.target.value) / 100)} style={{ flex: 1 }}/>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Guitare</span>
            <input type="range" min={0} max={100} step={1} value={Math.round(guitarVolume * 100)}
              onChange={(event) => onGuitarVolumeChange(Number(event.target.value) / 100)} style={{ flex: 1 }}/>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Master</span>
            <input type="range" min={0} max={100} step={1} value={Math.round(masterVolume * 100)}
              onChange={(event) => onMasterVolumeChange(Number(event.target.value) / 100)} style={{ flex: 1 }}/>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Strum</span>
            {STRUM_STYLES.map((style) => (
              <button key={style.id} onClick={() => onStrumStyleChange(style.id)} style={{
                border: strumStyle === style.id ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: strumStyle === style.id ? "#534AB7" : "var(--color-background-primary)",
                color: strumStyle === style.id ? "#EEEDFE" : "var(--color-text-secondary)",
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

      {currentStep && scalePositions.length > 0 && (
        <div>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {currentStep.display_name} in {selectedScale.scale_root} {selectedScale.scale_name}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Cible: {currentRootNote || "?"} en tonique, puis {currentStep.chord_tones.slice(1).join(" · ")}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Notes de gamme: {currentStep.scale_tones.join(" · ")}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Durée: {noteValue(currentDuration).symbol} {noteValue(currentDuration).label} · Tempo: {bpm} à la {noteValue(tempoUnit).label.toLowerCase()} {noteValue(tempoUnit).symbol}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Tuning: {selectedTuningName} · {selectedTuningStrings.join(" · ")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => onWindowSizeChange(5)} style={{
                border: windowSize === 5 ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: windowSize === 5 ? "#534AB7" : "var(--color-background-primary)",
                color: windowSize === 5 ? "#EEEDFE" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                5 frets
              </button>
              <button onClick={() => onWindowSizeChange(12)} style={{
                border: windowSize === 12 ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: windowSize === 12 ? "#534AB7" : "var(--color-background-primary)",
                color: windowSize === 12 ? "#EEEDFE" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                12 frets
              </button>
              <button onClick={onToggleShowAvoid} style={{
                border: showAvoid ? "1.5px solid #A32D2D" : "0.5px solid var(--color-border-tertiary)",
                background: showAvoid ? "#FAECE7" : "var(--color-background-primary)",
                color: showAvoid ? "#993C1D" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                {showAvoid ? "Avoid on" : "Avoid off"}
              </button>
              <button onClick={onToggleFollowChord} style={{
                border: followChord ? "1.5px solid #1D9E75" : "0.5px solid var(--color-border-tertiary)",
                background: followChord ? "#E1F5EE" : "var(--color-background-primary)",
                color: followChord ? "#0F6E56" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}>
                {followChord ? "Follow chord" : "Lock position"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{
              padding: "6px 10px",
              borderRadius: "var(--border-radius-md)",
              background: "#FFF2DA",
              color: "#6D4600",
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
              {followChord ? "La box suit l'accord courant" : "Position CAGED stable pour toute la grille"}
            </div>
            <div style={{
              padding: "6px 10px",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-tertiary)",
              fontSize: 11,
            }}>
              Vise les carrés orange sur les temps forts
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "#EF9F27" }}/>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Tonique</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#534AB7" }}/>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Chord tone</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D9E75" }}/>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Scale tone</span>
            </div>
            {showAvoid && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#A32D2D", opacity: 0.5 }}/>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Avoid note</span>
              </div>
            )}
          </div>

          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px 8px",
            background: "var(--color-background-secondary)",
          }}>
            <Fretboard
              scalePositions={scalePositions}
              chordTones={currentChordTones}
              rootNote={currentRootNote}
              windowStart={windowStart}
              windowSize={windowSize}
              showAvoid={showAvoid}
              flash={flash}
              stringLabels={selectedTuningStrings}
            />
          </div>
        </div>
      )}
    </div>
  );
}
