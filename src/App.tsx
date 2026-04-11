import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

declare global {
  interface Window {
    MIDI?: {
      Soundfont?: Record<string, Record<string, string>>;
    };
  }
}

// --- Types ---

interface ScaleSuggestion {
  scale_name: string;
  scale_root: string;
  confidence: "high" | "medium" | "low";
  matching_notes: string[];
  outside_notes: string[];
  notes: string[];
  mode: { name: string; degree: number; root: string } | null;
}

interface NamedProgression {
  name: string;
  degrees: number[];
  feel: string;
}

interface ProgressionChord {
  degree: number;
  roman: string;
  display_name: string;
  quality: string;
  chord_tones: string[];
  scale_tones: string[];
}

interface FretPosition {
  string: number;
  fret: number;
  note: string;
  is_chord_tone: boolean;
  is_root?: boolean;
  is_avoid?: boolean;
}

type NoteValueId = "whole" | "half" | "quarter" | "eighth" | "sixteenth";

// --- Constants ---

const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const SHARPS = new Set(["C#","D#","F#","G#","A#"]);
const QUALITIES = [
  { id: "major",      label: "Major",  intervals: "R 3 5" },
  { id: "minor",      label: "Minor",  intervals: "R ♭3 5" },
  { id: "power",      label: "Power",  intervals: "R 5" },
  { id: "diminished", label: "Dim",    intervals: "R ♭3 ♭5" },
  { id: "sus2",       label: "Sus2",   intervals: "R 2 5" },
  { id: "sus4",       label: "Sus4",   intervals: "R 4 5" },
];
const ROMAN = ["I","II","III","IV","V","VI","VII"];
const NOTE_VALUES: { id: NoteValueId; label: string; short: string; symbol: string; quarters: number }[] = [
  { id: "whole", label: "Ronde", short: "ronde", symbol: "◯", quarters: 4 },
  { id: "half", label: "Blanche", short: "blanche", symbol: "𝅗𝅥", quarters: 2 },
  { id: "quarter", label: "Noire", short: "noire", symbol: "♩", quarters: 1 },
  { id: "eighth", label: "Croche", short: "croche", symbol: "♪", quarters: 0.5 },
  { id: "sixteenth", label: "Double croche", short: "double", symbol: "♬", quarters: 0.25 },
];

// --- Audio Engine ---

