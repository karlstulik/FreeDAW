import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'
import { clamp, getSaturationCurve } from '@/utils/audioDSP'

export class KickGeneratorPlugin extends TrackPlugin {
  static name = 'Kick Generator';

  static presets = {
    'Deep Kick': {
      frequency: 45, // Low fundamental for deep kick
      pitchOffset: 0,
      level: 0.9,
      attack: 0.001,
      decay: 0.4,
      sustain: 0.0,
      release: 0.1,
      clickLevel: 0.01,
      hpFreq: 20,
      saturation: 0.05,
      compThreshold: -24
    },
    'Punchy Kick': {
      frequency: 55, // A1 - punchy kick
      pitchOffset: 0,
      level: 0.85,
      attack: 0.002,
      decay: 0.35,
      sustain: 0.0,
      release: 0.08,
      clickLevel: 0.015,
      hpFreq: 25,
      saturation: 0.12,
      compThreshold: -20
    },
    'Snappy Kick': {
      frequency: 60, // Higher pitch for snappy attack
      pitchOffset: 0,
      level: 0.8,
      attack: 0.001,
      decay: 0.25,
      sustain: 0.0,
      release: 0.06,
      clickLevel: 0.025,
      hpFreq: 30,
      saturation: 0.08,
      compThreshold: -18
    },
    'Boom Kick': {
      frequency: 40, // Very low for boomy sound
      pitchOffset: 0,
      level: 0.95,
      attack: 0.003,
      decay: 0.5,
      sustain: 0.0,
      release: 0.12,
      clickLevel: 0.005,
      hpFreq: 18,
      saturation: 0.03,
      compThreshold: -26
    },
    'Tight Kick': {
      frequency: 50, // Balanced frequency
      pitchOffset: 0,
      level: 0.82,
      attack: 0.0015,
      decay: 0.2,
      sustain: 0.0,
      release: 0.05,
      clickLevel: 0.02,
      hpFreq: 28,
      saturation: 0.1,
      compThreshold: -16
    },
    '808 Kick': {
      frequency: 35, // Classic 808 frequency
      pitchOffset: 0,
      level: 0.88,
      attack: 0.001,
      decay: 0.45,
      sustain: 0.0,
      release: 0.09,
      clickLevel: 0.008,
      hpFreq: 22,
      saturation: 0.04,
      compThreshold: -22
    },
    'Room Kick': {
      frequency: 48, // Roomy kick frequency
      pitchOffset: 0,
      level: 0.85,
      attack: 0.002,
      decay: 0.5,
      sustain: 0.0,
      release: 0.1,
      clickLevel: 0.012,
      hpFreq: 20,
      saturation: 0.06,
      compThreshold: -20
    },
    'Stomp Kick': {
      frequency: 42, // Heavy stomp frequency
      pitchOffset: 0,
      level: 0.92,
      attack: 0.003,
      decay: 0.4,
      sustain: 0.0,
      release: 0.08,
      clickLevel: 0.015,
      hpFreq: 18,
      saturation: 0.08,
      compThreshold: -18
    },
    'Electro Kick': {
      frequency: 52, // Bright electro frequency
      pitchOffset: 0,
      level: 0.8,
      attack: 0.001,
      decay: 0.3,
      sustain: 0.0,
      release: 0.06,
      clickLevel: 0.02,
      hpFreq: 30,
      saturation: 0.1,
      compThreshold: -16
    },
    'Vinyl Kick': {
      frequency: 38, // Vintage vinyl frequency
      pitchOffset: 0,
      level: 0.86,
      attack: 0.002,
      decay: 0.42,
      sustain: 0.0,
      release: 0.085,
      clickLevel: 0.01,
      hpFreq: 24,
      saturation: 0.05,
      compThreshold: -21
    }
  };

