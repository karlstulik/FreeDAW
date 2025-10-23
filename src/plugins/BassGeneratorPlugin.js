import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'
import { clamp, getSaturationCurve } from '@/utils/audioDSP'

export class BassGeneratorPlugin extends TrackPlugin {
  static name = 'Bass Generator';

  static presets = {
    'Deep Sub': {
      frequency: 32.7, // C1 - very deep sub bass
      waveform: 'sine',
      duration: 0.6,
      level: 0.8,
      attack: 0.02,
      decay: 0.2,
      sustain: 0.8,
      release: 0.3,
      detune: 0,
      subOsc: true,
      subLevel: 0.6,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 20,
      lpFreq: 120,
      resonance: 1.0,
      saturation: 0.05,
      compThreshold: -20
    },
    'Punchy Bass': {
      frequency: 55, // A1 - punchy kick-bass range
      waveform: 'sawtooth',
      duration: 0.3,
      level: 0.75,
      attack: 0.005,
      decay: 0.1,
      sustain: 0.6,
      release: 0.2,
      detune: 0,
      subOsc: true,
      subLevel: 0.3,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 30,
      lpFreq: 800,
      resonance: 1.5,
      saturation: 0.1,
      compThreshold: -16
    },
    'Warm Synth': {
      frequency: 82.41, // E2 - warm mid-range bass
      waveform: 'triangle',
      duration: 0.4,
      level: 0.7,
      attack: 0.01,
      decay: 0.15,
      sustain: 0.7,
      release: 0.25,
      detune: 0,
      subOsc: false,
      subLevel: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 50,
      lpFreq: 2000,
      resonance: 1.2,
      saturation: 0.08,
      compThreshold: -18
    },
    'Fuzz Bass': {
      frequency: 65.41, // C2
      waveform: 'sawtooth',
      duration: 0.35,
      level: 0.65,
      attack: 0.008,
      decay: 0.12,
      sustain: 0.5,
      release: 0.2,
      detune: 0,
      subOsc: true,
      subLevel: 0.4,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 60,
      lpFreq: 1500,
      resonance: 2.0,
      saturation: 0.25,
      compThreshold: -14
    },
    '808 Style': {
      frequency: 36.71, // C#1 - classic 808 bass
      waveform: 'sine',
      duration: 0.5,
      level: 0.85,
      attack: 0.001,
      decay: 0.3,
      sustain: 0.9,
      release: 0.4,
      detune: 0,
      subOsc: true,
      subLevel: 0.7,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 25,
      lpFreq: 200,
      resonance: 1.0,
      saturation: 0.03,
      compThreshold: -22
    },
    'Acid Bass': {
      frequency: 73.42, // D2 - squelchy acid bass
      waveform: 'sawtooth',
      duration: 0.25,
      level: 0.6,
      attack: 0.002,
      decay: 0.08,
      sustain: 0.4,
      release: 0.15,
      detune: 0,
      subOsc: false,
      subLevel: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 100,
      lpFreq: 3000,
      resonance: 3.0,
      saturation: 0.2,
      compThreshold: -12
    },
    'Sub Bass': {
      frequency: 27.5, // A0 - ultra low sub bass
      waveform: 'sine',
      duration: 0.8,
      level: 0.9,
      attack: 0.05,
      decay: 0.3,
      sustain: 0.9,
      release: 0.4,
      detune: 0,
      subOsc: false,
      subLevel: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 15,
      lpFreq: 150,
      resonance: 1.0,
      saturation: 0.02,
      compThreshold: -24
    },
    'FM Bass': {
      frequency: 61.74, // B2 - bright FM-style bass
      waveform: 'sawtooth',
      duration: 0.3,
      level: 0.7,
      attack: 0.005,
      decay: 0.1,
      sustain: 0.6,
      release: 0.2,
      detune: 0,
      subOsc: true,
      subLevel: 0.3,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 60,
      lpFreq: 2000,
      resonance: 2.5,
      saturation: 0.15,
      compThreshold: -14
    },
    'Wobble Bass': {
      frequency: 49, // G1 - wobbly bass
      waveform: 'sawtooth',
      duration: 0.4,
      level: 0.75,
      attack: 0.01,
      decay: 0.15,
      sustain: 0.7,
      release: 0.25,
      detune: 0,
      subOsc: true,
      subLevel: 0.4,
      vibratoRate: 2,
      vibratoDepth: 0.3,
      hpFreq: 40,
      lpFreq: 1000,
      resonance: 1.8,
      saturation: 0.1,
      compThreshold: -16
    },
    'Distorted Bass': {
      frequency: 41.2, // E1 - heavy distorted bass
      waveform: 'sawtooth',
      duration: 0.35,
      level: 0.8,
      attack: 0.008,
      decay: 0.12,
      sustain: 0.5,
      release: 0.2,
      detune: 0,
      subOsc: true,
      subLevel: 0.5,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 50,
      lpFreq: 800,
      resonance: 2.0,
      saturation: 0.4,
      compThreshold: -10
    }
  };

