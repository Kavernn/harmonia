import { useEffect, useMemo, useState } from "react";
import type { FretPosition, ScaleSuggestion } from "../music";
import { Fretboard } from "./Fretboard";

interface FretboardMasteryPanelProps {
  harmonyRootName: string;
  harmonyScaleName: string;
  selectedScale: ScaleSuggestion | null;
  selectedTuningName: string;
  selectedTuningStrings: string[];
  scalePositions: FretPosition[];
}

function buildNaturalPositions(
  scalePositions: FretPosition[],
  stringCount: number,
  windowSize: number,
  notesPerString: number,
) {
  if (!scalePositions.length) return [];
  const maxFret = Math.max(0, ...scalePositions.map((position) => position.fret));
  const lastStart = Math.max(0, maxFret - windowSize);
  const positionsByString: number[][] = Array.from({ length: stringCount }, () => []);

  scalePositions.forEach((position) => {
    if (position.is_avoid) return;
    if (position.string < 0 || position.string >= stringCount) return;
    positionsByString[position.string].push(position.fret);
  });

  positionsByString.forEach((frets) => frets.sort((left, right) => left - right));

  const starts: number[] = [];
  for (let start = 0; start <= lastStart; start += 1) {
    const end = start + windowSize;
    let ok = true;
    for (const frets of positionsByString) {
      let count = 0;
      for (const fret of frets) {
        if (fret < start) continue;
        if (fret > end) break;
        count += 1;
        if (count >= notesPerString) break;
      }
      if (count < notesPerString) {
        ok = false;
        break;
      }
    }
    if (ok) starts.push(start);
  }
  return starts;
}

export function FretboardMasteryPanel({
  harmonyRootName,
  harmonyScaleName,
  selectedScale,
  selectedTuningName,
  selectedTuningStrings,
  scalePositions,
}: FretboardMasteryPanelProps) {
  const [windowSize, setWindowSize] = useState(5);
  const [notesPerString, setNotesPerString] = useState(3);
  const [positionStart, setPositionStart] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateSeconds, setRotateSeconds] = useState(12);
  const [rotateProgress, setRotateProgress] = useState(0);

  useEffect(() => {
    if (!autoRotate) {
      setRotateProgress(0);
      return;
    }
    setRotateProgress(0);
    const totalMs = Math.max(4, rotateSeconds) * 1000;
    const intervalMs = 100;
    const startTime = Date.now();
    const ticker = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setRotateProgress(Math.min(100, (elapsed / totalMs) * 100));
    }, intervalMs);
    return () => window.clearInterval(ticker);
  }, [autoRotate, rotateSeconds, positionStart]);
  const stringCount = selectedTuningStrings.length;
  const naturalPositions = useMemo(
    () => buildNaturalPositions(scalePositions, stringCount, windowSize, notesPerString),
    [notesPerString, scalePositions, stringCount, windowSize],
  );
  const effectiveStart = positionStart ?? naturalPositions[0] ?? 0;

  useEffect(() => {
    if (!autoRotate || naturalPositions.length === 0) return;
    const interval = window.setInterval(() => {
      setPositionStart((current) => {
        const currentIndex = current == null ? -1 : naturalPositions.indexOf(current);
        const nextIndex = currentIndex >= 0
          ? (currentIndex + 1) % naturalPositions.length
          : 0;
        return naturalPositions[nextIndex];
      });
    }, Math.max(4, rotateSeconds) * 1000);

    return () => window.clearInterval(interval);
  }, [autoRotate, naturalPositions, rotateSeconds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Fretboard mastery</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, color: "var(--color-text-primary)" }}>
            Positions naturelles · {selectedScale?.scale_root ?? harmonyRootName} {selectedScale?.scale_name ?? harmonyScaleName}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Accordage {selectedTuningName} · {selectedTuningStrings.join(" · ")}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Fenêtre (frets)
            <select
              value={windowSize}
              onChange={(event) => setWindowSize(Number(event.target.value))}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            NPS
            <select
              value={notesPerString}
              onChange={(event) => setNotesPerString(Number(event.target.value))}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              {[2, 3, 4].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Position
            <select
              value={String(positionStart ?? "")}
              onChange={(event) => {
                const value = event.target.value;
                setPositionStart(value === "" ? null : Number(value));
              }}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              <option value="">Auto</option>
              {naturalPositions.map((start) => (
                <option key={start} value={start}>
                  {`Frets ${start}-${start + windowSize}`}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Rotation (sec)
            <input
              type="number"
              value={rotateSeconds}
              onChange={(event) => setRotateSeconds(Number(event.target.value))}
              min={4}
              max={60}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => {
              if (naturalPositions.length === 0) return;
              const currentIndex = positionStart == null ? -1 : naturalPositions.indexOf(positionStart);
              const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % naturalPositions.length : 0;
              setPositionStart(naturalPositions[nextIndex]);
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
            Next position
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(event) => setAutoRotate(event.target.checked)}
            />
            Auto rotate positions
          </label>
          {autoRotate && (
            <div style={{ flex: 1, height: 3, background: "var(--color-background-primary)", borderRadius: 2, overflow: "hidden", minWidth: 60 }}>
              <div style={{
                height: "100%",
                width: `${rotateProgress}%`,
                background: "var(--color-accent-primary)",
                borderRadius: 2,
                transition: "width 0.1s linear",
              }} />
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            {naturalPositions.length ? `Positions: ${naturalPositions.length} · active ${effectiveStart}-${effectiveStart + windowSize}` : "Aucune position détectée"}
          </div>
        </div>
      </div>

      <div style={{
        padding: 12,
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        background: "var(--color-background-secondary)",
      }}>
        <Fretboard
          scalePositions={scalePositions}
          chordTones={[]}
          chordQuality=""
          rootNote=""
          scaleRoot={selectedScale?.scale_root ?? harmonyRootName}
          modalCharacteristicTones={[]}
          modalAvoidTones={[]}
          modalResolutionTones={[]}
          nextChordName=""
          colorTones={[]}
          resolutionNote=""
          currentPulseTotal={4}
          tempoUnit="quarter"
          phraseGuides={[]}
          windowStart={effectiveStart}
          windowSize={windowSize}
          showAvoid={false}
          flash={false}
          displayPreset="focus"
          labelMode="function"
          showTabGuide={false}
          showPhraseGuide={false}
          stringLabels={selectedTuningStrings}
        />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, padding: "8px 4px" }}>
          {([
            { color: "rgba(31, 202, 211, 0.9)", label: "Tonique" },
            { color: "rgba(31, 202, 211, 0.55)", label: "Notes de gamme" },
            { color: "rgba(255, 160, 50, 0.8)", label: "Caractéristiques modales" },
            { color: "rgba(255, 80, 80, 0.6)", label: "Notes à éviter" },
            { color: "rgba(150, 120, 255, 0.8)", label: "Notes de résolution" },
          ] as const).map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
