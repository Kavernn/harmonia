import type { PracticeSessionSummary } from "../practice";

interface PracticeResultsPanelProps {
  summary: PracticeSessionSummary | null;
}

function formatStamp(value: string) {
  return new Date(value).toLocaleString("fr-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PracticeResultsPanel({ summary }: PracticeResultsPanelProps) {
  if (!summary) {
    return (
      <div style={{
        padding: 14,
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        background: "var(--color-background-primary)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Résultats</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
          Aucun workout terminé
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          Lance une session complète pour voir ton tempo propre, ton score moyen et ton meilleur passage.
        </div>
      </div>
    );
  }

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Dernière session</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {summary.exercise_name}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          padding: "4px 8px",
          borderRadius: 999,
          background: summary.reached_target_bpm ? "#E1F5EE" : "#FAECE7",
          color: summary.reached_target_bpm ? "#0F6E56" : "#993C1D",
          fontWeight: 700,
        }}>
          {summary.reached_target_bpm ? "tempo cible atteint" : "tempo cible non atteint"}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        {formatStamp(summary.started_at)} → {formatStamp(summary.ended_at)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Score moyen</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
            {summary.average_total_score}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Meilleur score</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
            {summary.best_total_score}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Meilleur BPM clean</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
            {summary.best_clean_bpm ?? "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Reps propres</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
            {summary.clean_rep_count}/{summary.rep_count}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        BPM final {summary.final_bpm} · cible {summary.target_bpm}
      </div>
    </div>
  );
}