  constructor(track, presetName = null) {
    super(track);
    const defaultState = {
      frequency: 65.41, // C2 - deep bass that locks with kick
      waveform: 'sawtooth', // Rich harmonics for presence
      duration: 0.4, // Sustained bass note
      // new controls
      level: 0.72, // Balanced to sit under kick
      attack: 0.008, // Smooth but quick attack
      decay: 0.15, // Moderate decay
      sustain: 0.65, // Strong sustain for bass line
      release: 0.25, // Clean release
      detune: 0, // semitones
      subOsc: true, // Enable sub-oscillator for depth
      subLevel: 0.4, // Subtle sub reinforcement
      vibratoRate: 0, // Hz - disabled for tight bass
      vibratoDepth: 0, // semitones
      hpFreq: 35, // Preserve fundamental but remove rumble
      lpFreq: 2500, // Roll off highs to stay out of mid range
      resonance: 1.2, // Slight resonance for character
      saturation: 0.15, // Warmth and harmonic content
      compThreshold: -16
    };

    // Load preset if specified, otherwise use defaults
    const presetState = presetName && this.constructor.presets[presetName] 
      ? this.constructor.presets[presetName] 
      : defaultState;

    this.state = reactive({ ...presetState });
  }

  getName() {
    return BassGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();

    const ctx = this.audioCtx;
    const osc = acquireNode('oscillator');
    osc.type = this.state.waveform;

    // frequency + detune
    const baseFreq = this.state.frequency * Math.pow(2, this.state.detune / 12);
    osc.frequency.setValueAtTime(baseFreq, when);

    const subLevel = clamp(this.state.subLevel ?? 0, 0, 1);

    // Sub-oscillator (octave down)
    let subOsc = null;
    if (this.state.subOsc) {
      subOsc = acquireNode('oscillator');
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(baseFreq / 2, when);
    }

    // envelope
    const env = acquireNode('gain');
    const playDur = duration || this.state.duration;
    const a = Math.max(0, this.state.attack);
    const d = Math.max(0, this.state.decay);
    const s = Math.max(0, this.state.sustain);
    const r = Math.max(0, this.state.release);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(1, when + a);
    env.gain.linearRampToValueAtTime(s, when + a + d);
    const relStart = when + playDur - r;
    if (relStart > when + a + d) {
      env.gain.setValueAtTime(s, relStart);
      env.gain.linearRampToValueAtTime(0.0001, relStart + r);
    } else {
      env.gain.linearRampToValueAtTime(0.0001, when + playDur);
    }

    // Sub-oscillator envelope
    let subEnv = null;
    if (subOsc) {
      subEnv = acquireNode('gain');
      subEnv.gain.setValueAtTime(0.0001, when);
      subEnv.gain.linearRampToValueAtTime(subLevel, when + a);
      subEnv.gain.linearRampToValueAtTime(subLevel * s, when + a + d);
      if (relStart > when + a + d) {
        subEnv.gain.setValueAtTime(subLevel * s, relStart);
        subEnv.gain.linearRampToValueAtTime(0.0001, relStart + r);
      } else {
        subEnv.gain.linearRampToValueAtTime(0.0001, when + playDur);
      }
    }

    // vibrato LFO (applies small frequency modulation)
    let vibratoOsc = null;
    let vibratoGain = null;
    const vibratoRate = clamp(this.state.vibratoRate ?? 0, 0, 20);
    const vibratoDepth = clamp(this.state.vibratoDepth ?? 0, 0, 2);
    if (vibratoRate > 0 && vibratoDepth > 0) {
      vibratoOsc = acquireNode('oscillator');
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.setValueAtTime(vibratoRate, when);
      vibratoGain = acquireNode('gain');
      vibratoGain.gain.setValueAtTime(vibratoDepth * 100, when);
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.detune);
      if (subOsc) vibratoGain.connect(subOsc.detune);
      vibratoOsc.start(when);
      vibratoOsc.stop(when + playDur + 0.1);
    }

