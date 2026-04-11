import { NOTES, QUALITIES, SHARPS, type TuningPreset } from "../music";

interface ControlSidebarProps {
  tuningPresets: TuningPreset[];
  selectedTuningId: string;
  root: number;
  quality: string;
  minConf: string;
  onSelectTuningId: (id: string) => void;
  onSelectRoot: (root: number) => void;
  onSelectQuality: (quality: string) => void;
  onSelectMinConfidence: (confidence: string) => void;
}

export function ControlSidebar({
  tuningPresets,
  selectedTuningId,
  root,
  quality,
  minConf,
  onSelectTuningId,
  onSelectRoot,
  onSelectQuality,
  onSelectMinConfidence,
}: ControlSidebarProps) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRight: "0.5px solid var(--color-border-tertiary)",
      padding: "18px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", paddingBottom: 14, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        Riff Composer
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400, marginTop: 2 }}>chord analyzer</div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Tuning</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 210, overflowY: "auto", paddingRight: 2 }}>
          {tuningPresets.map((preset) => (
            <button key={preset.id} onClick={() => onSelectTuningId(preset.id)} style={{
              border: selectedTuningId === preset.id ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
              background: selectedTuningId === preset.id ? "#EEEDFE" : "var(--color-background-primary)",
              color: selectedTuningId === preset.id ? "#3C3489" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "7px 10px",
              fontSize: 11,
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
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Root</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 3 }}>
          {NOTES.map((note, index) => (
            <button key={index} onClick={() => onSelectRoot(index)} style={{
              border: root === index ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
              background: root === index ? "#534AB7" : SHARPS.has(note) ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
              color: root === index ? "#EEEDFE" : SHARPS.has(note) ? "var(--color-text-secondary)" : "var(--color-text-primary)",
              borderRadius: "var(--border-radius-md)",
              padding: "5px 2px",
              fontSize: 11,
              cursor: "pointer",
            }}>
              {note}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Quality</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {QUALITIES.map((item) => (
            <button key={item.id} onClick={() => onSelectQuality(item.id)} style={{
              border: quality === item.id ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
              background: quality === item.id ? "#EEEDFE" : "var(--color-background-primary)",
              color: quality === item.id ? "#3C3489" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span>{item.label}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{item.intervals}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Min confidence</div>
        <div style={{ display: "flex", gap: 3 }}>
          {["high", "medium", "low"].map((confidence) => (
            <button key={confidence} onClick={() => onSelectMinConfidence(confidence)} style={{
              flex: 1,
              border: "0.5px solid var(--color-border-tertiary)",
              background: minConf === confidence ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
              color: minConf === confidence ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "5px 2px",
              fontSize: 10,
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
