import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Harmonia] Uncaught error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 16,
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-sans)",
        padding: 32,
      }}>
        <div style={{ fontSize: 32 }}>⚠</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Une erreur inattendue s'est produite</div>
        <pre style={{
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px 16px",
          maxWidth: 600,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {error.message}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-accent-primary)",
            color: "var(--color-accent-contrast)",
            borderRadius: "var(--border-radius-md)",
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }
}
