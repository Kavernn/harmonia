import type { PracticeSessionSummary } from "../practice";

interface PracticeHistoryPanelProps {
  history: PracticeSessionSummary[];
  onClear: () => void;
}

function formatStamp(value: string) {
  return new Date(value).toLocaleString("fr-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PracticeHistoryPanel({ history, onClear }: PracticeHistoryPanelProps) {
  return (
    <div style={{
      padding: 14,
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      background: "var(--color-background-primary)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Historique</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {history.length} session{history.length > 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={onClear}
          disabled={history.length === 0}
          style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: history.length === 0 ? "#E9E9EE" : "var(--color-background-primary)",
            color: history.length === 0 ? "#7A7A86" : "var(--color-text-secondary)",
            borderRadius: "var(--border-radius-md)",
            padding: "8px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: history.length === 0 ? "default" : "pointer",
          }}
        >
          Vider
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
        {history.length > 0 ? history.map((entry) => (
          <div
            key={entry.id}
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "10px 11px",
              background: "var(--color-background-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {entry.exercise_name}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                {formatStamp(entry.ended_at)}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              Score moyen {entry.average_total_score} · best {entry.best_total_score}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              Clean BPM {entry.best_clean_bpm ?? "—"} · final {entry.final_bpm} · reps {entry.clean_rep_count}/{entry.rep_count}
            </div>
          </div>
        )) : (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            Les sessions terminées apparaîtront ici.
          </div>
        )}
      </div>
    </div>
  );
}