  constructor(track, presetName = null) {
    super(track);
    const defaultState = {
      frequency: 55, // Deep, punchy kick frequency (A1)
      pitchOffset: 0, // semitones offset
      level: 0.85, // Optimized level to prevent clipping in mix
      // ADSR envelope - tuned for clean attack and smooth decay
      attack: 0.002, // Very fast attack for punch without click
      decay: 0.35, // Longer decay for sustained thump
      sustain: 0.0, // No sustain for natural kick decay
      release: 0.08, // Smooth release to avoid tail click
      // click/transient for attack - reduced for cleaner sound
      clickLevel: 0.015,
      // high-pass filter to clean sub rumble
      hpFreq: 25, // Remove subsonic content only
      // saturation amount 0-1 - subtle warmth
      saturation: 0.12,
      // compressor settings (threshold in dB)
      compThreshold: -20
    };

    // Load preset if specified, otherwise use defaults
    const presetState = presetName && this.constructor.presets[presetName] 
      ? this.constructor.presets[presetName] 
      : defaultState;

    this.state = reactive({ ...presetState });
  }

  getName() {
    return KickGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();
    const ctx = this.audioCtx;

    // compute frequency with pitch offset in semitones
  const baseFrequency = clamp(this.state.frequency ?? 55, 20, 400);
  const pitchOffset = this.state.pitchOffset ?? 0;
  const freq = baseFrequency * Math.pow(2, pitchOffset / 12);

    const osc = acquireNode('oscillator');
    osc.type = 'sine';
    // Pitch sweep: start 2.5 octaves up for punch, sweep down to fundamental
    osc.frequency.setValueAtTime(freq * 5.66, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + Math.max(0.02, this.state.decay * 0.15));
    // Guard: prevent double-start
    if (osc._hasStarted) {
      console.warn('KickGeneratorPlugin: Attempted to start oscillator twice!', osc, when);
      return;
    }
    osc._hasStarted = true;

    // Envelope (ADSR-like)
    const envGain = acquireNode('gain');
    const playDur = duration || (this.state.decay + this.state.release + 0.05);
    const a = Math.max(0, this.state.attack);
    const d = Math.max(0, this.state.decay);
    const s = Math.max(0, this.state.sustain);
    const r = Math.max(0, this.state.release);

    envGain.gain.setValueAtTime(0.0001, when);
    envGain.gain.exponentialRampToValueAtTime(1.0, when + a + 0.0001);
    envGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, s), when + a + d + 0.0001);
    const releaseStart = when + playDur - r;
    if (releaseStart > when + a + d) {
      envGain.gain.setValueAtTime(Math.max(0.0001, s), releaseStart);
      envGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + r + 0.0001);
    } else {
      envGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001);
    }

    // build processing chain
    let lastNode = envGain;

    let waveShaper = null;
    // optional saturation
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    if (saturation > 0.0001) {
      waveShaper = acquireNode('waveShaper');
      waveShaper.curve = getSaturationCurve(saturation);
      waveShaper.oversample = '4x';
      envGain.connect(waveShaper);
      lastNode = waveShaper;
    }

    // HP filter
    const hp = acquireNode('biquadFilter');
    hp.type = 'highpass';
    hp.frequency.value = clamp(this.state.hpFreq ?? 20, 10, 2000);
    lastNode.connect(hp);
    lastNode = hp;

    // compressor
    const comp = acquireNode('dynamicsCompressor');
    comp.threshold.value = clamp(this.state.compThreshold ?? -24, -60, 0);
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    lastNode.connect(comp);
    lastNode = comp;

    // plugin level with normalization boost and route to track
    const levelGain = acquireNode('gain');
    // Apply 1.3x boost to bring kick to full volume after processing chain
  const level = clamp(this.state.level ?? 1, 0, 2);
  levelGain.gain.value = level * 1.3;
    lastNode.connect(levelGain);
    levelGain.connect(this.track.gainNode);

    // connect oscillator -> envelope
    osc.connect(envGain);

    // click/transient for attack
    let clickOsc = null;
    let clickG = null;
    const clickLevel = clamp(this.state.clickLevel ?? 0, 0, 1);
    if (clickLevel > 0.0001) {
      clickOsc = acquireNode('oscillator');
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(8000, when);
      clickG = acquireNode('gain');
      clickG.gain.setValueAtTime(clickLevel, when);
      clickG.gain.exponentialRampToValueAtTime(0.0001, when + 0.01);
      clickOsc.connect(clickG);
      // route click through HP (same chain)
      clickG.connect(hp);
      if (clickOsc._hasStarted) {
        console.warn('KickGeneratorPlugin: Attempted to start clickOsc twice!', clickOsc, when);
      } else {
        clickOsc._hasStarted = true;
        clickOsc.start(when);
        clickOsc.stop(when + 0.02);
      }
    }

    const playDuration = playDur;
  osc.start(when);
  osc.stop(when + playDuration + 0.02);

    // Schedule cleanup after sound ends
    const cleanupTime = when + playDuration + 0.1;
    setTimeout(() => {
      // Don't release oscillator nodes as they can't be reused
      releaseNode('gain', envGain);
      if (waveShaper) releaseNode('waveShaper', waveShaper);
      releaseNode('biquadFilter', hp);
      releaseNode('dynamicsCompressor', comp);
      releaseNode('gain', levelGain);
      if (clickOsc) {
        // Don't release clickOsc (oscillator)
        releaseNode('gain', clickG);
      }
    }, (cleanupTime - ctx.currentTime) * 1000);
  }

  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    const ctx = offlineCtx;
  const baseFrequency = clamp(this.state.frequency ?? 55, 20, 400);
  const pitchOffset = this.state.pitchOffset ?? 0;
  const freq = baseFrequency * Math.pow(2, pitchOffset / 12);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    // Pitch sweep: start 2.5 octaves up for punch, sweep down to fundamental
    osc.frequency.setValueAtTime(freq * 5.66, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + Math.max(0.02, this.state.decay * 0.15));

    const envGain = ctx.createGain();
    const playDur = duration || (this.state.decay + this.state.release + 0.05);
    const a = Math.max(0, this.state.attack);
    const d = Math.max(0, this.state.decay);
    const s = Math.max(0, this.state.sustain);
    const r = Math.max(0, this.state.release);
    envGain.gain.setValueAtTime(0.0001, when);
    envGain.gain.exponentialRampToValueAtTime(1.0, when + a + 0.0001);
    envGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, s), when + a + d + 0.0001);
    const releaseStart = when + playDur - r;
    if (releaseStart > when + a + d) {
      envGain.gain.setValueAtTime(Math.max(0.0001, s), releaseStart);
      envGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + r + 0.0001);
    } else {
      envGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001);
    }

    let lastNode = envGain;
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    if (saturation > 0.0001) {
      const ws = ctx.createWaveShaper();
      ws.curve = getSaturationCurve(saturation);
      ws.oversample = '4x';
      envGain.connect(ws);
      lastNode = ws;
    }

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = clamp(this.state.hpFreq ?? 20, 10, 2000);
    lastNode.connect(hp);
    lastNode = hp;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = clamp(this.state.compThreshold ?? -24, -60, 0);
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    lastNode.connect(comp);
    lastNode = comp;

    const levelGain = ctx.createGain();
    // Apply 1.3x boost for offline rendering to match live normalization
    const level = clamp(this.state.level ?? 1, 0, 2);
    levelGain.gain.value = level * 1.3;
    lastNode.connect(levelGain);
    levelGain.connect(destination);
    osc.connect(envGain);
    const clickLevel = clamp(this.state.clickLevel ?? 0, 0, 1);
    if (clickLevel > 0.0001) {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(8000, when);
      const clickG = ctx.createGain();
      clickG.gain.setValueAtTime(clickLevel, when);
      clickG.gain.exponentialRampToValueAtTime(0.0001, when + 0.01);
      clickOsc.connect(clickG);
      clickG.connect(hp);
      clickOsc.start(when);
      clickOsc.stop(when + 0.02);
    }

    const playDuration = playDur;
    osc.start(when);
    osc.stop(when + playDuration + 0.02);
  }
}