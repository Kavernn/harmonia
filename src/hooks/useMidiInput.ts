import { useEffect, useRef, useState } from "react";
import { noteLabelFromMidi } from "../practiceMath";

export interface MidiNoteEvent {
  atMs: number;
  midi: number;
  velocity: number;
  noteLabel: string;
  inputId: string;
  inputName: string;
}

type MidiStatus = "idle" | "connecting" | "ready" | "unsupported" | "error";

function webMidiSupported() {
  return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
}

function isNoteOn(status: number, velocity: number) {
  return (status & 0xf0) === 0x90 && velocity > 0;
}

function readInputs(access: MIDIAccess | null) {
  if (!access) return [];

  return Array.from(access.inputs.values()).map((input) => ({
    id: input.id,
    name: input.name || "MIDI input",
    state: input.state,
  }));
}

export function useMidiInput(enabled: boolean) {
  const [status, setStatus] = useState<MidiStatus>(() => (webMidiSupported() ? "idle" : "unsupported"));
  const [error, setError] = useState<string | null>(() => (
    webMidiSupported() ? null : "Web MIDI n'est pas disponible sur cette machine."
  ));
  const [inputs, setInputs] = useState<Array<{ id: string; name: string; state: MIDIPortDeviceState }>>([]);
  const [lastEvent, setLastEvent] = useState<MidiNoteEvent | null>(null);
  const accessRef = useRef<MIDIAccess | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (!webMidiSupported()) {
      return;
    }

    let cancelled = false;
    const cleanupFns: Array<() => void> = [];

    async function connectMidi() {
      setStatus("connecting");

      try {
        const access = await navigator.requestMIDIAccess();
        if (cancelled) return;

        accessRef.current = access;
        setInputs(readInputs(access));
        setStatus("ready");
        setError(null);

        const attachInputs = () => {
          access.inputs.forEach((input) => {
            input.onmidimessage = (event) => {
              const data = event.data ?? new Uint8Array();
              const statusByte = data[0] ?? 0;
              const midi = data[1] ?? 0;
              const velocity = data[2] ?? 0;
              if (!isNoteOn(statusByte, velocity)) return;

              setLastEvent({
                atMs: performance.now(),
                midi,
                velocity,
                noteLabel: noteLabelFromMidi(midi),
                inputId: input.id,
                inputName: input.name || "MIDI input",
              });
            };
          });
        };

        attachInputs();

        const handleStateChange = () => {
          if (cancelled) return;
          setInputs(readInputs(access));
          attachInputs();
        };

        access.onstatechange = handleStateChange;
        cleanupFns.push(() => {
          access.onstatechange = null;
        });

        access.inputs.forEach((input) => {
          cleanupFns.push(() => {
            input.onmidimessage = null;
          });
        });
      } catch (reason) {
        if (cancelled) return;
        setStatus("error");
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    }

    void connectMidi();

    return () => {
      cancelled = true;
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [enabled]);

  return {
    supported: status !== "unsupported",
    status,
    error,
    inputs,
    lastEvent,
  };
}