function useAudio(masterVolume: number, clickVolume: number, guitarVolume: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const clickBusRef = useRef<GainNode | null>(null);
  const guitarBusRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const soundfontRef = useRef<Record<string, string> | null>(null);
  const soundfontPromiseRef = useRef<Promise<Record<string, string> | null> | null>(null);
  const sampleCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const activeChordGainRef = useRef<GainNode | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }

  function getMaster(): GainNode {
    const ctx = getCtx();
    if (!masterRef.current) {
      const master = ctx.createGain();
      master.gain.value = masterVolume;
      master.connect(getCompressor());
      masterRef.current = master;
    }
    masterRef.current.gain.value = masterVolume;
    return masterRef.current;
  }

  function getClickBus(): GainNode {
    const ctx = getCtx();
    if (!clickBusRef.current) {
      const bus = ctx.createGain();
      bus.gain.value = clickVolume;
      bus.connect(getMaster());
      clickBusRef.current = bus;
    }
    clickBusRef.current.gain.value = clickVolume;
    return clickBusRef.current;
  }

  function getGuitarBus(): GainNode {
    const ctx = getCtx();
    if (!guitarBusRef.current) {
      const bus = ctx.createGain();
      bus.gain.value = guitarVolume;
      bus.connect(getMaster());
      guitarBusRef.current = bus;
    }
    guitarBusRef.current.gain.value = guitarVolume;
    return guitarBusRef.current;
  }

  function getCompressor(): DynamicsCompressorNode {
    const ctx = getCtx();
    if (!compressorRef.current) {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;
      compressor.connect(ctx.destination);
      compressorRef.current = compressor;
    }
    return compressorRef.current;
  }

  async function unlockAudio() {
    const ctx = getCtx();
    getMaster();
    getClickBus();
    getGuitarBus();
    if (ctx.state !== "running") {
      await ctx.resume();
    }
  }

  async function loadGuitarSoundfont() {
    if (soundfontRef.current) return soundfontRef.current;
    if (soundfontPromiseRef.current) return soundfontPromiseRef.current;

    soundfontPromiseRef.current = new Promise<Record<string, string> | null>((resolve, reject) => {
      const existing = window.MIDI?.Soundfont?.acoustic_guitar_steel;
      if (existing) {
        soundfontRef.current = existing;
        resolve(existing);
        return;
      }

      const script = document.createElement("script");
      script.src = "/soundfonts/acoustic_guitar_steel-mp3.js";
      script.async = true;
      script.onload = () => {
        const loaded = window.MIDI?.Soundfont?.acoustic_guitar_steel ?? null;
        soundfontRef.current = loaded;
        resolve(loaded);
      };
      script.onerror = () => reject(new Error("Unable to load acoustic guitar soundfont"));
      document.head.appendChild(script);
    });

    return soundfontPromiseRef.current;
  }

  function playClick(isDownbeat: boolean, when?: number) {
    const ctx = getCtx();
    const clickBus = getClickBus();
    const osc = ctx.createOscillator();
    const transient = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const startTime = when ?? ctx.currentTime;
    osc.type = "triangle";
    transient.type = "sine";
    osc.frequency.value = isDownbeat ? 1480 : 1120;
    transient.frequency.value = isDownbeat ? 2200 : 1680;
    filter.type = "bandpass";
    filter.frequency.value = isDownbeat ? 1650 : 1350;
    filter.Q.value = 1.1;
    osc.connect(filter);
    transient.connect(filter);
    filter.connect(gain);
    gain.connect(clickBus);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(isDownbeat ? 0.18 : 0.1, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.035);
    osc.start(startTime);
    transient.start(startTime);
    osc.stop(startTime + 0.04);
    transient.stop(startTime + 0.016);
  }

  function midiToFreq(midi: number) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function midiToNoteName(midi: number) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    return `${names[midi % 12]}${octave}`;
  }

  function buildGuitarVoicing(chordTones: string[]) {
    const pitchClassToSemi: Record<string, number> = {
      "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
      "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11,
    };
    const stringMidis = [40, 45, 50, 55, 59, 64];

    return stringMidis.map((openMidi, stringIndex) => {
      const targetPc = chordTones[stringIndex % Math.max(chordTones.length, 1)];
      const semitone = pitchClassToSemi[targetPc];
      if (semitone === undefined) return null;

      let midi = openMidi;
      while (midi % 12 !== semitone) midi += 1;
      while (midi < openMidi + 3) midi += 12;
      while (midi > openMidi + 12) midi -= 12;

      return midi;
    }).filter((midi): midi is number => midi !== null);
  }

  async function getSampleBuffer(noteName: string) {
    const cached = sampleCacheRef.current.get(noteName);
    if (cached) return cached;

    const soundfont = await loadGuitarSoundfont();
    const dataUri = soundfont?.[noteName];
    if (!dataUri) return null;

    const response = await fetch(dataUri);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await getCtx().decodeAudioData(arrayBuffer.slice(0));
    sampleCacheRef.current.set(noteName, buffer);
    return buffer;
  }

  function pluckString(freq: number, when: number, velocity: number, destination: AudioNode) {
    const ctx = getCtx();
    const body = ctx.createBiquadFilter();
    const tone = ctx.createBiquadFilter();
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    const stringGain = ctx.createGain();
    const exciterGain = ctx.createGain();
    const burstDuration = Math.max(0.015, 1 / freq);
    const burstBuffer = ctx.createBuffer(1, Math.max(2, Math.floor(ctx.sampleRate * burstDuration)), ctx.sampleRate);
    const burstData = burstBuffer.getChannelData(0);
    for (let i = 0; i < burstData.length; i += 1) {
      const taper = 1 - i / burstData.length;
      burstData[i] = (Math.random() * 2 - 1) * taper;
    }
    const exciter = ctx.createBufferSource();
    exciter.buffer = burstBuffer;
    const pickFilter = ctx.createBiquadFilter();
    const pickGain = ctx.createGain();

    delay.delayTime.value = 1 / freq;
    feedback.gain.value = 0.965 - Math.min(0.12, freq / 12000);

    body.type = "bandpass";
    body.frequency.value = Math.min(2400, Math.max(140, freq * 2.2));
    body.Q.value = 0.9;

    tone.type = "lowpass";
    tone.frequency.value = Math.min(5200, Math.max(1800, freq * 7));
    tone.Q.value = 0.2;

    stringGain.gain.setValueAtTime(0.0001, when);
    stringGain.gain.linearRampToValueAtTime(0.18 * velocity, when + 0.007);
    stringGain.gain.exponentialRampToValueAtTime(0.001, when + 1.35);

    exciterGain.gain.setValueAtTime(0.26 * velocity, when);
    exciterGain.gain.exponentialRampToValueAtTime(0.001, when + burstDuration);

    pickFilter.type = "bandpass";
    pickFilter.frequency.value = Math.min(5200, Math.max(1800, freq * 9));
    pickFilter.Q.value = 1.1;
    pickGain.gain.setValueAtTime(0.05 * velocity, when);
    pickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.03);

    exciter.connect(exciterGain);
    exciterGain.connect(delay);
    delay.connect(body);
    body.connect(tone);
    tone.connect(stringGain);
    stringGain.connect(destination);
    tone.connect(feedback);
    feedback.connect(delay);

    exciter.connect(pickFilter);
    pickFilter.connect(pickGain);
    pickGain.connect(destination);

    exciter.start(when);
    exciter.stop(when + burstDuration);
  }

  async function preloadChordSamples(chordTones: string[]) {
    const voicing = buildGuitarVoicing(chordTones);
    await loadGuitarSoundfont();
    await Promise.all(voicing.map((midi) => getSampleBuffer(midiToNoteName(midi)).catch(() => null)));
  }

  function playSampledString(noteName: string, when: number, velocity: number, destination: AudioNode) {
    const ctx = getCtx();

    void getSampleBuffer(noteName).then((buffer) => {
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const tone = ctx.createBiquadFilter();

      tone.type = "lowpass";
      tone.frequency.value = 4200;
      tone.Q.value = 0.1;

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.52 * velocity, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, when + Math.min(1.25, buffer.duration));

      source.buffer = buffer;
      source.connect(tone);
      tone.connect(gain);
      gain.connect(destination);
      source.start(when);
    }).catch(() => null);
  }

  function playChordStrum(chordTones: string[], when?: number) {
    const ctx = getCtx();
    const startTime = when ?? ctx.currentTime;
    const voicing = buildGuitarVoicing(chordTones);
    const guitarBus = getGuitarBus();
    const chordGain = ctx.createGain();

    chordGain.gain.setValueAtTime(0.0001, startTime);
    chordGain.gain.linearRampToValueAtTime(1, startTime + 0.01);
    chordGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
    chordGain.connect(guitarBus);

    if (activeChordGainRef.current) {
      activeChordGainRef.current.gain.cancelScheduledValues(startTime);
      activeChordGainRef.current.gain.setValueAtTime(Math.max(0.0001, activeChordGainRef.current.gain.value), startTime);
      activeChordGainRef.current.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
    }
    activeChordGainRef.current = chordGain;

    voicing.forEach((midi, i) => {
      const delay = i * 0.018;
      const velocity = 1 - i * 0.08;
      const noteName = midiToNoteName(midi);
      if (sampleCacheRef.current.has(noteName)) {
        playSampledString(noteName, startTime + delay, Math.max(0.55, velocity), chordGain);
      } else {
        pluckString(midiToFreq(midi), startTime + delay, Math.max(0.55, velocity), chordGain);
      }
    });
  }

  function stopAllSounds() {
    const ctx = ctxRef.current;
    if (!ctx || !activeChordGainRef.current) return;
    const now = ctx.currentTime;
    activeChordGainRef.current.gain.cancelScheduledValues(now);
    activeChordGainRef.current.gain.setValueAtTime(Math.max(0.0001, activeChordGainRef.current.gain.value), now);
    activeChordGainRef.current.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  }

  return { unlockAudio, preloadChordSamples, playClick, playChordStrum, stopAllSounds };
}

