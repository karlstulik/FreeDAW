import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'
import { clamp, getSaturationCurve } from '@/utils/audioDSP'

export class ToneGeneratorPlugin extends TrackPlugin {
  static name = 'Tone Generator';

  static presets = {
    'Pluck': {
      frequency: 523.25, // C5
      waveform: 'triangle',
      duration: 0.12,
      level: 0.75,
      attack: 0.002,
      decay: 0.06,
      sustain: 0.3,
      release: 0.08,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 100,
      lpFreq: 6000,
      saturation: 0.05,
      compThreshold: -16
    },
    'Bell': {
      frequency: 783.99, // G5
      waveform: 'sine',
      duration: 0.8,
      level: 0.7,
      attack: 0.001,
      decay: 0.4,
      sustain: 0.2,
      release: 0.6,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 200,
      lpFreq: 8000,
      saturation: 0.02,
      compThreshold: -20
    },
    'Pad': {
      frequency: 440, // A4
      waveform: 'triangle',
      duration: 1.0,
      level: 0.6,
      attack: 0.1,
      decay: 0.3,
      sustain: 0.8,
      release: 0.5,
      detune: 0,
      vibratoRate: 0.5,
      vibratoDepth: 0.1,
      hpFreq: 150,
      lpFreq: 4000,
      saturation: 0.08,
      compThreshold: -18
    },
    'Lead': {
      frequency: 659.25, // E5
      waveform: 'sawtooth',
      duration: 0.3,
      level: 0.65,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.7,
      release: 0.2,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 120,
      lpFreq: 5000,
      saturation: 0.1,
      compThreshold: -14
    },
    'Square Wave': {
      frequency: 293.66, // D4
      waveform: 'square',
      duration: 0.25,
      level: 0.6,
      attack: 0.005,
      decay: 0.08,
      sustain: 0.6,
      release: 0.15,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 80,
      lpFreq: 3000,
      saturation: 0.12,
      compThreshold: -16
    },
    'Saw Wave': {
      frequency: 349.23, // F4
      waveform: 'sawtooth',
      duration: 0.2,
      level: 0.65,
      attack: 0.008,
      decay: 0.05,
      sustain: 0.5,
      release: 0.12,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 90,
      lpFreq: 4000,
      saturation: 0.15,
      compThreshold: -12
    },
    'Pure Sine': {
      frequency: 261.63, // C4
      waveform: 'sine',
      duration: 0.5,
      level: 0.7,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.8,
      release: 0.3,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 50,
      lpFreq: 8000,
      saturation: 0.01,
      compThreshold: -20
    },
    'Warm Triangle': {
      frequency: 392, // G4
      waveform: 'triangle',
      duration: 0.4,
      level: 0.68,
      attack: 0.02,
      decay: 0.15,
      sustain: 0.7,
      release: 0.25,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 60,
      lpFreq: 6000,
      saturation: 0.05,
      compThreshold: -18
    },
    'Pipe Organ': {
      frequency: 220, // A3
      waveform: 'sine',
      duration: 1.2,
      level: 0.75,
      attack: 0.05,
      decay: 0.4,
      sustain: 0.9,
      release: 0.8,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 40,
      lpFreq: 3000,
      saturation: 0.03,
      compThreshold: -22
    },
    'Tubular Bell': {
      frequency: 987.77, // B5
      waveform: 'sine',
      duration: 1.5,
      level: 0.65,
      attack: 0.001,
      decay: 0.8,
      sustain: 0.1,
      release: 1.2,
      detune: 0,
      vibratoRate: 0,
      vibratoDepth: 0,
      hpFreq: 200,
      lpFreq: 10000,
      saturation: 0.02,
      compThreshold: -24
    }
  };

