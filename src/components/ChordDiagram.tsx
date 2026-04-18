import { NOTES } from "../music";

function noteToSemitone(note: string): number {
  return NOTES.indexOf(note);
}

interface ChordDiagramProps {
  chordTones: string[];
  tuningStrings: string[];
  label?: string;
}

export function ChordDiagram({ chordTones, tuningStrings, label }: ChordDiagramProps) {
  const chordSemitones = new Set(chordTones.map(noteToSemitone).filter((s) => s >= 0));
  const strings = tuningStrings.slice(0, 6);
  const MAX_FRET = 4;
  const NUM_FRETS = 4;

  const stringPositions = strings.map((openNote) => {
    const openSemitone = noteToSemitone(openNote);
    if (openSemitone < 0) return -1;
    for (let fret = 0; fret <= MAX_FRET; fret++) {
      if (chordSemitones.has((openSemitone + fret) % 12)) return fret;
    }
    return -1;
  });

  const W = 88;
  const H = 100;
  const ML = 10, MR = 10, MT = 22, MB = 6;
  const gridW = W - ML - MR;
  const gridH = H - MT - MB;
  const stringSpacing = strings.length > 1 ? gridW / (strings.length - 1) : 0;
  const fretSpacing = gridH / NUM_FRETS;

  return (
    <svg width={W} height={H} style={{ display: "block" }} role="img" aria-label={label ?? "Chord diagram"}>
      {label && (
        <text
          x={W / 2}
          y={11}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="var(--color-text-primary)"
        >
          {label}
        </text>
      )}

      {/* Nut */}
      <rect x={ML} y={MT} width={gridW} height={2.5} fill="var(--color-text-secondary)" rx={1} />

      {/* Fret lines */}
      {Array.from({ length: NUM_FRETS }, (_, i) => (
        <line
          key={i}
          x1={ML}
          x2={ML + gridW}
          y1={MT + (i + 1) * fretSpacing}
          y2={MT + (i + 1) * fretSpacing}
          stroke="var(--color-border-secondary)"
          strokeWidth={0.75}
        />
      ))}

      {/* String lines */}
      {strings.map((_, si) => (
        <line
          key={si}
          x1={ML + si * stringSpacing}
          x2={ML + si * stringSpacing}
          y1={MT}
          y2={MT + gridH}
          stroke="var(--color-border-secondary)"
          strokeWidth={0.75}
        />
      ))}

      {/* O/X and dots */}
      {strings.map((_, si) => {
        const x = ML + si * stringSpacing;
        const fret = stringPositions[si];

        if (fret === 0) {
          return (
            <circle
              key={si}
              cx={x}
              cy={MT - 8}
              r={4}
              fill="none"
              stroke="var(--color-accent-primary)"
              strokeWidth={1.5}
            />
          );
        }

        if (fret === -1) {
          return (
            <text
              key={si}
              x={x}
              y={MT - 4}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-text-tertiary)"
            >
              ✕
            </text>
          );
        }

        const dotY = MT + (fret - 0.5) * fretSpacing;
        return (
          <circle key={si} cx={x} cy={dotY} r={5.5} fill="var(--color-accent-primary)" />
        );
      })}
    </svg>
  );
}
