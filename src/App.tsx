import { BeatMakerPanel } from "./components/BeatMakerPanel";
import { CommandPalette } from "./components/CommandPalette";
import { ControlSidebar } from "./components/ControlSidebar";
import { DashboardPanel } from "./components/DashboardPanel";
import { FretboardMasteryPanel } from "./components/FretboardMasteryPanel";
import { PracticePanel } from "./components/PracticePanel";
import { ProgressionJamPanel } from "./components/ProgressionJamPanel";
import { RiffLabPanel } from "./components/RiffLabPanel";
import { ScaleSuggestionsPanel } from "./components/ScaleSuggestionsPanel";
import { useComposerState } from "./hooks/useComposerState";

export default function App() {
  const {
    mainView,
    setMainView,
    sidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
    commandActions,
    sidebarProps,
    scaleSuggestionsProps,
    beatMakerProps,
    practicePanelProps,
    progressionJamProps,
    fretboardMasteryProps,
    riffLabProps,
    dashboardProps,
  } = useComposerState();

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${sidebarCollapsed ? "76px" : "280px"} 1fr`, minHeight: "100vh", fontFamily: "var(--font-sans)", background: "transparent" }}>
      <ControlSidebar {...sidebarProps} />

      <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "10px 0 12px",
          background: "rgba(12, 15, 19, 0.92)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {([
              { id: "dashboard", label: "Dashboard" },
              { id: "jam", label: "Jam" },
              { id: "practice", label: "Practice" },
              { id: "fretboard", label: "Fretboard" },
              { id: "riff", label: "Riff" },
              { id: "palettes", label: "Palettes" },
              { id: "beat", label: "Beat" },
            ] as const).map((view) => (
              <button key={view.id} onClick={() => setMainView(view.id)} style={{
                border: mainView === view.id ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                background: mainView === view.id ? "var(--color-accent-primary)" : "var(--color-background-primary)",
                color: mainView === view.id ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)",
                padding: "7px 12px",
                fontSize: 11,
                fontWeight: mainView === view.id ? 600 : 500,
                cursor: "pointer",
              }}>
                {view.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setCommandPaletteOpen(true)} style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)",
              padding: "7px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
            }}>
              Commandes
            </button>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Workflow:</span>
              {([
                { id: "practice", label: "Practice" },
                { id: "fretboard", label: "Fretboard" },
                { id: "riff", label: "Riff" },
              ] as const).map((view) => (
                <button
                  key={view.id}
                  onClick={() => setMainView(view.id)}
                  style={{
                    border: "0.5px solid var(--color-border-tertiary)",
                    background: mainView === view.id ? "var(--color-accent-soft)" : "var(--color-background-primary)",
                    color: mainView === view.id ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
                    borderRadius: "var(--border-radius-sm)",
                    padding: "4px 8px",
                    fontSize: 10,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "right" }}>
              `⌘K` actions · `Space` play/stop · `D` dashboard · `W` practice · `R` riff · `M` fretboard · `[` sidebar · `←/→` pas
            </div>
          </div>
        </div>

        {mainView === "dashboard" && <DashboardPanel {...dashboardProps} />}
        {mainView === "practice" && <PracticePanel {...practicePanelProps} />}
        {mainView === "fretboard" && <FretboardMasteryPanel {...fretboardMasteryProps} />}
        {mainView === "riff" && <RiffLabPanel {...riffLabProps} />}
        {mainView === "palettes" && <ScaleSuggestionsPanel {...scaleSuggestionsProps} />}
        {mainView === "jam" && progressionJamProps && <ProgressionJamPanel {...progressionJamProps} />}
        {mainView === "beat" && beatMakerProps && <BeatMakerPanel {...beatMakerProps} />}
      </div>

      {commandPaletteOpen && (
        <CommandPalette
          actions={commandActions}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}
    </div>
  );
}