// ============================================================
// REMPLACE tout le bloc "// --- Fretboard ---" jusqu'à la
// fin du composant Fretboard dans App.tsx
// ============================================================

// --- Fretboard ---

const STRING_COUNT = 6;
const FB_W = 900;
const FB_H = 200;
const FB_LEFT = 58;
const FB_RIGHT = FB_W - 20;
const FB_TOP = 24;
const FB_BOT = FB_H - 32;
const STRING_H = (FB_BOT - FB_TOP) / (STRING_COUNT - 1);
const STRING_LABELS = ["e", "B", "G", "D", "A", "E"];
const STRING_THICKNESS = [0.8, 1.0, 1.2, 1.5, 2.0, 2.5];
const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const DOUBLE_DOTS = new Set([12, 24]);

// CAGED shapes — intervals from root for each shape
const CAGED_SHAPES: Record<string, { name: string; intervals: number[] }> = {
  C: { name: "C shape", intervals: [0, 3, 7, 12, 15, 19] },
  A: { name: "A shape", intervals: [0, 4, 7, 12, 16, 19] },
  G: { name: "G shape", intervals: [0, 4, 7, 11, 16, 19] },
  E: { name: "E shape", intervals: [0, 4, 7, 12, 16, 24] },
  D: { name: "D shape", intervals: [0, 5, 9, 14, 17, 21] },
};

function detectCagedShape(rootNote: string, windowStart: number): string {
  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const rootIdx = NOTES.indexOf(rootNote);
  // Simple heuristic based on fret position and root
  if (windowStart <= 2) return rootIdx <= 4 ? "E" : "C";
  if (windowStart <= 5) return "D";
  if (windowStart <= 7) return "C";
  if (windowStart <= 9) return "A";
  return "G";
}

function stringY(s: number) { return FB_BOT - s * STRING_H; }

