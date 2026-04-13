import { BeatMakerPanel } from "./components/BeatMakerPanel";
import { CommandPalette } from "./components/CommandPalette";
import { ControlSidebar } from "./components/ControlSidebar";
import { PracticePanel } from "./components/PracticePanel";
import { ProgressionJamPanel } from "./components/ProgressionJamPanel";
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
  } = useComposerState();

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${sidebarCollapsed ? "76px" : "280px"} 1fr`, minHeight: "100vh", fontFamily: "var(--font-sans)", background: "var(--color-background-primary)" }}>
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
          background: "var(--color-background-primary)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
        }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {([
              { id: "jam", label: "Jam" },
              { id: "practice", label: "Practice" },
              { id: "palettes", label: "Palettes" },
              { id: "beat", label: "Beat" },
            ] as const).map((view) => (
              <button key={view.id} onClick={() => setMainView(view.id)} style={{
                border: mainView === view.id ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: mainView === view.id ? "#534AB7" : "var(--color-background-primary)",
                color: mainView === view.id ? "#EEEDFE" : "var(--color-text-secondary)",
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
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "right" }}>
              `⌘K` actions · `Space` play/stop · `W` practice · `[` sidebar · `←/→` pas
            </div>
          </div>
        </div>

        {mainView === "practice" && <PracticePanel {...practicePanelProps} />}
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
