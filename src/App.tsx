import { BeatMakerPanel } from "./components/BeatMakerPanel";
import { ControlSidebar } from "./components/ControlSidebar";
import { ProgressionJamPanel } from "./components/ProgressionJamPanel";
import { ScaleSuggestionsPanel } from "./components/ScaleSuggestionsPanel";
import { useComposerState } from "./hooks/useComposerState";

export default function App() {
  const {
    sidebarProps,
    scaleSuggestionsProps,
    beatMakerProps,
    progressionJamProps,
  } = useComposerState();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", fontFamily: "var(--font-sans)", background: "var(--color-background-primary)" }}>
      <ControlSidebar {...sidebarProps} />

      <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>
        <ScaleSuggestionsPanel {...scaleSuggestionsProps} />
        {beatMakerProps && <BeatMakerPanel {...beatMakerProps} />}
        {progressionJamProps && <ProgressionJamPanel {...progressionJamProps} />}
      </div>
    </div>
  );
}
