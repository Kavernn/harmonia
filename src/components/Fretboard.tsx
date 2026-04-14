import { memo } from "react";
import type { FretPosition, NoteValueId } from "../music";
import {
  chordFunctionLabel,
  degreeLabelForNote,
  normalizedVisiblePositions,
  type FretboardLabelMode,
  visibleFretsInWindow,
} from "../fretboardGuidance";
import { phraseGuideStepPulses } from "../transportMath";
import type { PhraseGuide } from "../phraseGuide";

const FB_W = 900;
const FB_H = 200;
const FB_LEFT = 58;
const FB_RIGHT = FB_W - 20;
const FB_TOP = 24;
const FB_BOT = FB_H - 32;
const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const DOUBLE_DOTS = new Set([12, 24]);
const PHRASE_META: Record<string, { color: string; background: string; label: string }> = {
  "guide-tones": { color: "var(--color-accent-primary)", background: "var(--color-accent-soft)", label: "GT" },
  "root-path": { color: "var(--color-warning)", background: "var(--color-warning-soft)", label: "RP" },
  "top-answer": { color: "var(--color-success)", background: "var(--color-success-soft)", label: "TL" },
};

const FRETBOARD_THEME = {
  frame: "var(--color-fretboard-frame)",
  neckStart: "var(--color-fretboard-neck-start)",
  neckEnd: "var(--color-fretboard-neck-end)",
  woodStripe: "var(--color-fretboard-stripe)",
  fret: "var(--color-fretboard-fret)",
  marker: "var(--color-fretboard-marker)",
  nut: "var(--color-fretboard-nut)",
  string: "var(--color-fretboard-string)",
  stringLabel: "var(--color-fretboard-string-label)",
  fretLabel: "var(--color-fretboard-fret-label)",
  rootFill: "var(--color-fretboard-root)",
  rootText: "var(--color-accent-contrast)",
  chordFill: "var(--color-accent-primary)",
  chordText: "var(--color-accent-contrast)",
  scaleFill: "var(--color-success)",
  scaleText: "var(--color-accent-contrast)",
  avoidFill: "var(--color-fretboard-avoid)",
  avoidText: "var(--color-accent-contrast)",
  colorFill: "var(--color-fretboard-color)",
  colorText: "var(--color-accent-contrast)",
  modalOutline: "var(--color-fretboard-modal)",
  resolutionOutline: "var(--color-fretboard-resolution)",
};

const CAGED_SHAPES: Record<string, { name: string; intervals: number[] }> = {
  C: { name: "C shape", intervals: [0, 3, 7, 12, 15, 19] },
  A: { name: "A shape", intervals: [0, 4, 7, 12, 16, 19] },
  G: { name: "G shape", intervals: [0, 4, 7, 11, 16, 19] },
  E: { name: "E shape", intervals: [0, 4, 7, 12, 16, 24] },
  D: { name: "D shape", intervals: [0, 5, 9, 14, 17, 21] },
};

function detectCagedShape(rootNote: string, windowStart: number): string {
  const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const rootIdx = notes.indexOf(rootNote);
  if (windowStart <= 2) return rootIdx <= 4 ? "E" : "C";
  if (windowStart <= 5) return "D";
  if (windowStart <= 7) return "C";
  if (windowStart <= 9) return "A";
  return "G";
}

interface FretboardProps {
  scalePositions: FretPosition[];
  chordTones: string[];
  chordQuality: string;
  rootNote: string;
  scaleRoot: string;
  modalCharacteristicTones: string[];
  modalAvoidTones: string[];
  modalResolutionTones: string[];
  nextChordName: string;
  colorTones: string[];
  resolutionNote: string;
  currentPulseTotal: number;
  tempoUnit: NoteValueId;
  phraseGuides: PhraseGuide[];
  windowStart: number;
  windowSize: number;
  showAvoid: boolean;
  flash: boolean;
  displayPreset: "focus" | "jam" | "learn" | "advanced";
  labelMode: FretboardLabelMode;
  showTabGuide: boolean;
  showPhraseGuide: boolean;
  stringLabels: string[];
}

