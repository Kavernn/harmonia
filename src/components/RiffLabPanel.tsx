import { useMemo, useState } from "react";
import type { FretPosition, ScaleSuggestion } from "../music";

interface RiffStep {
  stringIndex: number;
  fret: number;
}

interface RiffLabPanelProps {
  harmonyRootName: string;
  harmonyScaleName: string;
  selectedScale: ScaleSuggestion | null;
  tuningStrings: string[];
  scalePositions: FretPosition[];
  onExportRiff: (lines: string[]) => void;
  onExportRiffMidi: (steps: RiffStep[], tempo: number) => void;
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildAsciiTab(steps: RiffStep[], strings: string[], totalSteps: number) {
  const lines = strings.slice().reverse().map(() => Array.from({ length: totalSteps }, () => "--"));
  steps.forEach((step, index) => {
    const lineIndex = strings.length - 1 - step.stringIndex;
    if (!lines[lineIndex]) return;
    const value = String(step.fret).padStart(2, " ");
    lines[lineIndex][index] = value;
  });
  return lines.map((cells, idx) => `${strings[strings.length - 1 - idx]}|${cells.join("-")}|`).join("\n");
}

export function RiffLabPanel({
  harmonyRootName,
  harmonyScaleName,
  selectedScale,
  tuningStrings,
  scalePositions,
  onExportRiff,
  onExportRiffMidi,
}: RiffLabPanelProps) {
  const [sections, setSections] = useState<Array<{
    id: string;
    name: string;
    bars: number;
    notesPerBar: number;
    seed: string;
  }>>([
    { id: "A", name: "Verse", bars: 4, notesPerBar: 8, seed: "verse" },
    { id: "B", name: "Chorus", bars: 4, notesPerBar: 8, seed: "chorus" },
  ]);
  const [activeSectionId, setActiveSectionId] = useState("A");
  const [windowSize, setWindowSize] = useState(5);
  const [positionStart, setPositionStart] = useState<number | null>(null);
  const [includeAvoid, setIncludeAvoid] = useState(false);
  const [accentPattern, setAccentPattern] = useState<"straight" | "gallop" | "syncopated">("straight");
  const [palmMute, setPalmMute] = useState(false);
  const [tempoBpm, setTempoBpm] = useState(120);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const bars = activeSection?.bars ?? 2;
  const notesPerBar = activeSection?.notesPerBar ?? 8;
  const seed = activeSection?.seed ?? "riff";

  const totalSteps = Math.max(1, bars * notesPerBar);
  const usablePositions = useMemo(() => {
    const start = positionStart ?? 0;
    const end = start + windowSize;
    return scalePositions.filter((pos) =>
      pos.fret >= start
      && pos.fret <= end
      && (includeAvoid || !pos.is_avoid)
    );
  }, [scalePositions, includeAvoid, positionStart, windowSize]);

  const riffSteps = useMemo(() => {
    if (!usablePositions.length) return [] as RiffStep[];
    const seedValue = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = seededRandom(seedValue + totalSteps);
    const steps: RiffStep[] = [];
    for (let i = 0; i < totalSteps; i += 1) {
      const pick = usablePositions[Math.floor(rand() * usablePositions.length)];
      steps.push({ stringIndex: pick.string, fret: pick.fret });
    }
    return steps;
  }, [seed, totalSteps, usablePositions]);

  const asciiTab = useMemo(() => buildAsciiTab(riffSteps, tuningStrings, totalSteps), [riffSteps, tuningStrings, totalSteps]);
  const accentLine = useMemo(() => {
    const accents = Array.from({ length: totalSteps }, (_, index) => {
      if (accentPattern === "gallop") {
        return index % 4 === 0 ? ">" : index % 4 === 2 ? ">" : " ";
      }
      if (accentPattern === "syncopated") {
        return index % 4 === 1 || index % 4 === 3 ? ">" : " ";
      }
      return index % 4 === 0 ? ">" : " ";
    });
    return `Acc|${accents.join(" ")}|`;
  }, [accentPattern, totalSteps]);
  const exportLines = useMemo(() => {
    const lines: string[] = [];
    lines.push(accentLine);
    if (palmMute) {
      lines.push("PM|" + "~".repeat(Math.max(1, totalSteps * 3)) + "|");
    }
    lines.push(...asciiTab.split("\n"));
    return lines;
  }, [accentLine, asciiTab, palmMute, totalSteps]);

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
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Riff lab</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, color: "var(--color-text-primary)" }}>
          {selectedScale?.scale_root ?? harmonyRootName} {selectedScale?.scale_name ?? harmonyScaleName} · builder
        </div>
      </div>

      <div style={{
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "10px 12px",
        background: "var(--color-background-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Song sketch
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
              style={{
                border: activeSectionId === section.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                background: activeSectionId === section.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                color: activeSectionId === section.id ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 8px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {section.id} · {section.name}
            </button>
          ))}
        </div>
        {activeSection && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Section name
              <input
                type="text"
                value={activeSection.name}
                onChange={(event) => {
                  const value = event.target.value;
                  setSections((prev) => prev.map((section) => section.id === activeSection.id ? { ...section, name: value } : section));
                }}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Bars
              <input
                type="number"
                value={activeSection.bars}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSections((prev) => prev.map((section) => section.id === activeSection.id ? { ...section, bars: value } : section));
                }}
                min={1}
                max={16}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Notes / bar
              <input
                type="number"
                value={activeSection.notesPerBar}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSections((prev) => prev.map((section) => section.id === activeSection.id ? { ...section, notesPerBar: value } : section));
                }}
                min={4}
                max={16}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Seed
              <input
                type="text"
                value={activeSection.seed}
                onChange={(event) => {
                  const value = event.target.value;
                  setSections((prev) => prev.map((section) => section.id === activeSection.id ? { ...section, seed: value } : section));
                }}
                style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
              />
            </label>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              const nextId = String.fromCharCode(65 + sections.length);
              setSections((prev) => ([...prev, { id: nextId, name: "Bridge", bars: 4, notesPerBar: 8, seed: "bridge" }]));
              setActiveSectionId(nextId);
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
            Add section
          </button>
          {sections.length > 1 && (
            <button
              onClick={() => {
                setSections((prev) => prev.filter((section) => section.id !== activeSectionId));
                setActiveSectionId(sections[0]?.id ?? "A");
              }}
              style={{
                border: "0.5px solid var(--color-danger)",
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
                borderRadius: "var(--border-radius-md)",
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Remove section
            </button>
          )}
          <button
            onClick={() => onExportRiff(exportLines)}
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
            Export riff (txt)
          </button>
          <button
            onClick={() => onExportRiffMidi(riffSteps, tempoBpm)}
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
            Export MIDI
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
          Bars
          <select
            value={bars}
            onChange={(event) => {
              const value = Number(event.target.value);
              setSections((prev) => prev.map((section) => section.id === activeSectionId ? { ...section, bars: value } : section));
            }}
            style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
          >
            {[1, 2, 4, 8].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
          Notes / bar
          <select
            value={notesPerBar}
            onChange={(event) => {
              const value = Number(event.target.value);
              setSections((prev) => prev.map((section) => section.id === activeSectionId ? { ...section, notesPerBar: value } : section));
            }}
            style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
          >
            {[4, 8, 12, 16].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Window (frets)
            <select
              value={windowSize}
              onChange={(event) => setWindowSize(Number(event.target.value))}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            >
              {[4, 5, 6, 7, 8, 9, 10, 12].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Position start
            <input
              type="number"
              value={positionStart ?? 0}
              onChange={(event) => setPositionStart(Number(event.target.value))}
              min={0}
              max={24}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", fontSize: 12 }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Tempo BPM
            <input
              type="number"
              value={tempoBpm}
              onChange={(event) => setTempoBpm(Number(event.target.value))}
              min={40}
              max={240}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 11 }}
            />
          </label>
          <input
            type="text"
            value={seed}
            onChange={(event) => {
              const value = event.target.value;
              setSections((prev) => prev.map((section) => section.id === activeSectionId ? { ...section, seed: value } : section));
            }}
            placeholder="Seed"
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "6px 10px",
              fontSize: 11,
            }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <input
              type="checkbox"
              checked={includeAvoid}
              onChange={(event) => setIncludeAvoid(event.target.checked)}
            />
            Inclure notes d’évitement
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <input
              type="checkbox"
              checked={palmMute}
              onChange={(event) => setPalmMute(event.target.checked)}
            />
            Palm mute
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Accent pattern
            <select
              value={accentPattern}
              onChange={(event) => setAccentPattern(event.target.value as "straight" | "gallop" | "syncopated")}
              style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 11 }}
            >
              <option value="straight">Straight</option>
              <option value="gallop">Gallop</option>
              <option value="syncopated">Syncopated</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{
        padding: 12,
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        background: "var(--color-background-secondary)",
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          Tab preview
        </div>
        <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: "pre-wrap" }}>
          {exportLines.join("\n")}
        </pre>
      </div>
    </div>
  );
}
