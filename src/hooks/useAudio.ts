import { useRef } from "react";
import type { BeatStepEvent, StrumStyleId } from "../music";
import { resolveOpenStringMidis, STRUM_STYLES, swingDelaySeconds } from "../music";

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
      bus.gain.value = 0.72;
      bus.connect(getMaster());
      drumBusRef.current = bus;
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

  function buildGuitarVoicing(chordTones: string[], tuningStrings: string[]) {
    const pitchClassToSemi: Record<string, number> = {
      C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
      "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
    };
    const stringMidis = resolveOpenStringMidis(tuningStrings);

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

  async function preloadChordSamples(chordTones: string[], tuningStrings: string[]) {
    const voicing = buildGuitarVoicing(chordTones, tuningStrings);
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

  function playChordStrum(chordTones: string[], tuningStrings: string[], strumStyle: StrumStyleId, when?: number) {
    const ctx = getCtx();
    const startTime = when ?? ctx.currentTime;
    const voicing = buildGuitarVoicing(chordTones, tuningStrings);
    const guitarBus = getGuitarBus();
    const chordGain = ctx.createGain();
    const style = STRUM_STYLES.find((item) => item.id === strumStyle) ?? STRUM_STYLES[0];

    chordGain.gain.setValueAtTime(0.0001, startTime);
    chordGain.gain.linearRampToValueAtTime(1, startTime + 0.01);
    chordGain.gain.exponentialRampToValueAtTime(0.001, startTime + (strumStyle === "arpeggio" ? 1.45 : 1.15));
    chordGain.connect(guitarBus);

    if (activeChordGainRef.current) {
      activeChordGainRef.current.gain.cancelScheduledValues(startTime);
      activeChordGainRef.current.gain.setValueAtTime(Math.max(0.0001, activeChordGainRef.current.gain.value), startTime);
      activeChordGainRef.current.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
    }
    activeChordGainRef.current = chordGain;

    voicing.forEach((midi, i) => {
      const delay = i * (style.spreadMs / 1000);
      const velocity = 1 - i * style.velocityDrop;
      const noteName = midiToNoteName(midi);
      if (sampleCacheRef.current.has(noteName)) {
        playSampledString(noteName, startTime + delay, Math.max(0.55, velocity), chordGain);
      } else {
        pluckString(midiToFreq(midi), startTime + delay, Math.max(0.55, velocity), chordGain);
      }
    });
  }

  function playKick(when: number, velocity: number) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const body = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.15);

    body.type = "lowpass";
    body.frequency.value = 180;
    body.Q.value = 0.4;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.9 * velocity, when + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);

    osc.connect(body);
    body.connect(gain);
    gain.connect(getDrumBus());
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

    playNoiseBurst(when, 0.16, 0.34 * velocity, "bandpass", 1900, 0.7);

    tone.type = "triangle";
    tone.frequency.setValueAtTime(190, when);
    tone.frequency.exponentialRampToValueAtTime(110, when + 0.08);
    toneGain.gain.setValueAtTime(0.0001, when);
    toneGain.gain.linearRampToValueAtTime(0.24 * velocity, when + 0.002);
    toneGain.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
    tone.connect(toneGain);
    toneGain.connect(getDrumBus());
    tone.start(when);
    tone.stop(when + 0.1);
  }

  function playClap(when: number, velocity: number) {
    [0, 0.012, 0.026].forEach((offset, index) => {
      playNoiseBurst(when + offset, 0.08 - index * 0.01, (0.22 - index * 0.03) * velocity, "bandpass", 1500, 1.4);
    });
  }

  function playHat(when: number, velocity: number, open: boolean) {
    playNoiseBurst(when, open ? 0.22 : 0.05, (open ? 0.18 : 0.14) * velocity, "highpass", 5200, 0.8);
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

  function playBeatStep(events: BeatStepEvent[], step: number, pulseMs: number, swing: number) {
    const ctx = getCtx();
    const when = ctx.currentTime + swingDelaySeconds(step, pulseMs, swing);

    events.forEach((event) => {
      const velocity = Math.max(0.08, event.velocity / 127);

      switch (event.voice) {
        case "Kick":
          playKick(when, velocity);
          break;
        case "Snare":
          playSnare(when, velocity);
          break;
        case "Clap":
          playClap(when, velocity);
          break;
        case "Closed Hat":
          playHat(when, velocity, false);
          break;
        case "Open Hat":
          playHat(when, velocity, true);
          break;
        case "Perc":
          playPerc(when, velocity);
          break;
        default:
          break;
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

  return { unlockAudio, preloadChordSamples, playClick, playChordStrum, playBeatStep, stopAllSounds };
}
