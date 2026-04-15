import { DRUM_VOICES, type BeatPattern } from "../music";

interface BeatMakerPanelProps {
  beatLibrary: BeatPattern[];
  beatPattern: BeatPattern;
  selectedBeatStyle: string;
  beatIntensity: number;
  beatSwing: number;
  beatPatternDirty: boolean;
  isBeatPlaying: boolean;
  onSelectBeatStyle: (styleId: string) => void;
  onBeatIntensityChange: (value: number) => void;
  onBeatSwingChange: (value: number) => void;
  onResetBeatPattern: () => void;
  onCycleBeatStep: (voice: string, step: number) => void;
  onStartBeat: () => void;
  onStopBeat: () => void;
}

export function BeatMakerPanel({
  beatLibrary,
  beatPattern,
  selectedBeatStyle,
  beatIntensity,
  beatSwing,
  beatPatternDirty,
  isBeatPlaying,
  onSelectBeatStyle,
  onBeatIntensityChange,
  onBeatSwingChange,
  onResetBeatPattern,
  onCycleBeatStep,
  onStartBeat,
  onStopBeat,
}: BeatMakerPanelProps) {
  const beatGridColumns = `88px repeat(${beatPattern.steps_per_bar}, 1fr)`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>
          Beatmaking — {beatPattern.name}
        </div>
        <button
          onClick={() => { if (isBeatPlaying) { onStopBeat(); } else { onStartBeat(); } }}
          style={{
            border: isBeatPlaying ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
            background: isBeatPlaying ? "var(--color-accent-primary)" : "var(--color-background-primary)",
            color: isBeatPlaying ? "var(--color-accent-contrast)" : "var(--color-text-secondary)",
            borderRadius: "var(--border-radius-md)",
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isBeatPlaying ? "Stop" : "Play"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {beatLibrary.map((pattern) => {
          const active = selectedBeatStyle === pattern.style_id;
          return (
            <button key={pattern.style_id} onClick={() => onSelectBeatStyle(pattern.style_id)} style={{
              border: active ? "1.5px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
              background: active ? "var(--color-accent-soft)" : "var(--color-background-primary)",
              color: active ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)", padding: "7px 10px", fontSize: 11,
              cursor: "pointer", fontWeight: active ? 500 : 400,
            }}>{pattern.style}</button>
          );
        })}
      </div>

      <div style={{
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        background: "var(--color-background-secondary)",
        padding: "14px 16px",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Intensity</span>
            <input type="range" min={40} max={127} step={1} value={beatIntensity}
              onChange={(e) => onBeatIntensityChange(Number(e.target.value))} style={{ flex: 1 }}/>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", minWidth: 28 }}>{beatIntensity}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Swing</span>
            <input type="range" min={0} max={75} step={1} value={beatSwing}
              onChange={(e) => onBeatSwingChange(Number(e.target.value))} style={{ flex: 1 }}/>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", minWidth: 28 }}>{beatSwing}</span>
          </div>
          <button onClick={onResetBeatPattern} disabled={!beatPatternDirty} style={{
            border: beatPatternDirty ? "0.5px solid var(--color-border-tertiary)" : "0.5px solid var(--color-border-secondary)",
            background: beatPatternDirty ? "var(--color-background-primary)" : "var(--color-background-secondary)",
            color: beatPatternDirty ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "7px 12px",
            fontSize: 11,
            cursor: beatPatternDirty ? "pointer" : "default",
          }}>
            Reset groove
          </button>
          <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "var(--color-text-tertiary)" }}>
            {beatPatternDirty ? "Edited locally" : "Preset groove"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: beatGridColumns, gap: 4, alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Steps</div>
            {Array.from({ length: beatPattern.steps_per_bar }, (_, step) => (
              <div key={step} style={{
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: step % 4 === 0 ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
              }}>
                {step + 1}
              </div>
            ))}
          </div>
          {DRUM_VOICES.map((voice) => (
            <div key={voice} style={{ display: "grid", gridTemplateColumns: beatGridColumns, gap: 4, alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{voice}</div>
              {Array.from({ length: beatPattern.steps_per_bar }, (_, step) => {
                const event = beatPattern.events.find((item) => item.voice === voice && item.step === step);
                const active = Boolean(event);
                const velocityLabel = !event ? "empty" : event.velocity < 72 ? "soft" : event.velocity < 108 ? "normal" : "accent";
                const accentAlpha = Math.max(0.2, (event?.velocity ?? 0) / 127);
                return (
                  <button key={step} type="button" onClick={() => onCycleBeatStep(voice, step)} title={`${voice} · step ${step + 1} · ${velocityLabel}${event ? ` · vel ${event.velocity}` : ""}`} style={{
                    height: 18,
                    borderRadius: 4,
                    border: step % 4 === 0 ? "1px solid var(--color-accent-primary)" : "0.5px solid var(--color-border-tertiary)",
                    background: active
                      ? `rgba(31, 202, 211, ${accentAlpha})`
                      : "var(--color-background-primary)",
                    boxShadow: active && event && event.velocity >= 108 ? "0 0 0 1px rgba(31, 202, 211, 0.28) inset" : "none",
                    cursor: "pointer",
                    padding: 0,
                  }}/>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, fontSize: 10, color: "var(--color-text-tertiary)" }}>
          <span>Clic: normal</span>
          <span>2e clic: accent</span>
          <span>3e clic: soft</span>
          <span>4e clic: off</span>
        </div>
      </div>
    </div>
  );
}