    // processing chain: envelope -> saturation -> filters -> compressor -> level -> track
    let last = env;

    let waveShaper = null;
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    if (saturation > 0.0001) {
      waveShaper = acquireNode('waveShaper');
      waveShaper.curve = getSaturationCurve(saturation);
      waveShaper.oversample = '4x';
      env.connect(waveShaper);
      last = waveShaper;
    }

    const nyquist = ctx.sampleRate * 0.5;

    const hp = acquireNode('biquadFilter');
    hp.type = 'highpass';
    hp.frequency.value = clamp(this.state.hpFreq ?? 20, 10, Math.min(400, nyquist));
    hp.Q.value = clamp(this.state.resonance ?? 0, 0, 5);
    last.connect(hp);
    last = hp;

    const lp = acquireNode('biquadFilter');
    lp.type = 'lowpass';
    lp.frequency.value = clamp(this.state.lpFreq ?? 8000, 200, nyquist);
    lp.Q.value = clamp(this.state.resonance ?? 0, 0, 5);
    last.connect(lp);
    last = lp;

    const comp = acquireNode('dynamicsCompressor');
    comp.threshold.value = clamp(this.state.compThreshold ?? -18, -60, 0);
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    last.connect(comp);
    last = comp;

  const levelGain = acquireNode('gain');
  // Apply 1.4x boost to bring bass to full volume
  const level = clamp(this.state.level ?? 1, 0, 2);
  levelGain.gain.value = level * 1.4;
    last.connect(levelGain);
    levelGain.connect(this.track.gainNode);

    osc.connect(env);

    if (subOsc && subEnv) {
      subOsc.connect(subEnv);
      // Sub-oscillator goes through the same processing chain
      subEnv.connect(waveShaper || env);
    }

    const playDuration = playDur;
    osc.start(when);
    osc.stop(when + playDuration + 0.05);

    if (subOsc) {
      subOsc.start(when);
      subOsc.stop(when + playDuration + 0.05);
    }

