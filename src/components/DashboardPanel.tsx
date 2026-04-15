import type { PracticeSessionSummary } from "../practice";

interface DashboardPanelProps {
  lastSession: PracticeSessionSummary | null;
  bestCleanBpm: number | null;
  streakClean: number;
  sessionHistory: PracticeSessionSummary[];
  onOpenPractice: () => void;
  onOpenFretboard: () => void;
  onOpenRiff: () => void;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMinutes(started: string, ended: string) {
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  const min = Math.round(ms / 60000);
  return min > 0 ? `${min}m` : "<1m";
}

export function DashboardPanel({
  lastSession,
  bestCleanBpm,
  streakClean,
  sessionHistory,
  onOpenPractice,
  onOpenFretboard,
  onOpenRiff,
}: DashboardPanelProps) {
  const totalSessions = sessionHistory.length;
  const totalMinutes = sessionHistory.reduce((acc, s) => {
    const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
    return acc + Math.round(ms / 60000);
  }, 0);

  // Last 7 sessions for mini chart
  const recentSessions = sessionHistory.slice(0, 7).reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI row */}
      <div style={{
        padding: 16,
        borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)",
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Practice dashboard</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
          <div style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Best clean BPM</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
              {bestCleanBpm ?? "—"}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Clean streak</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-accent-strong)", marginTop: 4 }}>
              {streakClean}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Sessions totales</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
              {totalSessions || "—"}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Temps total</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 4 }}>
              {totalMinutes > 0 ? `${totalMinutes}m` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* BPM progression chart (last 7 sessions) */}
      {recentSessions.length > 0 && (
        <div style={{
          padding: 14,
          borderRadius: "var(--border-radius-lg)",
          border: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-primary)",
        }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            Progression BPM — {recentSessions.length} dernières sessions
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
            {recentSessions.map((session, index) => {
              const maxBpm = Math.max(...recentSessions.map((s) => s.final_bpm), 1);
              const height = Math.max(8, Math.round((session.final_bpm / maxBpm) * 52));
              const cleanRate = session.rep_count > 0
                ? session.clean_rep_count / session.rep_count
                : 0;
              const barColor = cleanRate >= 0.8
                ? "var(--color-accent-primary)"
                : cleanRate >= 0.5
                  ? "var(--color-accent-soft)"
                  : "var(--color-border-tertiary)";
              return (
                <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>{session.final_bpm}</div>
                  <div style={{
                    width: "100%",
                    height,
                    borderRadius: 3,
                    background: barColor,
                  }} title={`${formatDate(session.started_at)} · ${session.clean_rep_count}/${session.rep_count} clean · ${session.final_bpm} BPM · ${formatMinutes(session.started_at, session.ended_at)}`} />
                  <div style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>
                    {formatDate(session.started_at)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 8 }}>
            Cyan = ≥80% clean · hover pour détails
          </div>
        </div>
      )}

      {/* Last session detail */}
      {lastSession && (
        <div style={{
          padding: 12,
          borderRadius: "var(--border-radius-lg)",
          border: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-primary)",
          fontSize: 12,
          color: "var(--color-text-secondary)",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>Dernière session</span>
          <span>{lastSession.exercise_name}</span>
          <span>{lastSession.clean_rep_count}/{lastSession.rep_count} clean</span>
          <span>{lastSession.final_bpm} BPM final</span>
          {lastSession.best_clean_bpm && <span>meilleur clean: {lastSession.best_clean_bpm} BPM</span>}
          <span>{formatMinutes(lastSession.started_at, lastSession.ended_at)}</span>
        </div>
      )}

      {/* Quick access */}
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
