import { useEffect, useRef, useState } from "react";
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
import { useTapTempo } from "./hooks/useTapTempo";

export default function App() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isLight, setIsLight] = useState(() => {
    return document.documentElement.classList.contains("light");
  });
  const [metronomeFlash, setMetronomeFlash] = useState(false);
  const prevBeatRef = useRef(-1);

  const {
    mainView,
    setMainView,
    sidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
    commandActions,
    isPlaying,
    currentBeat,
    onBpmChange,
    onSaveProject,
    onLoadProject,
    sidebarProps,
    scaleSuggestionsProps,
    beatMakerProps,
    practicePanelProps,
    progressionJamProps,
    fretboardMasteryProps,
    riffLabProps,
    dashboardProps,
  } = useComposerState();

  const { tap } = useTapTempo(onBpmChange);

  // Apply theme to :root
  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  // Visual metronome — flash on each beat 1 (currentBeat === 0)
  useEffect(() => {
    if (!isPlaying) { prevBeatRef.current = -1; return; }
    if (currentBeat === 0 && prevBeatRef.current !== 0) {
      setMetronomeFlash(true);
      const t = setTimeout(() => setMetronomeFlash(false), 120);
      prevBeatRef.current = 0;
      return () => clearTimeout(t);
    }
    if (currentBeat !== 0) {
      prevBeatRef.current = currentBeat;
    }
  }, [currentBeat, isPlaying]);

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
          background: isLight ? "rgba(245, 247, 251, 0.92)" : "rgba(12, 15, 19, 0.92)",
          borderBottom: metronomeFlash
            ? "1.5px solid var(--color-accent-primary)"
            : "0.5px solid var(--color-border-tertiary)",
          backdropFilter: "blur(12px)",
          transition: "border-color 80ms ease",
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
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: mainView === view.id ? 600 : 500,
                cursor: "pointer",
              }}>
                {view.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={onSaveProject}
              title="Sauvegarder le projet"
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "7px 10px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ↓ Sauvegarder
            </button>
            <button
              onClick={onLoadProject}
              title="Charger un projet"
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "7px 10px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ↑ Charger
            </button>
            <button
              onClick={tap}
              title="Tap pour définir le BPM"
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-accent-primary)",
                borderRadius: "var(--border-radius-md)",
                padding: "7px 12px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Tap
            </button>
            <button
              onClick={() => setIsLight((v) => !v)}
              title={isLight ? "Passer en mode sombre" : "Passer en mode clair"}
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "7px 10px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {isLight ? "🌙" : "☀"}
            </button>
            <button onClick={() => setShowShortcuts(true)} style={{
              border: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "7px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
            }}>
              ?
            </button>
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
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textAlign: "right" }}>
              ⌘K · Space · D·J·W·S·B·R·M · [ · ←/→
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

      {showShortcuts && (
        <div
          onClick={() => setShowShortcuts(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding: 24,
              minWidth: 360,
              maxWidth: 480,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Raccourcis clavier</div>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16 }}>✕</button>
            </div>
            {([
              { group: "Navigation", items: [
                ["D", "Dashboard"],
                ["J", "Jam"],
                ["W", "Practice"],
                ["S", "Palettes"],
                ["B", "Beat"],
                ["R", "Riff"],
                ["M", "Fretboard"],
                ["[", "Toggle sidebar"],
              ]},
              { group: "Transport", items: [
                ["Space", "Play / Stop"],
                ["← / →", "Accord précédent / suivant"],
                ["+ / -", "BPM +1 / -1"],
              ]},
              { group: "Fretboard", items: [
                ["1 / 2 / 3", "Labels: fonctions / degrés / notes"],
                ["T", "Tab guide"],
                ["P", "Phrase guide"],
                ["F", "Follow chord"],
              ]},
              { group: "Général", items: [
                ["⌘K ou /", "Palette de commandes"],
                ["Esc", "Fermer"],
                ["?", "Cette aide"],
              ]},
            ] as const).map(({ group, items }) => (
              <div key={group}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 6 }}>{group}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {items.map(([key, label]) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                      <kbd style={{
                        background: "var(--color-background-secondary)",
                        border: "0.5px solid var(--color-border-tertiary)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontSize: 11,
                        color: "var(--color-text-primary)",
                        fontFamily: "monospace",
                      }}>{key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
