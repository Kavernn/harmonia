import { ROMAN, type ScaleSuggestion } from "../music";

function Badge({ level }: { level: string }) {
  const tones: Record<string, [string, string]> = {
    high: ["#E1F5EE", "#0F6E56"],
    medium: ["#FAEEDA", "#854F0B"],
    low: ["#FAECE7", "#993C1D"],
  };
  const [background, color] = tones[level] ?? tones.low;

  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background, color, fontWeight: 500 }}>
      {level}
    </span>
  );
}

interface ScaleSuggestionsPanelProps {
  rootName: string;
  qualityLabel: string;
  scales: ScaleSuggestion[];
  selectedScale: ScaleSuggestion | null;
  loading: boolean;
  error: string | null;
  onSelectScale: (scale: ScaleSuggestion) => void;
}

export function ScaleSuggestionsPanel({
  rootName,
  qualityLabel,
  scales,
  selectedScale,
  loading,
  error,
  onSelectScale,
}: ScaleSuggestionsPanelProps) {
  return (
    <>
      <div style={{ paddingBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {rootName} {qualityLabel}
          </span>
          {scales.length > 0 && (
            <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
              {scales[0].matching_notes.join(" · ")}
            </span>
          )}
        </div>
        {loading && <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>Analyzing…</div>}
        {error && <div style={{ fontSize: 12, color: "#993C1D", marginTop: 4 }}>{error}</div>}
      </div>

      {scales.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            {scales.length} compatible scale{scales.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {scales.map((scale, index) => {
              const selected =
                selectedScale?.scale_root === scale.scale_root
                && selectedScale?.scale_name === scale.scale_name;
              const borderColor =
                scale.confidence === "high" ? "#1D9E75" : scale.confidence === "medium" ? "#BA7517" : "#D85A30";

              return (
                <div key={index} onClick={() => onSelectScale(scale)} style={{
                  border: selected ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                  borderLeft: selected ? "3px solid #534AB7" : `3px solid ${borderColor}`,
                  borderRadius: "var(--border-radius-md)",
                  padding: "9px 11px",
                  cursor: "pointer",
                  background: selected ? "#EEEDFE" : "var(--color-background-primary)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: selected ? "#3C3489" : "var(--color-text-primary)" }}>
                        {scale.scale_root} {scale.scale_name}
                      </div>
                      {scale.mode && (
                        <div style={{ fontSize: 11, color: "#534AB7", marginTop: 1 }}>
                          {scale.mode.name} — {ROMAN[scale.mode.degree]}
                        </div>
                      )}
                    </div>
                    <Badge level={scale.confidence} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 5 }}>
                    {scale.notes.join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
