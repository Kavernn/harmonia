import { useRef } from "react";

const PROJECT_KEYS = [
  "harmonia.bpm",
  "harmonia.tuning-id",
  "harmonia.tempo-unit",
  "harmonia.strum-style",
  "harmonia.accompaniment-tone",
  "harmonia.master-volume",
  "harmonia.click-volume",
  "harmonia.guitar-volume",
  "harmonia.harmony-root",
  "harmonia.harmony-scale",
  "harmonia.min-confidence",
  "harmonia.solo-scale-root",
  "harmonia.solo-scale-name",
  "harmonia.active-steps",
  "harmonia.user-progressions",
];

export function useProjectFile() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function saveProject() {
    const project: Record<string, unknown> = { __version: 1 };
    for (const key of PROJECT_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { project[key] = JSON.parse(raw); } catch { project[key] = raw; }
      }
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "harmonia-project.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function loadProject() {
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,.harmonia";
      input.addEventListener("change", handleFileChange);
      fileInputRef.current = input;
    }
    fileInputRef.current.click();
  }

  function handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string) as Record<string, unknown>;
        for (const key of PROJECT_KEYS) {
          if (key in project) {
            localStorage.setItem(key, JSON.stringify(project[key]));
          }
        }
        window.location.reload();
      } catch {
        alert("Fichier de projet invalide.");
      }
    };
    reader.readAsText(file);
  }

  return { saveProject, loadProject };
}
