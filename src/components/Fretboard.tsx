import type { FretPosition } from "../music";

const FB_W = 900;
const FB_H = 200;
const FB_LEFT = 58;
const FB_RIGHT = FB_W - 20;
const FB_TOP = 24;
const FB_BOT = FB_H - 32;
const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const DOUBLE_DOTS = new Set([12, 24]);

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

export function Fretboard({
  scalePositions,
  chordTones,
  rootNote,
  windowStart,
  windowSize,
  showAvoid,
  flash,
  stringLabels,
}: {
  scalePositions: FretPosition[];
  chordTones: string[];
  rootNote: string;
  windowStart: number;
  windowSize: number;
  showAvoid: boolean;
  flash: boolean;
  stringLabels: string[];
}) {
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

  const visible = scalePositions
    .map((position) => ({
      ...position,
      is_chord_tone: position.is_chord_tone || chordTones.includes(position.note),
      is_root: position.is_root || (position.note === rootNote && chordTones.includes(position.note)),
      is_avoid: position.is_avoid ?? false,
    }))
    .filter((position) => {
      if (windowStart === 0) {
        return position.fret <= windowSize;
      }
      return position.fret > windowStart && position.fret <= windowStart + windowSize;
    });

  const fretNumbers = Array.from({ length: windowSize }, (_, i) => windowStart + i + 1);
  const cagedShape = detectCagedShape(rootNote, windowStart);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 0, right: 0, fontSize: 10, color: "#534AB7", opacity: 0.7 }}>
        {CAGED_SHAPES[cagedShape]?.name ?? ""}
      </div>

      <svg viewBox={`0 0 ${FB_W} ${FB_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <rect x="0" y="0" width={FB_W} height={FB_H} rx="8" fill="#161616"/>

        {flash && <rect x="0" y="0" width={FB_W} height={FB_H} rx="8" fill="#534AB7" opacity="0.08"/>}

        {windowStart === 0
          ? <rect x={FB_LEFT - 5} y={FB_TOP} width={6} height={FB_BOT - FB_TOP} fill="#999"/>
          : <text x={FB_LEFT - 8} y={FB_TOP + (FB_BOT - FB_TOP) / 2 + 4} textAnchor="end" fontSize={10} fill="#555">{windowStart + 1}fr</text>}

        {Array.from({ length: windowSize + 1 }, (_, i) => (
          <line key={i} x1={fretX(i)} y1={FB_TOP} x2={fretX(i)} y2={FB_BOT} stroke="#2a2a2a" strokeWidth={1.5}/>
        ))}

        {fretNumbers.map((fret, i) => {
          if (!FRET_MARKERS.has(fret)) return null;
          const cx = fretCenterX(i + 1);
          const cy = (FB_TOP + FB_BOT) / 2;

          if (DOUBLE_DOTS.has(fret)) {
            return (
              <g key={fret}>
                <circle cx={cx} cy={cy - stringSpacing} r={3} fill="#2a2a2a"/>
                <circle cx={cx} cy={cy + stringSpacing} r={3} fill="#2a2a2a"/>
              </g>
            );
          }

          return <circle key={fret} cx={cx} cy={cy} r={3} fill="#2a2a2a"/>;
        })}

        {fretNumbers.map((fret, i) => (
          <text key={fret} x={fretCenterX(i + 1)} y={FB_H - 10} textAnchor="middle" fontSize={10} fill="#444">{fret}</text>
        ))}

        {stringLabels.map((label, i) => (
          <text key={i} x={FB_LEFT - 14} y={stringY(i) + 4} textAnchor="middle" fontSize={10} fill="#555">{label}</text>
        ))}

        {Array.from({ length: stringCount }, (_, i) => (
          <line key={i} x1={FB_LEFT} y1={stringY(i)} x2={FB_RIGHT} y2={stringY(i)} stroke="#555" strokeWidth={stringThickness[i]}/>
        ))}

        {showAvoid && visible.filter((position) => position.is_avoid).map((position, i) => {
          const x = noteX(position.fret);
          return (
            <g key={`avoid-${i}`}>
              <circle cx={x} cy={stringY(position.string)} r={7} fill="#A32D2D" opacity={0.4}/>
              <text x={x} y={stringY(position.string) + 4} textAnchor="middle" fontSize={7} fill="#F09595" opacity={0.8}>{position.note}</text>
            </g>
          );
        })}

        {visible.filter((position) => !position.is_chord_tone && !position.is_avoid).map((position, i) => {
          const x = noteX(position.fret);
          return (
            <g key={`scale-${i}`}>
              <circle cx={x} cy={stringY(position.string)} r={8} fill="#1D9E75"/>
              <text x={x} y={stringY(position.string) + 4} textAnchor="middle" fontSize={8} fontWeight="500" fill="#E1F5EE">{position.note}</text>
            </g>
          );
        })}

        {visible.filter((position) => position.is_chord_tone && !position.is_root).map((position, i) => {
          const x = noteX(position.fret);
          return (
            <g key={`chord-${i}`}>
              <circle cx={x} cy={stringY(position.string)} r={11} fill="#534AB7"/>
              <text x={x} y={stringY(position.string) + 4} textAnchor="middle" fontSize={9} fontWeight="500" fill="#EEEDFE">{position.note}</text>
            </g>
          );
        })}

        {visible.filter((position) => position.is_root).map((position, i) => {
          const x = noteX(position.fret);
          const y = stringY(position.string);
          return (
            <g key={`root-${i}`}>
              <rect x={x - 11} y={y - 11} width={22} height={22} rx={4} fill="#EF9F27"/>
              <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fontWeight="500" fill="#412402">{position.note}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
