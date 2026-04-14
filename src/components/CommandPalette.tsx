import { useEffect, useRef, useState } from "react";

export interface CommandAction {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  actions: CommandAction[];
  onClose: () => void;
}

function matchesQuery(action: CommandAction, query: string) {
  const haystack = `${action.label} ${action.group} ${action.keywords ?? ""}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = actions.filter((action) => matchesQuery(action, query));

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (filtered.length === 0) return;
        setActiveIndex((current) => Math.max(0, Math.min(filtered.length - 1, current + 1)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (filtered.length === 0) return;
        setActiveIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const action = filtered[activeIndex];
        if (!action) return;
        action.run();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeIndex, filtered, onClose]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(9, 10, 14, 0.32)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      paddingTop: 72,
    }} onClick={onClose}>
      <div style={{
        width: "min(720px, calc(100vw - 32px))",
        borderRadius: 14,
        border: "0.5px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.18)",
        overflow: "hidden",
      }} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: 12, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Action, tonalité, harmonie, accordage…"
            style={{
              width: "100%",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10,
              padding: "11px 12px",
              fontSize: 14,
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        <div style={{ maxHeight: "min(60vh, 540px)", overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 14, fontSize: 12, color: "var(--color-text-tertiary)" }}>
              Aucun résultat.
            </div>
          )}

          {filtered.map((action, index) => {
            const active = index === activeIndex;
            const previousGroup = filtered[index - 1]?.group;
            const showGroup = previousGroup !== action.group;

            return (
              <div key={action.id}>
                {showGroup && (
                  <div style={{
                    padding: "10px 10px 6px",
                    fontSize: 10,
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}>
                    {action.group}
                  </div>
                )}

                <button
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    action.run();
                    onClose();
                  }}
                  style={{
                    width: "100%",
                    border: active ? "1.5px solid var(--color-accent-primary)" : "0.5px solid transparent",
                    background: active ? "var(--color-accent-soft)" : "transparent",
                    color: active ? "var(--color-accent-strong)" : "var(--color-text-primary)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{action.label}</span>
                  <span style={{ fontSize: 10, color: active ? "var(--color-accent-primary)" : "var(--color-text-tertiary)" }}>
                    Enter
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
