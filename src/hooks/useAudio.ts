import { useRef } from "react";
import type { AccompanimentToneId, BeatStepEvent, StrumStyleId } from "../music";
import { STRUM_STYLES, swingDelaySeconds } from "../music";
import { buildGuitarVoicing } from "../guitarVoicing";

const STRUM_HUMANIZE_MS: Record<StrumStyleId, number> = {
  smooth: 8,
  straight: 4,
  arpeggio: 10,
};

declare global {
  interface Window {
    MIDI?: {
      Soundfont?: Record<string, Record<string, string>>;
    };
  }
}

export function useAudio(masterVolume: number, clickVolume: number, guitarVolume: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const clickBusRef = useRef<GainNode | null>(null);
  const drumBusRef = useRef<GainNode | null>(null);
  const guitarBusRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const soundfontRef = useRef<Record<string, string> | null>(null);
  const soundfontPromiseRef = useRef<Promise<Record<string, string> | null> | null>(null);
  const sampleCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const activeChordGainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const drumHighpassRef = useRef<BiquadFilterNode | null>(null);
  const drumLowpassRef = useRef<BiquadFilterNode | null>(null);
  const lastVoicingRef = useRef<Array<number | null> | null>(null);

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

  function getDrumBus(): GainNode {
    const ctx = getCtx();
    if (!drumBusRef.current) {
      const bus = ctx.createGain();
      const highpass = ctx.createBiquadFilter();
      const lowpass = ctx.createBiquadFilter();

      bus.gain.value = 0.66;
      highpass.type = "highpass";
      highpass.frequency.value = 42;
      highpass.Q.value = 0.7;
      lowpass.type = "lowpass";
      lowpass.frequency.value = 6200;
      lowpass.Q.value = 0.25;

      bus.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(getMaster());
      drumBusRef.current = bus;
      drumHighpassRef.current = highpass;
      drumLowpassRef.current = lowpass;
    }
    return drumBusRef.current;
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
    getDrumBus();
    getGuitarBus();
    if (ctx.state !== "running") {
      await ctx.resume();
    }
  }

  function getCurrentTime() {
    return getCtx().currentTime;
  }

  function getNoiseBuffer() {
    const ctx = getCtx();
    if (!noiseBufferRef.current) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseBufferRef.current = buffer;
    }
    return noiseBufferRef.current;
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
    const startTime = when ?? ctx.currentTime;
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    const bodyFilter = ctx.createBiquadFilter();
    const attack = ctx.createBufferSource();
    const attackFilter = ctx.createBiquadFilter();
    const attackGain = ctx.createGain();

    body.type = "triangle";
    body.frequency.setValueAtTime(isDownbeat ? 1020 : 820, startTime);
    body.frequency.exponentialRampToValueAtTime(isDownbeat ? 760 : 620, startTime + 0.035);
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = isDownbeat ? 1900 : 1550;
    bodyFilter.Q.value = 0.3;
    bodyGain.gain.setValueAtTime(0.0001, startTime);
    bodyGain.gain.linearRampToValueAtTime(isDownbeat ? 0.11 : 0.075, startTime + 0.0015);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);

    attack.buffer = getNoiseBuffer();
    attackFilter.type = "bandpass";
    attackFilter.frequency.value = isDownbeat ? 2450 : 2100;
    attackFilter.Q.value = 1.25;
    attackGain.gain.setValueAtTime(0.0001, startTime);
    attackGain.gain.linearRampToValueAtTime(isDownbeat ? 0.05 : 0.03, startTime + 0.001);
    attackGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.014);

    body.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(clickBus);
    attack.connect(attackFilter);
    attackFilter.connect(attackGain);
    attackGain.connect(clickBus);

    body.start(startTime);
    attack.start(startTime);
    body.stop(startTime + 0.05);
    attack.stop(startTime + 0.02);
  }

  function midiToFreq(midi: number) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function midiToNoteName(midi: number) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    return `${names[midi % 12]}${octave}`;
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
    // LRU eviction — cap à 64 entrées
    if (sampleCacheRef.current.size > 64) {
      const oldest = sampleCacheRef.current.keys().next().value;
      if (oldest !== undefined) sampleCacheRef.current.delete(oldest);
    }
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

  async function preloadChordSamples(chordTones: string[], tuningStrings: string[]) {
    const voicing = buildGuitarVoicing({ chordTones, tuningStrings }).filter((midi): midi is number => midi != null);
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
      tone.frequency.value = 3850;
      tone.Q.value = 0.1;

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.44 * velocity, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, when + Math.min(1.15, buffer.duration));

      source.buffer = buffer;
      source.connect(tone);
      tone.connect(gain);
      gain.connect(destination);
      source.start(when);
    }).catch(() => null);
  }

  function playSynthPadNote(freq: number, when: number, velocity: number, destination: AudioNode) {
    const ctx = getCtx();
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const voiceGain = ctx.createGain();

    oscA.type = "triangle";
    oscB.type = "sawtooth";
    oscSub.type = "sine";

    oscA.frequency.setValueAtTime(freq, when);
    oscB.frequency.setValueAtTime(freq * 1.002, when);
    oscSub.frequency.setValueAtTime(freq / 2, when);
    oscB.detune.setValueAtTime(5, when);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1350, when);
    filter.frequency.linearRampToValueAtTime(2100, when + 0.18);
    filter.frequency.exponentialRampToValueAtTime(900, when + 1.15);
    filter.Q.value = 0.35;

    voiceGain.gain.setValueAtTime(0.0001, when);
    voiceGain.gain.linearRampToValueAtTime(0.14 * velocity, when + 0.06);
    voiceGain.gain.exponentialRampToValueAtTime(0.055 * velocity, when + 0.36);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, when + 1.45);

    oscA.connect(filter);
    oscB.connect(filter);
    oscSub.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(destination);

    oscA.start(when);
    oscB.start(when);
    oscSub.start(when);
    oscA.stop(when + 1.55);
    oscB.stop(when + 1.55);
    oscSub.stop(when + 1.55);
  }

  function playChordStrum(
    chordTones: string[],
    tuningStrings: string[],
    strumStyle: StrumStyleId,
    accompanimentTone: AccompanimentToneId,
    when?: number,
  ) {
    const ctx = getCtx();
    const startTime = when ?? ctx.currentTime;
    const voicing = buildGuitarVoicing({
      chordTones,
      tuningStrings,
      previousVoicing: lastVoicingRef.current,
    });
    const guitarBus = getGuitarBus();
    const chordGain = ctx.createGain();
    const style = STRUM_STYLES.find((item) => item.id === strumStyle) ?? STRUM_STYLES[0];
    const sounding = voicing
      .map((midi, stringIndex) => ({ midi, stringIndex }))
      .filter((item): item is { midi: number; stringIndex: number } => item.midi != null);
    const humanizeMs = STRUM_HUMANIZE_MS[strumStyle];

    chordGain.gain.setValueAtTime(0.0001, startTime);
    chordGain.gain.linearRampToValueAtTime(1, startTime + 0.01);
    chordGain.gain.exponentialRampToValueAtTime(0.001, startTime + (accompanimentTone === "synth" ? 1.7 : strumStyle === "arpeggio" ? 1.35 : 1.05));
    chordGain.connect(guitarBus);

    if (activeChordGainRef.current) {
      activeChordGainRef.current.gain.cancelScheduledValues(startTime);
      activeChordGainRef.current.gain.setValueAtTime(Math.max(0.0001, activeChordGainRef.current.gain.value), startTime);
      activeChordGainRef.current.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
    }
    activeChordGainRef.current = chordGain;
    lastVoicingRef.current = voicing;

    if (accompanimentTone === "synth") {
      sounding.forEach(({ midi }, soundingIndex) => {
        const delay = soundingIndex * Math.max(0.006, style.spreadMs / 3000);
        const velocity = Math.max(0.42, 0.82 - soundingIndex * 0.05);
        playSynthPadNote(midiToFreq(midi), startTime + delay, velocity, chordGain);
      });
      return;
    }

    sounding.forEach(({ midi }, soundingIndex) => {
      const delay = soundingIndex * (style.spreadMs / 1000) + (Math.random() * humanizeMs) / 1000;
      const stringAccent = 1.05 - soundingIndex * 0.035;
      const velocity = Math.max(
        0.52,
        (1 - soundingIndex * style.velocityDrop) * stringAccent * (0.94 + Math.random() * 0.12),
      );
      const noteName = midiToNoteName(midi);
      if (sampleCacheRef.current.has(noteName)) {
        playSampledString(noteName, startTime + delay, velocity, chordGain);
      } else {
        pluckString(midiToFreq(midi), startTime + delay, velocity, chordGain);
      }
    });
  }

  function playKick(when: number, velocity: number) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const body = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(138, when);
    osc.frequency.exponentialRampToValueAtTime(52, when + 0.16);

    body.type = "lowpass";
    body.frequency.value = 210;
    body.Q.value = 0.4;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.82 * velocity, when + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.19);

    osc.connect(body);
    body.connect(gain);
    gain.connect(getDrumBus());
    playNoiseBurst(when, 0.015, 0.05 * velocity, "bandpass", 1800, 0.9);
    osc.start(when);
    osc.stop(when + 0.2);
  }

  function playNoiseBurst(
    when: number,
    duration: number,
    velocity: number,
    filterType: BiquadFilterType,
    frequency: number,
    q: number,
  ) {
    const ctx = getCtx();
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = getNoiseBuffer();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(velocity, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(getDrumBus());
    source.start(when);
    source.stop(when + duration);
  }

  function playSnare(when: number, velocity: number) {
    const ctx = getCtx();
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();

    playNoiseBurst(when, 0.14, 0.28 * velocity, "bandpass", 1650, 0.75);

    tone.type = "triangle";
    tone.frequency.setValueAtTime(176, when);
    tone.frequency.exponentialRampToValueAtTime(102, when + 0.08);
    toneGain.gain.setValueAtTime(0.0001, when);
    toneGain.gain.linearRampToValueAtTime(0.18 * velocity, when + 0.002);
    toneGain.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
    tone.connect(toneGain);
    toneGain.connect(getDrumBus());
    tone.start(when);
    tone.stop(when + 0.1);
  }

  function playClap(when: number, velocity: number) {
    [0, 0.012, 0.026].forEach((offset, index) => {
      playNoiseBurst(when + offset, 0.065 - index * 0.008, (0.16 - index * 0.02) * velocity, "bandpass", 1320, 1.25);
    });
  }

  function playHat(when: number, velocity: number, open: boolean) {
    playNoiseBurst(when, open ? 0.18 : 0.04, (open ? 0.14 : 0.11) * velocity, "highpass", 4700, 0.7);
  }

  function playPerc(when: number, velocity: number) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(620, when);
    osc.frequency.exponentialRampToValueAtTime(360, when + 0.06);

    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 1.2;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.2 * velocity, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(getDrumBus());
    osc.start(when);
    osc.stop(when + 0.09);
  }

  function playBeatStep(events: BeatStepEvent[], step: number, pulseMs: number, swing: number, when?: number) {
    const baseTime = when ?? getCurrentTime();
    const startTime = baseTime + swingDelaySeconds(step, pulseMs, swing);

    events.forEach((event) => {
      const velocity = Math.max(0.08, event.velocity / 127);

      switch (event.voice) {
        case "Kick":
          playKick(startTime, velocity);
          break;
        case "Snare":
          playSnare(startTime, velocity);
          break;
        case "Clap":
          playClap(startTime, velocity);
          break;
        case "Closed Hat":
          playHat(startTime, velocity, false);
          break;
        case "Open Hat":
          playHat(startTime, velocity, true);
          break;
        case "Perc":
          playPerc(startTime, velocity);
          break;
        default:
          break;
      }
    });
  }

  function playGuideTone(midi: number, when?: number, velocity = 0.34) {
    const ctx = getCtx();
    const startTime = when ?? ctx.currentTime;
    const cueGain = ctx.createGain();
    const noteName = midiToNoteName(midi);

    cueGain.gain.setValueAtTime(0.0001, startTime);
    cueGain.gain.linearRampToValueAtTime(0.52, startTime + 0.006);
    cueGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.46);
    cueGain.connect(getGuitarBus());

    if (sampleCacheRef.current.has(noteName)) {
      playSampledString(noteName, startTime, velocity, cueGain);
      return;
    }

    void getSampleBuffer(noteName).catch(() => null);
    pluckString(midiToFreq(midi), startTime, velocity, cueGain);
  }

  function stopAllSounds() {
    const ctx = ctxRef.current;
    lastVoicingRef.current = null;
    if (!ctx || !activeChordGainRef.current) return;
    const now = ctx.currentTime;
    activeChordGainRef.current.gain.cancelScheduledValues(now);
    activeChordGainRef.current.gain.setValueAtTime(Math.max(0.0001, activeChordGainRef.current.gain.value), now);
    activeChordGainRef.current.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  }

  return {
    getCurrentTime,
    unlockAudio,
    preloadChordSamples,
    playClick,
    playChordStrum,
    playBeatStep,
    playGuideTone,
    stopAllSounds,
  };
}