function Fretboard({
  scalePositions,
  chordTones,
  rootNote,
  windowStart,
  windowSize,
  showAvoid,
  flash,
}: {
  scalePositions: FretPosition[];
  chordTones: string[];
  rootNote: string;
  windowStart: number;
  windowSize: number;
  showAvoid: boolean;
  flash: boolean;
}) {
  const FRET_W = (FB_RIGHT - FB_LEFT) / windowSize;

  function fretX(f: number) { return FB_LEFT + f * FRET_W; }
  function fretCenterX(f: number) { return FB_LEFT + (f - 0.5) * FRET_W; }

  // Filter + annotate positions
  const visible = scalePositions
    .map(p => ({
      ...p,
      is_chord_tone: p.is_chord_tone || chordTones.includes(p.note),
      is_root: p.is_root || (p.note === rootNote && chordTones.includes(p.note)),
      is_avoid: p.is_avoid ?? false,
    }))
    .filter(p => {
      const rel = p.fret - windowStart;
      return rel >= 0 && rel <= windowSize;
    });

  const fretNumbers = Array.from({ length: windowSize }, (_, i) => windowStart + i + 1);
  const cagedShape = detectCagedShape(rootNote, windowStart);

  return (
    <div style={{ position: "relative" }}>
      {/* CAGED indicator */}
      <div style={{ position: "absolute", top: 0, right: 0, fontSize: 10, color: "#534AB7", opacity: 0.7 }}>
        {CAGED_SHAPES[cagedShape]?.name ?? ""}
      </div>

      <svg viewBox={`0 0 ${FB_W} ${FB_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Background */}
        <rect x="0" y="0" width={FB_W} height={FB_H} rx="8" fill="#161616"/>

        {/* Flash overlay on chord change */}
        {flash && <rect x="0" y="0" width={FB_W} height={FB_H} rx="8" fill="#534AB7" opacity="0.08"/>}

        {/* Nut or position marker */}
        {windowStart === 0
          ? <rect x={FB_LEFT - 5} y={FB_TOP} width={6} height={FB_BOT - FB_TOP} fill="#999"/>
          : <text x={FB_LEFT - 8} y={FB_TOP + (FB_BOT - FB_TOP) / 2 + 4} textAnchor="end" fontSize={10} fill="#555">{windowStart + 1}fr</text>
        }

        {/* Fret lines */}
        {Array.from({ length: windowSize + 1 }, (_, i) => (
          <line key={i} x1={fretX(i)} y1={FB_TOP} x2={fretX(i)} y2={FB_BOT} stroke="#2a2a2a" strokeWidth={1.5}/>
        ))}

        {/* Fret marker dots */}
        {fretNumbers.map((fn, i) => {
          if (!FRET_MARKERS.has(fn)) return null;
          const cx = fretCenterX(i + 1);
          const cy = (FB_TOP + FB_BOT) / 2;
          if (DOUBLE_DOTS.has(fn)) {
            return (
              <g key={i}>
                <circle cx={cx} cy={cy - STRING_H} r={3} fill="#2a2a2a"/>
                <circle cx={cx} cy={cy + STRING_H} r={3} fill="#2a2a2a"/>
              </g>
            );
          }
          return <circle key={i} cx={cx} cy={cy} r={3} fill="#2a2a2a"/>;
        })}

        {/* Fret numbers */}
        {fretNumbers.map((fn, i) => (
          <text key={i} x={fretCenterX(i + 1)} y={FB_H - 10} textAnchor="middle" fontSize={10} fill="#444">{fn}</text>
        ))}

        {/* String labels */}
        {STRING_LABELS.map((label, i) => (
          <text key={i} x={FB_LEFT - 14} y={stringY(i) + 4} textAnchor="middle" fontSize={10} fill="#555">{label}</text>
        ))}

        {/* Strings */}
        {Array.from({ length: STRING_COUNT }, (_, i) => (
          <line key={i} x1={FB_LEFT} y1={stringY(i)} x2={FB_RIGHT} y2={stringY(i)} stroke="#555" strokeWidth={STRING_THICKNESS[i]}/>
        ))}

        {/* Avoid notes (behind everything) */}
        {showAvoid && visible.filter(p => p.is_avoid).map((p, i) => {
          const x = p.fret === 0 ? FB_LEFT - 20 : fretCenterX(p.fret - windowStart);
          return (
            <g key={`avoid-${i}`}>
              <circle cx={x} cy={stringY(p.string)} r={7} fill="#A32D2D" opacity={0.4}/>
              <text x={x} y={stringY(p.string) + 4} textAnchor="middle" fontSize={7} fill="#F09595" opacity={0.8}>{p.note}</text>
            </g>
          );
        })}

        {/* Scale tones (not chord tones) */}
        {visible.filter(p => !p.is_chord_tone && !p.is_avoid).map((p, i) => {
          const x = p.fret === 0 ? FB_LEFT - 20 : fretCenterX(p.fret - windowStart);
          return (
            <g key={`scale-${i}`}>
              <circle cx={x} cy={stringY(p.string)} r={8} fill="#1D9E75"/>
              <text x={x} y={stringY(p.string) + 4} textAnchor="middle" fontSize={8} fontWeight="500" fill="#E1F5EE">{p.note}</text>
            </g>
          );
        })}

        {/* Chord tones (non-root) */}
        {visible.filter(p => p.is_chord_tone && !p.is_root).map((p, i) => {
          const x = p.fret === 0 ? FB_LEFT - 20 : fretCenterX(p.fret - windowStart);
          return (
            <g key={`chord-${i}`}>
              <circle cx={x} cy={stringY(p.string)} r={11} fill="#534AB7"/>
              <text x={x} y={stringY(p.string) + 4} textAnchor="middle" fontSize={9} fontWeight="500" fill="#EEEDFE">{p.note}</text>
            </g>
          );
        })}

        {/* Root notes — square + distinct color */}
        {visible.filter(p => p.is_root).map((p, i) => {
          const x = p.fret === 0 ? FB_LEFT - 20 : fretCenterX(p.fret - windowStart);
          const y = stringY(p.string);
          return (
            <g key={`root-${i}`}>
              <rect x={x - 11} y={y - 11} width={22} height={22} rx={4} fill="#EF9F27"/>
              <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fontWeight="500" fill="#412402">{p.note}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- Beat dots ---

function BeatDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 12 : 8,
          height: i === current ? 12 : 8,
          borderRadius: "50%",
          background: i === current ? "#534AB7" : "var(--color-border-secondary)",
          transition: "all 0.05s ease",
        }}/>
      ))}
    </div>
  );
}

// --- Helpers ---

function Badge({ level }: { level: string }) {
  const s: Record<string, [string, string]> = {
    high:   ["#E1F5EE", "#0F6E56"],
    medium: ["#FAEEDA", "#854F0B"],
    low:    ["#FAECE7", "#993C1D"],
  };
  const [bg, color] = s[level] ?? s.low;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: bg, color, fontWeight: 500 }}>{level}</span>;
}

const QUALITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  major:        { bg: "#E6F1FB", color: "#185FA5", border: "#B5D4F4" },
  minor:        { bg: "#EAF3DE", color: "#3B6D11", border: "#C0DD97" },
  diminished:   { bg: "#FAECE7", color: "#993C1D", border: "#F5C4B3" },
  indeterminate:{ bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "var(--color-border-tertiary)" },
};
function qualityStyle(q: string) { return QUALITY_STYLE[q] ?? QUALITY_STYLE.indeterminate; }

function noteValue(id: NoteValueId) {
  return NOTE_VALUES.find((value) => value.id === id) ?? NOTE_VALUES[2];
}

function computeBestJamWindow(
  scalePositions: FretPosition[],
  progression: ProgressionChord[],
  windowSize: number,
) {
  const maxStart = Math.max(0, 24 - windowSize);
  let bestStart = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let start = 0; start <= maxStart; start += 1) {
    const end = start + windowSize;
    let score = 0;

    progression.forEach((step) => {
      const root = step.chord_tones[0];
      const inWindow = scalePositions.filter((p) => p.fret >= start && p.fret <= end && !p.is_avoid);
      const rootCount = inWindow.filter((p) => p.note === root).length;
      const chordCount = inWindow.filter((p) => step.chord_tones.includes(p.note)).length;
      score += rootCount * 6 + chordCount * 2 + inWindow.length * 0.1;
    });

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  return bestStart;
}

// --- App ---

export default function App() {
  const [root, setRoot]       = useState(0);
  const [quality, setQuality] = useState("major");
  const [minConf, setMinConf] = useState("high");


  const [scales, setScales]               = useState<ScaleSuggestion[]>([]);
  const [selectedScale, setSelectedScale] = useState<ScaleSuggestion | null>(null);
  const [namedProgs, setNamedProgs]       = useState<NamedProgression[]>([]);
  const [activeDegrees, setActiveDegrees] = useState<number[]>([0, 3, 4, 0]);
  const [progression, setProgression]     = useState<ProgressionChord[]>([]);
  const [activeStep, setActiveStep]       = useState(0);


  // Scale positions — fixed for the whole scale, reloaded only when scale changes
  const [scalePositions, setScalePositions] = useState<FretPosition[]>([]);
  // Window start — follows the active chord to keep the jam view playable
  const [windowStart, setWindowStart] = useState(0);
  const [windowSize, setWindowSize] = useState(5);
  const [showAvoid, setShowAvoid] = useState(true);
  const [flash, setFlash] = useState(false);
  const [followChord, setFollowChord] = useState(false);
  const [tab, setTab]         = useState<"suggest" | "build">("suggest");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Jam
  const [isPlaying, setIsPlaying]     = useState(false);
  const [bpm, setBpm]                 = useState(80);
  const [tempoUnit, setTempoUnit]     = useState<NoteValueId>("quarter");
  const [stepDurations, setStepDurations] = useState<NoteValueId[]>([]);
  const [masterVolume, setMasterVolume] = useState(0.9);
  const [clickVolume, setClickVolume] = useState(0.45);
  const [guitarVolume, setGuitarVolume] = useState(0.9);
  const [currentBeat, setCurrentBeat] = useState(0);
  const { unlockAudio, preloadChordSamples, playClick, playChordStrum, stopAllSounds } = useAudio(masterVolume, clickVolume, guitarVolume);


  const jamRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);
  const pulseRef = useRef(0);
  const remainingPulsesRef = useRef(0);
  const progRef = useRef<ProgressionChord[]>([]);
  const durationsRef = useRef<NoteValueId[]>([]);
  const prevStepRef = useRef(-1);

  useEffect(() => { progRef.current = progression; }, [progression]);
  useEffect(() => { durationsRef.current = stepDurations; }, [stepDurations]);
  useEffect(() => {
    setStepDurations((prev) => progression.map((_, i) => prev[i] ?? "quarter"));
  }, [progression]);
  useEffect(() => {
    if (progression.length === 0) return;
    const uniqueChords = Array.from(new Set(progression.map((step) => step.chord_tones.join("|"))));
    uniqueChords.forEach((tones) => {
      void preloadChordSamples(tones.split("|"));
    });
  }, [progression, preloadChordSamples]);

  function transportPulseQuarters() {
    const progressionPulseValues = durationsRef.current
      .map((duration) => noteValue(duration).quarters);
    return Math.min(noteValue(tempoUnit).quarters, ...progressionPulseValues, 0.25);
  }

  function pulsesForDuration(duration: NoteValueId) {
    return Math.max(1, Math.round(noteValue(duration).quarters / transportPulseQuarters()));
  }

  function playStep(stepIndex: number, beat: number) {
    const step = progRef.current[stepIndex];
    if (!step) return;
    setActiveStep(stepIndex);
    setCurrentBeat(beat);
    playChordStrum(step.chord_tones);
  }

  async function startJam() {
    if (progRef.current.length === 0) return;
    await unlockAudio();
    const uniqueChords = Array.from(new Set(progRef.current.map((step) => step.chord_tones.join("|"))));
    await Promise.all(uniqueChords.map((tones) => preloadChordSamples(tones.split("|")).catch(() => null)));
    stepRef.current = 0;
    pulseRef.current = 0;
    remainingPulsesRef.current = pulsesForDuration(durationsRef.current[0] ?? "quarter");
    setIsPlaying(true);
    playStep(0, 0);
    playClick(true);

    const pulseQuarters = transportPulseQuarters();
    const pulseMs = ((60 / bpm) * 1000 * pulseQuarters) / noteValue(tempoUnit).quarters;
    const clickEvery = Math.max(1, Math.round(noteValue(tempoUnit).quarters / pulseQuarters));

    jamRef.current = setInterval(() => {
      pulseRef.current += 1;
      remainingPulsesRef.current -= 1;
      const isTempoPulse = pulseRef.current % clickEvery === 0;

      if (remainingPulsesRef.current <= 0) {
        stepRef.current = (stepRef.current + 1) % progRef.current.length;
        remainingPulsesRef.current = pulsesForDuration(durationsRef.current[stepRef.current] ?? "quarter");
        pulseRef.current = 0;
        playStep(stepRef.current, 0);
        if (isTempoPulse) {
          playClick(true);
        }
      } else {
        if (isTempoPulse) {
          playClick(false);
        }
        setCurrentBeat(Math.min(pulseRef.current, pulsesForDuration(durationsRef.current[stepRef.current] ?? "quarter") - 1));
      }
    }, pulseMs);
  }

  function stopJam() {
    if (jamRef.current) clearInterval(jamRef.current);
    jamRef.current = null;
    stopAllSounds();
    setIsPlaying(false);
    setCurrentBeat(0);
    pulseRef.current = 0;
    remainingPulsesRef.current = 0;
  }

  useEffect(() => { if (isPlaying) { stopJam(); startJam(); } }, [bpm, tempoUnit, stepDurations]);
  useEffect(() => () => { if (jamRef.current) clearInterval(jamRef.current); }, []);

  // Boot
  useEffect(() => {
    invoke<NamedProgression[]>("common_progressions_command").then(setNamedProgs);
  }, []);

  // Analyze chord on change
  useEffect(() => { analyzeChord(); }, [root, quality, minConf]);

  // Build progression when scale or degrees change
  useEffect(() => { if (selectedScale) buildProgression(); }, [selectedScale, activeDegrees]);

  // Load scale fretboard when scale changes
  useEffect(() => { if (selectedScale) loadScaleFretboard(); }, [selectedScale]);

  useEffect(() => {
    if (scalePositions.length === 0 || progression.length === 0) return;
    if (!followChord) {
      setWindowStart(computeBestJamWindow(scalePositions, progression, windowSize));
      return;
    }
    const activeChordTones = progression[activeStep]?.chord_tones ?? [];
    const chordFrets = scalePositions
      .filter(p => activeChordTones.includes(p.note) && !p.is_avoid && p.fret > 0)
      .map(p => p.fret);
    const minFret = chordFrets.length > 0 ? Math.min(...chordFrets) : 0;
    setWindowStart(Math.max(0, minFret - 1));
  }, [scalePositions, progression, activeStep, windowSize, followChord]);

  useEffect(() => {
    if (activeStep === prevStepRef.current) return;
    if (prevStepRef.current !== -1) {
      setFlash(true);
      const timeoutId = window.setTimeout(() => setFlash(false), 180);
      prevStepRef.current = activeStep;
      return () => window.clearTimeout(timeoutId);
    }
    prevStepRef.current = activeStep;
  }, [activeStep]);

  async function analyzeChord() {
    setLoading(true);
    setError(null);
    stopJam();
    setProgression([]);
    setScalePositions([]);
    try {
      const results = await invoke<ScaleSuggestion[]>("analyze_chord_command", {
        request: { root, quality, min_confidence: minConf },
      });
      setScales(results);
      setSelectedScale(results[0] ?? null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function buildProgression() {
    if (!selectedScale) return;
    stopJam();
    try {
      const prog = await invoke<ProgressionChord[]>("build_progression_command", {
        request: {
          scale_root: NOTES.indexOf(selectedScale.scale_root),
          scale_name: selectedScale.scale_name,
          degrees: activeDegrees,
        },
      });
      setProgression(prog);
      setActiveStep(0);
    } catch (e) { console.error(e); }
  }

  async function loadScaleFretboard() {
    if (!selectedScale) return;
    try {
      const positions = await invoke<FretPosition[]>("scale_fretboard_command", {
        request: {
          scale_root: NOTES.indexOf(selectedScale.scale_root),
          scale_name: selectedScale.scale_name,
          max_fret: 24,
        },
      });
      setScalePositions(positions);
    } catch (e) { console.error(e); }
  }

  const currentStep = progression[activeStep];
  const currentChordTones = currentStep?.chord_tones ?? [];
  const currentRootNote = currentChordTones[0] ?? "";
  const targetBoxLabel = windowSize === 5 ? "Jam box" : "Full neck";
  const currentDuration = stepDurations[activeStep] ?? "quarter";
  const currentPulseTotal = pulsesForDuration(currentDuration);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", fontFamily: "var(--font-sans)", background: "var(--color-background-primary)" }}>

      {/* Sidebar */}
      <div style={{ background: "var(--color-background-secondary)", borderRight: "0.5px solid var(--color-border-tertiary)", padding: "18px 12px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", paddingBottom: 14, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          Riff Composer
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400, marginTop: 2 }}>chord analyzer</div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Root</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 3 }}>
            {NOTES.map((n, i) => (
              <button key={i} onClick={() => setRoot(i)} style={{
                border: root === i ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: root === i ? "#534AB7" : SHARPS.has(n) ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
                color: root === i ? "#EEEDFE" : SHARPS.has(n) ? "var(--color-text-secondary)" : "var(--color-text-primary)",
                borderRadius: "var(--border-radius-md)", padding: "5px 2px", fontSize: 11, cursor: "pointer",
              }}>{n}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Quality</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {QUALITIES.map(q => (
              <button key={q.id} onClick={() => setQuality(q.id)} style={{
                border: quality === q.id ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                background: quality === q.id ? "#EEEDFE" : "var(--color-background-primary)",
                color: quality === q.id ? "#3C3489" : "var(--color-text-secondary)",
                borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 12,
                cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between",
              }}>
                <span>{q.label}</span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{q.intervals}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Min confidence</div>
          <div style={{ display: "flex", gap: 3 }}>
            {["high","medium","low"].map(c => (
              <button key={c} onClick={() => setMinConf(c)} style={{
                flex: 1, border: "0.5px solid var(--color-border-tertiary)",
                background: minConf === c ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
                color: minConf === c ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                borderRadius: "var(--border-radius-md)", padding: "5px 2px", fontSize: 10,
                cursor: "pointer", fontWeight: minConf === c ? 500 : 400,
              }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>

        {/* Header */}
        <div style={{ paddingBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {NOTES[root]} {QUALITIES.find(q => q.id === quality)?.label}
            </span>
            {scales.length > 0 && (
              <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
                {scales[0].matching_notes.join(" · ")}
              </span>
            )}
          </div>
          {loading && <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>Analyzing…</div>}
          {error && <div style={{ fontSize: 12, color: "#993C1D", marginTop: 4 }}>{error}</div>}
        </div>

        {/* Scales */}
        {scales.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
              {scales.length} compatible scale{scales.length > 1 ? "s" : ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {scales.map((s, i) => {
                const sel = selectedScale?.scale_root === s.scale_root && selectedScale?.scale_name === s.scale_name;
                const borderColor = s.confidence === "high" ? "#1D9E75" : s.confidence === "medium" ? "#BA7517" : "#D85A30";
                return (
                  <div key={i} onClick={() => setSelectedScale(s)} style={{
                    border: sel ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                    borderLeft: sel ? "3px solid #534AB7" : `3px solid ${borderColor}`,
                    borderRadius: "var(--border-radius-md)", padding: "9px 11px",
                    cursor: "pointer", background: sel ? "#EEEDFE" : "var(--color-background-primary)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: sel ? "#3C3489" : "var(--color-text-primary)" }}>
                          {s.scale_root} {s.scale_name}
                        </div>
                        {s.mode && (
                          <div style={{ fontSize: 11, color: "#534AB7", marginTop: 1 }}>
                            {s.mode.name} — {ROMAN[s.mode.degree]}
                          </div>
                        )}
                      </div>
                      <Badge level={s.confidence} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 5 }}>
                      {s.notes.join(" · ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progression */}
        {selectedScale && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12 }}>
              Progression — {selectedScale.scale_root} {selectedScale.scale_name}
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {(["suggest","build"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: tab === t ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
                  color: tab === t ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  borderRadius: "var(--border-radius-md)", padding: "5px 12px", fontSize: 11,
                  cursor: "pointer", fontWeight: tab === t ? 500 : 400,
                }}>{t === "suggest" ? "Suggestions" : "Manual"}</button>
              ))}
            </div>

            {tab === "suggest" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                {namedProgs.map((p, i) => {
                  const active = JSON.stringify(activeDegrees) === JSON.stringify(p.degrees);
                  return (
                    <button key={i} onClick={() => setActiveDegrees(p.degrees)} style={{
                      border: active ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                      background: active ? "#EEEDFE" : "var(--color-background-primary)",
                      borderRadius: "var(--border-radius-md)", padding: "7px 12px",
                      cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: active ? "#3C3489" : "var(--color-text-primary)" }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.feel}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "build" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>Click degrees to add</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                  {ROMAN.map((r, i) => {
                    const inProg = activeDegrees.includes(i);
                    return (
                      <button key={i} onClick={() => setActiveDegrees(prev =>
                        prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                      )} style={{
                        border: inProg ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                        background: inProg ? "#534AB7" : "var(--color-background-primary)",
                        color: inProg ? "#EEEDFE" : "var(--color-text-secondary)",
                        borderRadius: "var(--border-radius-md)", padding: "6px 10px",
                        fontSize: 12, cursor: "pointer", fontWeight: 500,
                      }}>{r}</button>
                    );
                  })}
                </div>
                <button onClick={() => setActiveDegrees([])} style={{
                  border: "0.5px solid var(--color-border-tertiary)", background: "transparent",
                  color: "var(--color-text-tertiary)", borderRadius: "var(--border-radius-md)",
                  padding: "4px 10px", fontSize: 11, cursor: "pointer",
                }}>Clear</button>
              </div>
            )}

            {/* Timeline */}
            {progression.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {progression.map((step, i) => {
                  const s = qualityStyle(step.quality);
                  const active = activeStep === i;
                  const duration = stepDurations[i] ?? "quarter";
                  return (
                    <div key={i} onClick={() => { stopJam(); setActiveStep(i); }} style={{
                      flex: "0 0 auto", minWidth: 64, textAlign: "center",
                      border: active ? "2px solid #534AB7" : `0.5px solid ${s.border}`,
                      background: active ? "#534AB7" : s.bg,
                      borderRadius: "var(--border-radius-md)", padding: "10px 8px", cursor: "pointer",
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 500, color: active ? "#EEEDFE" : s.color }}>{step.display_name}</div>
                      <div style={{ fontSize: 10, color: active ? "#AFA9EC" : "var(--color-text-tertiary)", marginTop: 2 }}>{step.roman}</div>
                      <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
                        {NOTE_VALUES.map((value) => (
                          <button
                            key={value.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setStepDurations((prev) => prev.map((item, idx) => idx === i ? value.id : item));
                            }}
                            style={{
                              border: duration === value.id ? "1px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                              background: duration === value.id ? (active ? "#EEEDFE" : "#F6F3FF") : "transparent",
                              color: duration === value.id ? "#3C3489" : "var(--color-text-tertiary)",
                              borderRadius: 99,
                              padding: "2px 6px",
                              fontSize: 9,
                              cursor: "pointer",
                            }}
                            title={value.label}
                          >
                            {value.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Jam controls */}
            {progression.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "12px 16px", marginBottom: 16,
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                background: "var(--color-background-secondary)",
                flexWrap: "wrap",
              }}>
                <button onClick={isPlaying ? stopJam : startJam} style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none",
                  background: isPlaying ? "#993C1D" : "#534AB7",
                  color: "#fff", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {isPlaying ? "■" : "▶"}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>BPM</span>
                  <input type="range" min={40} max={200} step={1} value={bpm}
                    onChange={e => setBpm(Number(e.target.value))} style={{ flex: 1 }}/>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", minWidth: 28, textAlign: "right" }}>{bpm}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Tempo sur</span>
                  {NOTE_VALUES.map((value) => (
                    <button key={value.id} onClick={() => setTempoUnit(value.id)} style={{
                      minWidth: 44, height: 28,
                      border: tempoUnit === value.id ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                      background: tempoUnit === value.id ? "#534AB7" : "var(--color-background-primary)",
                      color: tempoUnit === value.id ? "#EEEDFE" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)", fontSize: 15, cursor: "pointer", padding: "0 8px",
                    }} title={value.label}>{value.symbol}</button>
                  ))}
                </div>

                {isPlaying && <BeatDots total={currentPulseTotal} current={currentBeat}/>}

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Clic</span>
                  <input type="range" min={0} max={100} step={1} value={Math.round(clickVolume * 100)}
                    onChange={e => setClickVolume(Number(e.target.value) / 100)} style={{ flex: 1 }}/>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Guitare</span>
                  <input type="range" min={0} max={100} step={1} value={Math.round(guitarVolume * 100)}
                    onChange={e => setGuitarVolume(Number(e.target.value) / 100)} style={{ flex: 1 }}/>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>Master</span>
                  <input type="range" min={0} max={100} step={1} value={Math.round(masterVolume * 100)}
                    onChange={e => setMasterVolume(Number(e.target.value) / 100)} style={{ flex: 1 }}/>
                </div>
              </div>
            )}

            {/* Fretboard */}
            {currentStep && scalePositions.length > 0 && (
              <div>
                <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {currentStep.display_name} in {selectedScale?.scale_root} {selectedScale?.scale_name}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      Cible: {currentRootNote || "?"} en tonique, puis {currentStep.chord_tones.slice(1).join(" · ")}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      Notes de gamme: {currentStep.scale_tones.join(" · ")}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      Durée: {noteValue(currentDuration).symbol} {noteValue(currentDuration).label} · Tempo: {bpm} à la {noteValue(tempoUnit).label.toLowerCase()} {noteValue(tempoUnit).symbol}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => setWindowSize(5)} style={{
                      border: windowSize === 5 ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                      background: windowSize === 5 ? "#534AB7" : "var(--color-background-primary)",
                      color: windowSize === 5 ? "#EEEDFE" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 11, cursor: "pointer",
                    }}>5 frets</button>
                    <button onClick={() => setWindowSize(12)} style={{
                      border: windowSize === 12 ? "1.5px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                      background: windowSize === 12 ? "#534AB7" : "var(--color-background-primary)",
                      color: windowSize === 12 ? "#EEEDFE" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 11, cursor: "pointer",
                    }}>12 frets</button>
                    <button onClick={() => setShowAvoid(v => !v)} style={{
                      border: showAvoid ? "1.5px solid #A32D2D" : "0.5px solid var(--color-border-tertiary)",
                      background: showAvoid ? "#FAECE7" : "var(--color-background-primary)",
                      color: showAvoid ? "#993C1D" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 11, cursor: "pointer",
                    }}>{showAvoid ? "Avoid on" : "Avoid off"}</button>
                    <button onClick={() => setFollowChord(v => !v)} style={{
                      border: followChord ? "1.5px solid #1D9E75" : "0.5px solid var(--color-border-tertiary)",
                      background: followChord ? "#E1F5EE" : "var(--color-background-primary)",
                      color: followChord ? "#0F6E56" : "var(--color-text-secondary)",
                      borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 11, cursor: "pointer",
                    }}>{followChord ? "Follow chord" : "Lock position"}</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{
                    padding: "6px 10px",
                    borderRadius: "var(--border-radius-md)",
                    background: "#FFF2DA",
                    color: "#6D4600",
                    fontSize: 11,
                    fontWeight: 500,
                  }}>
                    {targetBoxLabel} autour de la frette {windowStart + 1}
                  </div>
                  <div style={{
                    padding: "6px 10px",
                    borderRadius: "var(--border-radius-md)",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-tertiary)",
                    fontSize: 11,
                  }}>
                    {followChord ? "La box suit l'accord courant" : "Position CAGED stable pour toute la grille"}
                  </div>
                  <div style={{
                    padding: "6px 10px",
                    borderRadius: "var(--border-radius-md)",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-tertiary)",
                    fontSize: 11,
                  }}>
                    Vise les carrés orange sur les temps forts
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: "#EF9F27" }}/>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Tonique</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#534AB7" }}/>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Chord tone</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D9E75" }}/>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Scale tone</span>
                  </div>
                  {showAvoid && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#A32D2D", opacity: 0.5 }}/>
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Avoid note</span>
                    </div>
                  )}
                </div>
                <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "12px 8px", background: "var(--color-background-secondary)" }}>
                  <Fretboard
                    scalePositions={scalePositions}
                    chordTones={currentChordTones}
                    rootNote={currentRootNote}
                    windowStart={windowStart}
                    windowSize={windowSize}
                    showAvoid={showAvoid}
                    flash={flash}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