    // Schedule cleanup after sound ends
    const cleanupTime = when + playDuration + 0.1;
    setTimeout(() => {
      // Don't release oscillator nodes as they can't be reused
      releaseNode('gain', env);
      if (subEnv) releaseNode('gain', subEnv);
      if (vibratoOsc) {
        // Don't release vibratoOsc (oscillator)
        releaseNode('gain', vibratoGain);
      }
      if (waveShaper) releaseNode('waveShaper', waveShaper);
      releaseNode('biquadFilter', hp);
      releaseNode('biquadFilter', lp);
      releaseNode('dynamicsCompressor', comp);
      releaseNode('gain', levelGain);
    }, (cleanupTime - ctx.currentTime) * 1000);
  }

  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    const ctx = offlineCtx;
    const osc = ctx.createOscillator(); osc.type = this.state.waveform;
    const baseFreq = this.state.frequency * Math.pow(2, this.state.detune / 12);
    osc.frequency.setValueAtTime(baseFreq, when);

    let subOsc = null;
    if (this.state.subOsc) {
      subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(baseFreq / 2, when);
    }

    const env = ctx.createGain();
    const playDur = duration || this.state.duration;
    const a = Math.max(0, this.state.attack);
    const d = Math.max(0, this.state.decay);
    const s = Math.max(0, this.state.sustain);
    const r = Math.max(0, this.state.release);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(1, when + a);
    env.gain.linearRampToValueAtTime(s, when + a + d);
    const relStart = when + playDur - r;
    if (relStart > when + a + d) {
      env.gain.setValueAtTime(s, relStart);
      env.gain.linearRampToValueAtTime(0.0001, relStart + r);
    } else {
      env.gain.linearRampToValueAtTime(0.0001, when + playDur);
    }

    let subEnv = null;
    if (subOsc) {
      subEnv = ctx.createGain();
      subEnv.gain.setValueAtTime(0.0001, when);
      const subLevel = clamp(this.state.subLevel ?? 0, 0, 1);
      subEnv.gain.linearRampToValueAtTime(subLevel, when + a);
      subEnv.gain.linearRampToValueAtTime(subLevel * s, when + a + d);
      if (relStart > when + a + d) {
        subEnv.gain.setValueAtTime(subLevel * s, relStart);
        subEnv.gain.linearRampToValueAtTime(0.0001, relStart + r);
      } else {
        subEnv.gain.linearRampToValueAtTime(0.0001, when + playDur);
      }
    }

    let last = env;
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    if (saturation > 0.0001) {
      const ws = ctx.createWaveShaper();
      ws.curve = getSaturationCurve(saturation); ws.oversample = '4x'; env.connect(ws); last = ws;
    }

    const nyquist = ctx.sampleRate * 0.5;

    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = clamp(this.state.hpFreq ?? 20, 10, Math.min(400, nyquist)); hp.Q.value = clamp(this.state.resonance ?? 0, 0, 5); last.connect(hp); last = hp;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(this.state.lpFreq ?? 8000, 200, nyquist); lp.Q.value = clamp(this.state.resonance ?? 0, 0, 5); last.connect(lp); last = lp;

    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = clamp(this.state.compThreshold ?? -18, -60, 0); comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25; last.connect(comp); last = comp;

    const levelGain = ctx.createGain(); 
    // Apply 1.4x boost for offline rendering
    const level = clamp(this.state.level ?? 1, 0, 2);
    levelGain.gain.value = level * 1.4; 
    last.connect(levelGain); 
    levelGain.connect(destination);
    osc.connect(env);
    if (subOsc && subEnv) {
      subOsc.connect(subEnv);
      subEnv.connect(last === env ? env : last);
    }

    const playDuration = playDur;
    const vibratoRate = clamp(this.state.vibratoRate ?? 0, 0, 20);
    const vibratoDepth = clamp(this.state.vibratoDepth ?? 0, 0, 2);
    if (vibratoRate > 0 && vibratoDepth > 0) {
      const vibratoOsc = ctx.createOscillator();
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.setValueAtTime(vibratoRate, when);
      const vibratoGain = ctx.createGain();
      vibratoGain.gain.setValueAtTime(vibratoDepth * 100, when);
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.detune);
      if (subOsc) {
        vibratoGain.connect(subOsc.detune);
      }
      vibratoOsc.start(when);
      vibratoOsc.stop(when + playDuration + 0.1);
    }

    osc.start(when);
    osc.stop(when + playDuration + 0.05);
    if (subOsc) {
      subOsc.start(when);
      subOsc.stop(when + playDuration + 0.05);
    }
  }
}