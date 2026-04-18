import { useEffect, useRef, useState } from "react";
import { NOTES } from "../music";
import { noteLabelFromMidi } from "../practiceMath";
import type { MidiNoteEvent } from "./useMidiInput";

function autocorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  }
  for (let i = SIZE - 1; i > SIZE / 2; i--) {
    if (Math.abs(buffer[i]) < threshold) { r2 = i; break; }
  }

  const trimmed = buffer.slice(r1, r2 + 1);
  const tLen = trimmed.length;
  const c = new Float32Array(tLen * 2);
  for (let i = 0; i < tLen; i++) {
    for (let j = 0; j < tLen; j++) {
      c[i + j] += trimmed[i] * trimmed[j];
    }
  }

  const d = c.slice(tLen);
  let maxval = -1, maxpos = -1;
  for (let i = 1; i < d.length; i++) {
    if ((d[i] ?? 0) > maxval) { maxval = d[i] ?? 0; maxpos = i; }
  }
  if (maxpos < 1) return -1;

  const y1 = d[maxpos - 1] ?? 0;
  const y2 = d[maxpos] ?? 0;
  const y3 = d[maxpos + 1] ?? 0;
  const denom = 2 * (2 * y2 - y1 - y3);
  const T0 = denom !== 0 ? maxpos + (y3 - y1) / denom : maxpos;
  return sampleRate / T0;
}

function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function useMicPitch(enabled: boolean) {
  const [lastEvent, setLastEvent] = useState<MidiNoteEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMidiRef = useRef(-1);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }
    activeRef.current = true;
    void startMic();
    return cleanup;
  }, [enabled]);

  function cleanup() {
    activeRef.current = false;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    lastMidiRef.current = -1;
  }

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (!activeRef.current) return;
        analyser.getFloatTimeDomainData(buffer);
        const freq = autocorrelate(buffer, ctx.sampleRate);
        if (freq > 50 && freq < 2100) {
          const midi = freqToMidi(freq);
          if (midi !== lastMidiRef.current && midi >= 28 && midi <= 108) {
            lastMidiRef.current = midi;
            setLastEvent({
              atMs: performance.now(),
              midi,
              velocity: 80,
              noteLabel: noteLabelFromMidi(midi),
              inputId: "mic",
              inputName: "Microphone",
            });
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setError(null);
    } catch {
      setError("Accès microphone refusé.");
    }
  }

  return { lastEvent, error };
}
