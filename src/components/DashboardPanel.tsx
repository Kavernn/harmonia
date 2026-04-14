import type { PracticeSessionSummary } from "../practice";

interface DashboardPanelProps {
  lastSession: PracticeSessionSummary | null;
  bestCleanBpm: number | null;
  streakClean: number;
  onOpenPractice: () => void;
  onOpenFretboard: () => void;
  onOpenRiff: () => void;
}

export function DashboardPanel({
  lastSession,
  bestCleanBpm,
  streakClean,
  onOpenPractice,
  onOpenFretboard,
  onOpenRiff,
}: DashboardPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        padding: 16,
        borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)",
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Today</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 6 }}>
          Practice dashboard
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
          <div style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Best clean BPM</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
              {bestCleanBpm ?? "—"}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Clean streak</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent-strong)", marginTop: 4 }}>
              {streakClean}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Last session</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>
              {lastSession
                ? `${lastSession.clean_rep_count}/${lastSession.rep_count} clean · ${lastSession.final_bpm} BPM`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
      }}>
        <button
          onClick={onOpenPractice}
          style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--border-radius-md)",
            padding: "14px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Practice</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Routines, BPM, precision
          </div>
        </button>
        <button
          onClick={onOpenFretboard}
          style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--border-radius-md)",
            padding: "14px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Fretboard</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Positions & mastery
          </div>
        </button>
        <button
          onClick={onOpenRiff}
          style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--border-radius-md)",
            padding: "14px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Riff</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Song sketch & ideas
          </div>
        </button>
      </div>
    </div>
  );
}