  constructor(track, presetName = null) {
    super(track);
    const defaultState = {
      frequency: 523.25, // C5 - bright, musical tone that cuts through mix
      waveform: 'triangle', // Warmer than sine, cleaner than square
      duration: 0.15, // Slightly longer for melodic presence
      // new controls
      level: 0.7, // Balanced level for melodic elements
      attack: 0.005, // Quick but smooth attack
      decay: 0.08, // Short decay for plucky sound
      sustain: 0.5, // Medium sustain for musicality
      release: 0.12, // Clean release without click
      detune: 0, // semitones
      vibratoRate: 0, // Hz - disabled by default for clean tone
      vibratoDepth: 0, // semitones
      hpFreq: 80, // Remove low mud that conflicts with bass
      lpFreq: 8000, // Remove harsh highs
      saturation: 0.08, // Subtle harmonic richness
      compThreshold: -18
    };

    // Load preset if specified, otherwise use defaults
    const presetState = presetName && this.constructor.presets[presetName] 
      ? this.constructor.presets[presetName] 
      : defaultState;

    this.state = reactive({ ...presetState });
  }

  getName() {
    return ToneGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();

    const ctx = this.audioCtx;
    const osc = acquireNode('oscillator');
    osc.type = this.state.waveform;

    // frequency + detune
    const baseFreq = this.state.frequency * Math.pow(2, this.state.detune / 12);
    osc.frequency.setValueAtTime(baseFreq, when);

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

    // vibrato LFO (applies small pitch modulation via detune for cleaner result)
    let vibratoOsc = null;
    let vibratoGain = null;
    const vibratoRate = clamp(this.state.vibratoRate ?? 0, 0, 20);
    const vibratoDepth = clamp(this.state.vibratoDepth ?? 0, 0, 2);
    if (vibratoRate > 0 && vibratoDepth > 0) {
      vibratoOsc = acquireNode('oscillator');
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.setValueAtTime(vibratoRate, when);
      vibratoGain = acquireNode('gain');
      vibratoGain.gain.setValueAtTime(vibratoDepth * 100, when); // detune is in cents
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.detune);
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
    hp.frequency.value = clamp(this.state.hpFreq ?? 10, 10, Math.min(1000, nyquist));
    last.connect(hp);
    last = hp;

    const lp = acquireNode('biquadFilter');
    lp.type = 'lowpass';
    lp.frequency.value = clamp(this.state.lpFreq ?? nyquist, 200, nyquist);
    last.connect(lp);
    last = lp;

    const comp = acquireNode('dynamicsCompressor');
    comp.threshold.value = clamp(this.state.compThreshold ?? -24, -60, 0);
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    last.connect(comp);
    last = comp;

    const levelGain = acquireNode('gain');
    // Apply 1.5x boost to bring tone generator to full presence
    const level = clamp(this.state.level ?? 1, 0, 2);
    levelGain.gain.value = level * 1.5;
    last.connect(levelGain);
    levelGain.connect(this.track.gainNode);

    osc.connect(env);

    const playDuration = playDur;
    osc.start(when);
    osc.stop(when + playDuration + 0.05);

    // Schedule cleanup after sound ends
    const cleanupTime = when + playDuration + 0.1;
    setTimeout(() => {
      // Don't release oscillator and bufferSource nodes as they can't be reused
      releaseNode('gain', env);
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

    let last = env;
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    if (saturation > 0.0001) {
      const ws = ctx.createWaveShaper();
      ws.curve = getSaturationCurve(saturation);
      ws.oversample = '4x';
      env.connect(ws);
      last = ws;
    }

    const nyquist = ctx.sampleRate * 0.5;

    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = clamp(this.state.hpFreq ?? 10, 10, Math.min(1000, nyquist)); last.connect(hp); last = hp;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(this.state.lpFreq ?? nyquist, 200, nyquist); last.connect(lp); last = lp;

    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = clamp(this.state.compThreshold ?? -24, -60, 0); comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25; last.connect(comp); last = comp;

    const levelGain = ctx.createGain();
    // Apply 1.5x boost for offline rendering
    const level = clamp(this.state.level ?? 1, 0, 2);
    levelGain.gain.value = level * 1.5;
    last.connect(levelGain);
    levelGain.connect(destination);
    osc.connect(env);

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
      vibratoOsc.start(when);
      vibratoOsc.stop(when + playDuration + 0.1);
    }
    osc.start(when);
    osc.stop(when + playDuration + 0.05);
  }
}