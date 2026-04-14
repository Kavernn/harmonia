import { ROMAN, canonicalScaleName, type CompatibleMode, type ScaleSuggestion } from "../music";

function Badge({ level }: { level: string }) {
  const tones: Record<string, [string, string]> = {
    high: ["var(--color-success-soft)", "var(--color-success)"],
    medium: ["var(--color-warning-soft)", "var(--color-warning)"],
    low: ["var(--color-danger-soft)", "var(--color-danger)"],
  };
  const [background, color] = tones[level] ?? tones.low;

  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background, color, fontWeight: 500 }}>
      {level}
    </span>
  );
}

interface ScaleSuggestionsPanelProps {
  harmonyRootName: string;
  harmonyScaleName: string;
  scales: ScaleSuggestion[];
  selectedScale: ScaleSuggestion | null;
  compatibleModes: CompatibleMode[];
  loading: boolean;
  error: string | null;
  onSelectScale: (scale: ScaleSuggestion) => void;
  onSelectCompatibleMode: (scaleRoot: string, scaleName: string) => void;
}

export function ScaleSuggestionsPanel({
  harmonyRootName,
  harmonyScaleName,
  scales,
  selectedScale,
  compatibleModes,
  loading,
  error,
  onSelectScale,
  onSelectCompatibleMode,
}: ScaleSuggestionsPanelProps) {
  const highlightedScale = selectedScale ?? scales[0] ?? null;

  return (
    <>
      <div style={{ paddingBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {harmonyRootName} {harmonyScaleName}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
            harmonie de la grille
          </span>
        </div>
        {highlightedScale && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Palette solo active: {highlightedScale.scale_root} {highlightedScale.scale_name}
            </div>
            <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
              {highlightedScale.reason}
            </span>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Notes communes avec la grille: {highlightedScale.matching_notes.join(" · ") || "aucune"}
            </div>
            {highlightedScale.characteristic_notes.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--color-accent-primary)" }}>
                Signature modale: {highlightedScale.characteristic_notes.join(" · ")}
                {highlightedScale.modal_avoid_notes.length > 0 ? ` · avoid: ${highlightedScale.modal_avoid_notes.join(" · ")}` : ""}
              </div>
            )}
            {highlightedScale.resolution_notes.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--color-accent-primary)" }}>
                Résolutions: {highlightedScale.resolution_notes.join(" · ")}
              </div>
            )}
            {typeof highlightedScale.matching_chords === "number" && typeof highlightedScale.total_chords === "number" && (
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Accords couverts sans friction: {highlightedScale.matching_chords}/{highlightedScale.total_chords}
              </div>
            )}
            {highlightedScale.outside_notes.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Notes couleur a gerer: {highlightedScale.outside_notes.join(" · ")}
              </div>
            )}
            {highlightedScale.mode && (
              <div style={{ fontSize: 12, color: "var(--color-accent-primary)" }}>
                Lecture modale: {highlightedScale.mode.name} depuis {ROMAN[highlightedScale.mode.degree]}
              </div>
            )}
          </div>
        )}
        {loading && <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>Analyse en cours…</div>}
        {error && <div style={{ fontSize: 12, color: "var(--color-danger)", marginTop: 4 }}>{error}</div>}
      </div>

      {compatibleModes.length > 1 && (
        <div style={{
          padding: "14px 0 16px",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
        }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
            Modes compatibles avec {harmonyRootName} {harmonyScaleName}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Même famille de notes, autre centre modal. Tu peux passer directement sur un mode relatif majeur, harmonique mineur ou mélodique mineur selon la couleur que tu veux entendre.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {compatibleModes.map((mode) => {
              const selected =
                selectedScale?.scale_root === mode.scale_root
                && canonicalScaleName(selectedScale?.scale_name ?? "") === canonicalScaleName(mode.scale_name);

              return (
                <button
                  key={`${mode.scale_root}-${mode.scale_name}`}
                  onClick={() => onSelectCompatibleMode(mode.scale_root, mode.scale_name)}
                  style={{
                    border: selected ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                    background: selected ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                    color: selected ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    padding: "7px 10px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                  title={mode.notes.join(" · ")}
                >
                  <span style={{ fontSize: 12, fontWeight: 500 }}>
                    {mode.scale_root} {mode.scale_name}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.72 }}>
                    {mode.notes.join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {scales.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            {scales.length} palette{scales.length > 1 ? "s" : ""} solo pour cette progression
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {scales.map((scale, index) => {
              const selected =
                selectedScale?.scale_root === scale.scale_root
                && canonicalScaleName(selectedScale?.scale_name ?? "") === canonicalScaleName(scale.scale_name);
              const borderColor =
                scale.confidence === "high" ? "var(--color-success)" : scale.confidence === "medium" ? "var(--color-warning)" : "var(--color-danger)";

              return (
                <div key={index} onClick={() => onSelectScale(scale)} style={{
                  border: selected ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                  borderLeft: selected ? "3px solid var(--color-accent-primary)" : `3px solid ${borderColor}`,
                  borderRadius: "var(--border-radius-md)",
                  padding: "9px 11px",
                  cursor: "pointer",
                  background: selected ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: selected ? "var(--color-accent-strong)" : "var(--color-text-primary)" }}>
                        {scale.scale_root} {scale.scale_name}
                      </div>
                      {scale.mode && (
                        <div style={{ fontSize: 11, color: "var(--color-accent-primary)", marginTop: 1 }}>
                          {scale.mode.name} — {ROMAN[scale.mode.degree]}
                        </div>
                      )}
                    </div>
                    <Badge level={scale.confidence} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 5 }}>
                    {scale.notes.join(" · ")}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 6 }}>
                    Notes d'accord dedans: {scale.matching_notes.length} · Tensions a gerer: {scale.outside_notes.length}
                  </div>
                  {scale.characteristic_notes.length > 0 && (
                    <div style={{ fontSize: 10, color: "var(--color-accent-primary)", marginTop: 4 }}>
                      Repère modal: {scale.characteristic_notes.join(" · ")}
                    </div>
                  )}
                  {typeof scale.matching_chords === "number" && typeof scale.total_chords === "number" && (
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                      Accords couverts: {scale.matching_chords}/{scale.total_chords}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                    {scale.reason}
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