function FretboardInner({
  scalePositions,
  chordTones,
  chordQuality,
  rootNote,
  scaleRoot,
  modalCharacteristicTones,
  modalAvoidTones,
  modalResolutionTones,
  nextChordName,
  colorTones,
  resolutionNote,
  currentPulseTotal,
  tempoUnit,
  phraseGuides,
  windowStart,
  windowSize,
  showAvoid,
  flash,
  displayPreset,
  labelMode,
  showTabGuide,
  showPhraseGuide,
  stringLabels,
}: FretboardProps) {
  const visible = normalizedVisiblePositions(scalePositions, chordTones, rootNote, windowStart, windowSize);
  const colorToneSet = new Set(colorTones);
  const modalCharacteristicSet = new Set(modalCharacteristicTones);
  const modalAvoidSet = new Set(modalAvoidTones);
  const resolutionNoteSet = new Set([...modalResolutionTones, ...(resolutionNote ? [resolutionNote] : [])]);
  const phraseTimeline = phraseGuides.map((phrase) => ({
    phrase,
    pulses: phraseGuideStepPulses(phrase.steps.length, currentPulseTotal, tempoUnit),
  }));
  const isFocus = displayPreset === "focus";
  const colorPositions = visible.filter((position) => colorToneSet.has(position.note));
  const characteristicPositions = visible.filter((position) => position.is_characteristic || modalCharacteristicSet.has(position.note));
  const modalAvoidPositions = visible.filter((position) =>
    (position.is_modal_avoid || modalAvoidSet.has(position.note)) && !position.is_avoid
  );
  const resolutionPositions = visible.filter((position) => position.is_resolution || resolutionNoteSet.has(position.note));
  const resolutionOnlyPositions = resolutionPositions.filter((position) => position.is_avoid && !colorToneSet.has(position.note));
  const regularAvoidPositions = visible.filter((position) => position.is_avoid && !colorToneSet.has(position.note) && position.note !== resolutionNote);
  const regularScalePositions = visible.filter((position) => !position.is_chord_tone && !position.is_avoid && !colorToneSet.has(position.note));
  const regularChordPositions = visible.filter((position) => position.is_chord_tone && !position.is_root && !colorToneSet.has(position.note));
  const regularRootPositions = visible.filter((position) => position.is_root && !colorToneSet.has(position.note));
  const stringCount = stringLabels.length;
  const stringSpacing = (FB_BOT - FB_TOP) / Math.max(1, stringCount - 1);
  const stringThickness = Array.from({ length: stringCount }, (_, i) => 0.8 + ((stringCount - 1 - i) / Math.max(1, stringCount - 1)) * 1.7);
  const fretWidth = (FB_RIGHT - FB_LEFT) / windowSize;

  function stringY(s: number) { return FB_BOT - s * stringSpacing; }
  function fretX(f: number) { return FB_LEFT + f * fretWidth; }
  function fretCenterX(f: number) { return FB_LEFT + (f - 0.5) * fretWidth; }
  function noteX(fret: number) {
    return fret === 0 && windowStart === 0 ? FB_LEFT - 20 : fretCenterX(fret - windowStart);
  }
  const fretNumbers = Array.from({ length: windowSize }, (_, i) => windowStart + i + 1);
  const tabFrets = visibleFretsInWindow(windowStart, windowSize);
  const cagedShape = detectCagedShape(rootNote, windowStart);
  const tabGridColumns = `40px repeat(${tabFrets.length}, minmax(28px, 1fr))`;
  const tabStrings = stringLabels
    .map((label, index) => ({ label, index }))
    .slice()
    .reverse();

  function noteLabel(note: string) {
    if (isFocus) return "";
    if (labelMode === "note") return note;
    if (labelMode === "degree") return degreeLabelForNote(note, scaleRoot);
    return chordFunctionLabel(note, chordTones, chordQuality) ?? degreeLabelForNote(note, scaleRoot);
  }

  function noteFontSize(label: string, radius: number) {
    if (label.length >= 3) return radius <= 8 ? 6 : 7;
    if (label.length === 2) return radius <= 8 ? 7 : 8;
    return radius <= 8 ? 8 : 9;
  }

  function phraseMeta(phrase: PhraseGuide) {
    return PHRASE_META[phrase.id] ?? { color: "var(--color-accent-primary)", background: "var(--color-accent-soft)", label: "PG" };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, contain: "layout paint" }}>
      {!isFocus && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {displayPreset !== "jam" && (
          <div style={{ fontSize: 10, color: "var(--color-accent-primary)", opacity: 0.7 }}>
            {CAGED_SHAPES[cagedShape]?.name ?? ""}
          </div>
        )}
        <div style={{
          fontSize: 10,
          color: "var(--color-success)",
          background: "var(--color-success-soft)",
          borderRadius: 99,
          padding: "2px 8px",
        }}>
          {labelMode === "degree"
            ? "Repères en degrés"
            : labelMode === "function"
              ? "Repères en fonctions d'accord"
              : "Repères en notes"}
        </div>
        {colorTones.length > 0 && (
          <div style={{
            fontSize: 10,
            color: "var(--color-accent-contrast)",
            background: "var(--color-fretboard-color)",
            borderRadius: 99,
            padding: "2px 8px",
          }}>
            Couleur: {colorTones.join(" · ")}
          </div>
        )}
        {displayPreset !== "jam" && modalCharacteristicTones.length > 0 && (
          <div style={{
            fontSize: 10,
            color: "var(--color-accent-primary)",
            background: "var(--color-accent-soft)",
            borderRadius: 99,
            padding: "2px 8px",
          }}>
            Repère modal: {modalCharacteristicTones.join(" · ")}
          </div>
        )}
        {displayPreset === "advanced" && modalAvoidTones.length > 0 && (
          <div style={{
            fontSize: 10,
            color: "var(--color-warning)",
            background: "var(--color-warning-soft)",
            borderRadius: 99,
            padding: "2px 8px",
          }}>
            Avoid modal: {modalAvoidTones.join(" · ")}
          </div>
        )}
        {resolutionNoteSet.size > 0 && (
          <div style={{
            fontSize: 10,
            color: "var(--color-accent-primary)",
            background: "var(--color-accent-soft)",
            borderRadius: 99,
            padding: "2px 8px",
          }}>
            Resolution: {Array.from(resolutionNoteSet).join(" · ")}
          </div>
        )}
        </div>
      )}

      <svg viewBox={`0 0 ${FB_W} ${FB_H}`} style={{
        width: "100%",
        height: "auto",
        display: "block",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "var(--color-shadow)",
      }}>
        <defs>
          <linearGradient id="neckGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={FRETBOARD_THEME.neckStart}/>
            <stop offset="100%" stopColor={FRETBOARD_THEME.neckEnd}/>
          </linearGradient>
          <linearGradient id="stringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={FRETBOARD_THEME.string} stopOpacity="0.72"/>
            <stop offset="50%" stopColor="var(--color-text-primary)" stopOpacity="0.9"/>
            <stop offset="100%" stopColor={FRETBOARD_THEME.string} stopOpacity="0.72"/>
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={FB_W} height={FB_H} rx="10" fill={FRETBOARD_THEME.frame}/>
        <rect x="8" y="8" width={FB_W - 16} height={FB_H - 16} rx="8" fill="url(#neckGradient)"/>
        {[0, 1, 2].map((index) => (
          <rect
            key={`grain-${index}`}
            x="8"
            y={18 + index * 56}
            width={FB_W - 16}
            height="18"
            fill={FRETBOARD_THEME.woodStripe}
            opacity="0.11"
          />
        ))}

        {flash && <rect x="8" y="8" width={FB_W - 16} height={FB_H - 16} rx="8" fill="var(--color-accent-primary)" opacity="0.04"/>}

        {windowStart === 0
          ? <rect x={FB_LEFT - 5} y={FB_TOP} width={6} height={FB_BOT - FB_TOP} fill={FRETBOARD_THEME.nut}/>
          : <text x={FB_LEFT - 8} y={FB_TOP + (FB_BOT - FB_TOP) / 2 + 4} textAnchor="end" fontSize={10} fill={FRETBOARD_THEME.fretLabel}>{windowStart + 1}fr</text>}

        {Array.from({ length: windowSize + 1 }, (_, i) => (
          <line key={i} x1={fretX(i)} y1={FB_TOP} x2={fretX(i)} y2={FB_BOT} stroke={FRETBOARD_THEME.fret} strokeOpacity="0.8" strokeWidth={1.5}/>
        ))}

        {fretNumbers.map((fret, i) => {
          if (!FRET_MARKERS.has(fret)) return null;
          const cx = fretCenterX(i + 1);
          const cy = (FB_TOP + FB_BOT) / 2;

          if (DOUBLE_DOTS.has(fret)) {
            return (
              <g key={fret}>
                <circle cx={cx} cy={cy - stringSpacing} r={3} fill={FRETBOARD_THEME.marker} opacity="0.55"/>
                <circle cx={cx} cy={cy + stringSpacing} r={3} fill={FRETBOARD_THEME.marker} opacity="0.55"/>
              </g>
            );
          }

          return <circle key={fret} cx={cx} cy={cy} r={3} fill={FRETBOARD_THEME.marker} opacity="0.55"/>;
        })}

        {!isFocus && fretNumbers.map((fret, i) => (
          <text key={fret} x={fretCenterX(i + 1)} y={FB_H - 10} textAnchor="middle" fontSize={10} fill={FRETBOARD_THEME.fretLabel}>{fret}</text>
        ))}

        {stringLabels.map((label, i) => (
          <text key={i} x={FB_LEFT - 14} y={stringY(i) + 4} textAnchor="middle" fontSize={10} fill={FRETBOARD_THEME.stringLabel}>{label}</text>
        ))}

        {Array.from({ length: stringCount }, (_, i) => (
          <line key={i} x1={FB_LEFT} y1={stringY(i)} x2={FB_RIGHT} y2={stringY(i)} stroke="url(#stringGradient)" strokeWidth={stringThickness[i]}/>
        ))}

        {showAvoid && regularAvoidPositions.map((position, i) => {
          const x = noteX(position.fret);
          const label = noteLabel(position.note);
          return (
            <g key={`avoid-${i}`}>
              <circle cx={x} cy={stringY(position.string)} r={7} fill={FRETBOARD_THEME.avoidFill} opacity={0.42}/>
              {!isFocus && (
                <text x={x} y={stringY(position.string) + 4} textAnchor="middle" fontSize={noteFontSize(label, 7)} fill={FRETBOARD_THEME.avoidText} opacity={0.86}>{label}</text>
              )}
            </g>
          );
        })}

        {resolutionOnlyPositions.map((position, i) => {
          const x = noteX(position.fret);
          const y = stringY(position.string);
          const label = noteLabel(position.note);
          return (
            <g key={`resolution-base-${i}`}>
              <circle cx={x} cy={y} r={8} fill="var(--color-accent-soft)"/>
              {!isFocus && (
                <text x={x} y={y + 4} textAnchor="middle" fontSize={noteFontSize(label, 8)} fontWeight="600" fill="var(--color-accent-primary)">{label}</text>
              )}
            </g>
          );
        })}

        {regularScalePositions.map((position, i) => {
          const x = noteX(position.fret);
          const label = noteLabel(position.note);
          return (
            <g key={`scale-${i}`}>
              <circle cx={x} cy={stringY(position.string)} r={isFocus ? 5.5 : 8} fill={FRETBOARD_THEME.scaleFill}/>
              {!isFocus && (
                <text x={x} y={stringY(position.string) + 4} textAnchor="middle" fontSize={noteFontSize(label, 8)} fontWeight="500" fill={FRETBOARD_THEME.scaleText}>{label}</text>
              )}
            </g>
          );
        })}

        {regularChordPositions.map((position, i) => {
          const x = noteX(position.fret);
          const label = noteLabel(position.note);
          return (
            <g key={`chord-${i}`}>
              <circle cx={x} cy={stringY(position.string)} r={isFocus ? 9.5 : 11} fill={FRETBOARD_THEME.chordFill}/>
              {isFocus ? (
                <circle cx={x} cy={stringY(position.string)} r={2.4} fill="var(--color-text-primary)" opacity={0.9}/>
              ) : (
                <text x={x} y={stringY(position.string) + 4} textAnchor="middle" fontSize={noteFontSize(label, 11)} fontWeight="500" fill={FRETBOARD_THEME.chordText}>{label}</text>
              )}
            </g>
          );
        })}

        {regularRootPositions.map((position, i) => {
          const x = noteX(position.fret);
          const y = stringY(position.string);
          const label = noteLabel(position.note);
          return (
            <g key={`root-${i}`}>
              <rect x={x - (isFocus ? 10 : 11)} y={y - (isFocus ? 10 : 11)} width={isFocus ? 20 : 22} height={isFocus ? 20 : 22} rx={4} fill={FRETBOARD_THEME.rootFill}/>
              {isFocus ? (
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9} fontWeight="700" fill={FRETBOARD_THEME.rootText}>R</text>
              ) : (
                <text x={x} y={y + 4} textAnchor="middle" fontSize={noteFontSize(label, 11)} fontWeight="500" fill={FRETBOARD_THEME.rootText}>{label}</text>
              )}
            </g>
          );
        })}

        {colorPositions.map((position, i) => {
          const x = noteX(position.fret);
          const y = stringY(position.string);
          const label = noteLabel(position.note);

          return (
            <g key={`color-${i}`}>
              <circle cx={x} cy={y} r={14} fill={FRETBOARD_THEME.colorFill} opacity={0.14}/>
              {position.is_root ? (
                <rect
                  x={x - 11}
                  y={y - 11}
                  width={22}
                  height={22}
                  rx={4}
                  fill={FRETBOARD_THEME.colorFill}
                  stroke={FRETBOARD_THEME.colorFill}
                  strokeWidth={1.5}
                />
              ) : (
                <circle cx={x} cy={y} r={11} fill={FRETBOARD_THEME.colorFill} stroke={FRETBOARD_THEME.colorFill} strokeWidth={1.5}/>
              )}
              {isFocus ? (
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize={8.5} fontWeight="700" fill={FRETBOARD_THEME.colorText}>+</text>
              ) : (
                <text x={x} y={y + 4} textAnchor="middle" fontSize={noteFontSize(label, 11)} fontWeight="700" fill={FRETBOARD_THEME.colorText}>{label}</text>
              )}
            </g>
          );
        })}

        {displayPreset !== "jam" && characteristicPositions.map((position, i) => {
          const x = noteX(position.fret);
          const y = stringY(position.string);
          return (
            <g key={`modal-characteristic-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={position.is_root || position.is_chord_tone ? 16 : 13}
                fill="none"
                stroke={FRETBOARD_THEME.modalOutline}
                strokeWidth={2.2}
                opacity={0.95}
              />
            </g>
          );
        })}

        {displayPreset === "advanced" && modalAvoidPositions.map((position, i) => {
          const x = noteX(position.fret);
          const y = stringY(position.string);
          return (
            <g key={`modal-avoid-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={position.is_root || position.is_chord_tone ? 16 : 13}
                fill="none"
                stroke="var(--color-warning)"
                strokeWidth={1.8}
                strokeDasharray="3 3"
                opacity={0.85}
              />
            </g>
          );
        })}

        {resolutionPositions.map((position, i) => {
          const x = noteX(position.fret);
          const y = stringY(position.string);
          const radius = position.is_root || position.is_chord_tone || colorToneSet.has(position.note) ? 15 : 12;

          return (
            <g key={`resolution-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="none"
                stroke={FRETBOARD_THEME.resolutionOutline}
                strokeWidth={2}
                strokeDasharray="4 3"
                opacity={0.78}
              />
            </g>
          );
        })}
      </svg>

      {showTabGuide && (
        <div style={{
          marginTop: 12,
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
          padding: "10px 10px 8px",
          minHeight: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>
              Tab guide — cibles de la box courante
            </span>
            {!isFocus && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: FRETBOARD_THEME.rootFill }}/>
                Tonique
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: FRETBOARD_THEME.chordFill }}/>
                Accord
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: FRETBOARD_THEME.scaleFill }}/>
                Gamme
              </span>
              {colorTones.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: FRETBOARD_THEME.colorFill }}/>
                  Couleur
                </span>
              )}
              {resolutionNoteSet.size > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, border: `2px solid ${FRETBOARD_THEME.resolutionOutline}` }}/>
                  Resolution
                </span>
              )}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: tabGridColumns, gap: 4, alignItems: "center" }}>
            <div/>
            {tabFrets.map((fret) => (
              <div key={`tab-fret-${fret}`} style={{
                textAlign: "center",
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                fontVariantNumeric: "tabular-nums",
              }}>
                {fret}
              </div>
            ))}

            {tabStrings.map(({ label, index: stringIndex }) => (
              <div key={`tab-row-${stringIndex}`} style={{ display: "contents" }}>
                <div style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  textAlign: "center",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {label}
                </div>
                {tabFrets.map((fret) => {
                  const position = visible.find((item) => item.string === stringIndex && item.fret === fret);
                  const isRoot = Boolean(position?.is_root);
                  const isChordTone = Boolean(position?.is_chord_tone) && !isRoot;
                  const isScaleTone = Boolean(position) && !position?.is_avoid && !isRoot && !isChordTone;
                  const isColorTone = position ? colorToneSet.has(position.note) : false;
                  const isModalCharacteristic = position ? (position.is_characteristic || modalCharacteristicSet.has(position.note)) : false;
                  const isModalAvoid = position ? ((position.is_modal_avoid || modalAvoidSet.has(position.note)) && !position.is_avoid) : false;
                  const isResolutionTone = position ? (position.is_resolution || resolutionNoteSet.has(position.note)) : false;
                  const functionLabel = position ? chordFunctionLabel(position.note, chordTones, chordQuality) : null;
                  const cellRings = [];
                  if (isColorTone) {
                    cellRings.push("inset 0 0 0 1px var(--color-fretboard-color)");
                  }
                  if (isModalCharacteristic) {
                    cellRings.push("inset 0 0 0 2px var(--color-fretboard-modal)");
                  }
                  if (isModalAvoid) {
                    cellRings.push("inset 0 0 0 3px rgba(244, 200, 124, 0.3)");
                  }
                  if (isResolutionTone) {
                    cellRings.push("inset 0 0 0 3px var(--color-fretboard-resolution)");
                  }
                  return (
                    <div key={`tab-cell-${stringIndex}-${fret}`} style={{
                      height: 28,
                      borderRadius: 6,
                      border: isColorTone
                        ? "1px solid var(--color-fretboard-color)"
                        : isRoot
                          ? "1px solid var(--color-fretboard-root)"
                          : isChordTone
                            ? "1px solid var(--color-accent-primary)"
                            : isScaleTone
                              ? "0.5px solid rgba(110, 231, 183, 0.45)"
                              : "0.5px solid var(--color-border-secondary)",
                      background: isColorTone
                        ? "var(--color-fretboard-color-soft)"
                        : isRoot
                          ? "var(--color-warning-soft)"
                          : isChordTone
                            ? "var(--color-accent-soft)"
                            : isScaleTone
                              ? "var(--color-success-soft)"
                              : "var(--color-background-tertiary)",
                      color: isColorTone
                        ? "var(--color-fretboard-color)"
                        : isRoot
                          ? "var(--color-fretboard-root)"
                          : isChordTone
                            ? "var(--color-accent-primary)"
                            : isScaleTone
                              ? "var(--color-success)"
                              : "var(--color-text-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      fontSize: position ? 11 : 14,
                      fontWeight: isRoot || isChordTone || isColorTone ? 700 : position ? 600 : 500,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontVariantNumeric: "tabular-nums",
                      boxShadow: cellRings.join(", ") || undefined,
                      opacity: position ? 1 : 0.56,
                    }}>
                      {position
                        ? (position.is_avoid && !isColorTone && !isResolutionTone ? (showAvoid ? "×" : "–") : fret)
                        : "–"}
                      {position && isColorTone && (
                        <span style={{
                          position: "absolute",
                          left: 4,
                          top: 2,
                          fontSize: 8,
                          fontWeight: 700,
                          color: "var(--color-fretboard-color)",
                        }}>
                          +
                        </span>
                      )}
                      {position && isModalCharacteristic && (
                        <span style={{
                          position: "absolute",
                          left: isColorTone ? 12 : 4,
                          bottom: 2,
                          fontSize: 8,
                          fontWeight: 700,
                          color: "var(--color-fretboard-modal)",
                        }}>
                          M
                        </span>
                      )}
                      {position && isModalAvoid && (
                        <span style={{
                          position: "absolute",
                          right: functionLabel ? 12 : 4,
                          bottom: 2,
                          fontSize: 8,
                          fontWeight: 700,
                          color: "var(--color-warning)",
                        }}>
                          !
                        </span>
                      )}
                      {position && isResolutionTone && (
                        <span style={{
                          position: "absolute",
                          left: isColorTone ? 12 : 4,
                          top: 2,
                          fontSize: 8,
                          fontWeight: 700,
                          color: "var(--color-fretboard-resolution)",
                        }}>
                          →
                        </span>
                      )}
                      {position && functionLabel && (
                        <span style={{
                          position: "absolute",
                          right: 4,
                          top: 2,
                          fontSize: 8,
                          fontWeight: 600,
                          opacity: 0.75,
                        }}>
                          {functionLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {showPhraseGuide && phraseGuides.length > 0 && (
        <div style={{
          marginTop: 12,
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-primary)",
          padding: "10px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>
              Phrase guide — vers {nextChordName || "l'accord suivant"}
            </span>
            <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Lis de gauche à droite: depart, passage, cible
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {phraseTimeline.map(({ phrase, pulses }) => {
              const meta = phraseMeta(phrase);
              return (
                <div key={phrase.id} style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "8px 10px",
                  background: "var(--color-background-secondary)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                      <span style={{
                        minWidth: 22,
                        height: 18,
                        borderRadius: 99,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: meta.background,
                        color: meta.color,
                        fontSize: 9,
                        fontWeight: 700,
                      }}>
                        {meta.label}
                      </span>
                      {phrase.label}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{phrase.description}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {phrase.steps.map((step, index) => {
                      const roleStyle = step.role === "start"
                        ? { background: "var(--color-accent-soft)", border: "var(--color-accent-primary)", color: "var(--color-accent-strong)" }
                        : step.role === "target"
                          ? { background: "var(--color-warning-soft)", border: "var(--color-warning)", color: "var(--color-warning)" }
                          : { background: "var(--color-success-soft)", border: "var(--color-success)", color: "var(--color-success)" };
                      return (
                        <div key={`${phrase.id}-${index}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{
                            minWidth: 84,
                            border: `1px solid ${roleStyle.border}`,
                            background: roleStyle.background,
                            color: roleStyle.color,
                            borderRadius: "var(--border-radius-md)",
                            padding: "6px 8px",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 2 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: meta.color }}>
                                Pulse {pulses[index] + 1}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>
                              {stringLabels[step.string]}{step.fret}
                            </div>
                            <div style={{ fontSize: 10, opacity: 0.82 }}>
                              {step.degreeLabel}{step.functionLabel ? ` · ${step.functionLabel}` : ""}
                            </div>
                          </div>
                          {index < phrase.steps.length - 1 && (
                            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>→</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const Fretboard = memo(FretboardInner);
