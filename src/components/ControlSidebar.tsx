import { HARMONY_SCALES, NOTES, SHARPS, type TuningPreset } from "../music";

interface ControlSidebarProps {
  tuningPresets: TuningPreset[];
  selectedTuningId: string;
  harmonyRoot: number;
  harmonyScaleName: string;
  minConf: string;
  collapsed: boolean;
  filterText: string;
  onSelectTuningId: (id: string) => void;
  onSelectHarmonyRoot: (root: number) => void;
  onSelectHarmonyScaleName: (scaleName: string) => void;
  onSelectMinConfidence: (confidence: string) => void;
  onToggleCollapsed: () => void;
  onFilterTextChange: (value: string) => void;
}

export function ControlSidebar({
  tuningPresets,
  selectedTuningId,
  harmonyRoot,
  harmonyScaleName,
  minConf,
  collapsed,
  filterText,
  onSelectTuningId,
  onSelectHarmonyRoot,
  onSelectHarmonyScaleName,
  onSelectMinConfidence,
  onToggleCollapsed,
  onFilterTextChange,
}: ControlSidebarProps) {
  const query = filterText.trim().toLowerCase();
  const visibleTunings = tuningPresets.filter((preset) => {
    if (!query) return true;
    return `${preset.name} ${preset.strings.join(" ")}`.toLowerCase().includes(query);
  });
  const visibleHarmonyScales = HARMONY_SCALES.filter((item) => {
    if (!query) return true;
    return `${item.label} ${item.detail}`.toLowerCase().includes(query);
  });
  const selectedTuning = tuningPresets.find((preset) => preset.id === selectedTuningId);

  if (collapsed) {
    return (
      <div style={{
        background: "var(--color-background-secondary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        padding: "18px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
      }}>
        <button onClick={onToggleCollapsed} title="Ouvrir le setup" style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-primary)",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
        }}>
          ›
        </button>

        {[
          { label: "Key", value: NOTES[harmonyRoot] },
          { label: "Mode", value: harmonyScaleName.replace("Minor", "Min") },
          { label: "Tune", value: selectedTuning?.name.replace(" cordes Standard ", "") ?? selectedTuningId },
          { label: "Fit", value: minConf },
        ].map((item) => (
          <div key={item.label} title={`${item.label}: ${item.value}`} style={{
            width: "100%",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 10,
            background: "var(--color-background-primary)",
            padding: "8px 4px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 9, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {item.label}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-primary)", fontWeight: 600, marginTop: 2 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRight: "0.5px solid var(--color-border-tertiary)",
      padding: "18px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>
      <div style={{ paddingBottom: 14, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Setup
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400, marginTop: 2 }}>tonalité, accordage, filtre de palette</div>
          </div>
          <button onClick={onToggleCollapsed} title="Réduire le setup" style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-primary)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
          }}>
            ‹
          </button>
        </div>

        <input
          value={filterText}
          onChange={(event) => onFilterTextChange(event.target.value)}
          placeholder="Filtrer accordage ou harmonie…"
          style={{
            width: "100%",
            marginTop: 10,
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "8px 10px",
            fontSize: 12,
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>

      <div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Accordage</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 210, overflowY: "auto", paddingRight: 2 }}>
          {visibleTunings.map((preset) => (
            <button key={preset.id} onClick={() => onSelectTuningId(preset.id)} style={{
              border: selectedTuningId === preset.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
              background: selectedTuningId === preset.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
              color: selectedTuningId === preset.id ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "7px 10px",
              fontSize: 12,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}>
              <span style={{ fontWeight: 500 }}>{preset.name}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{preset.strings.join(" · ")}</span>
            </button>
          ))}
          {visibleTunings.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "4px 2px" }}>
              Aucun accordage.
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Centre tonal</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 3 }}>
          {NOTES.map((note, index) => (
            <button key={index} onClick={() => onSelectHarmonyRoot(index)} style={{
              border: harmonyRoot === index ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
              background: harmonyRoot === index ? "var(--color-accent-primary)" : SHARPS.has(note) ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
              color: harmonyRoot === index ? "var(--color-accent-contrast)" : SHARPS.has(note) ? "var(--color-text-secondary)" : "var(--color-text-primary)",
              borderRadius: "var(--border-radius-md)",
              padding: "5px 2px",
              fontSize: 12,
              cursor: "pointer",
            }}>
              {note}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Harmonie</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
          {visibleHarmonyScales.map((item) => (
            <button key={item.id} onClick={() => onSelectHarmonyScaleName(item.id)} style={{
              border: harmonyScaleName === item.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
              background: harmonyScaleName === item.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
              color: harmonyScaleName === item.id ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span>{item.label}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{item.detail}</span>
            </button>
          ))}
          {visibleHarmonyScales.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "4px 2px" }}>
              Aucune harmonie.
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Fit palette solo</div>
        <div style={{ display: "flex", gap: 3 }}>
          {["high", "medium", "low"].map((confidence) => (
            <button key={confidence} onClick={() => onSelectMinConfidence(confidence)} style={{
              flex: 1,
              border: "0.5px solid var(--color-border-tertiary)",
              background: minConf === confidence ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
              color: minConf === confidence ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "5px 2px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: minConf === confidence ? 500 : 400,
            }}>
              {confidence}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
