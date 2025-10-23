import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'
import { clamp, getSaturationCurve } from '@/utils/audioDSP'

const NOISE_BUFFER_CACHE = new WeakMap()

function getNoiseCache(ctx) {
  if (!NOISE_BUFFER_CACHE.has(ctx)) {
    NOISE_BUFFER_CACHE.set(ctx, new Map())
  }
  return NOISE_BUFFER_CACHE.get(ctx)
}

function getNoiseBuffer(ctx, duration, type = 'white') {
  const cache = getNoiseCache(ctx)
  const safeDuration = Math.max(0.02, duration)
  const key = `${type}:${Math.round(safeDuration * 1000)}`
  if (cache.has(key)) {
    return cache.get(key)
  }

  const length = Math.max(1, Math.ceil(ctx.sampleRate * safeDuration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  } else {
    let lastOut = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + white * 0.02) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
  }

  cache.set(key, buffer)
  return buffer
}

export class SnareGeneratorPlugin extends TrackPlugin {
  static name = 'Snare Generator';

  static presets = {
    'Tight Snare': {
      toneFrequency: 210,
      toneSweep: 7,
      toneDecay: 0.18,
      toneLevel: 0.7,
      toneWaveform: 'triangle',
      noiseDecay: 0.22,
      noiseLevel: 0.95,
      noiseType: 'white',
      attack: 0.001,
      sustain: 0.0,
      release: 0.12,
      bodyFreq: 1900,
      bodyResonance: 3.5,
      hpFreq: 160,
      lpFreq: 8500,
      saturation: 0.12,
      compThreshold: -16,
      snapLevel: 0.12,
      level: 0.9
    },
    'Vintage Snare': {
      toneFrequency: 180,
      toneSweep: 9,
      toneDecay: 0.22,
      toneLevel: 0.6,
      toneWaveform: 'sine',
      noiseDecay: 0.28,
      noiseLevel: 0.85,
      noiseType: 'pink',
      attack: 0.001,
      sustain: 0.0,
      release: 0.16,
      bodyFreq: 1600,
      bodyResonance: 2.8,
      hpFreq: 140,
      lpFreq: 7000,
      saturation: 0.18,
      compThreshold: -18,
      snapLevel: 0.08,
      level: 0.95
    },
    'Crack Snare': {
      toneFrequency: 240,
      toneSweep: 6,
      toneDecay: 0.14,
      toneLevel: 0.75,
      toneWaveform: 'triangle',
      noiseDecay: 0.2,
      noiseLevel: 1.05,
      noiseType: 'white',
      attack: 0.0008,
      sustain: 0.0,
      release: 0.1,
      bodyFreq: 2300,
      bodyResonance: 4.5,
      hpFreq: 220,
      lpFreq: 10000,
      saturation: 0.1,
      compThreshold: -14,
      snapLevel: 0.16,
      level: 1.0
    },
    'Trap Snare': {
      toneFrequency: 260,
      toneSweep: 12,
      toneDecay: 0.3,
      toneLevel: 0.6,
      toneWaveform: 'triangle',
      noiseDecay: 0.32,
      noiseLevel: 1.1,
      noiseType: 'white',
      attack: 0.001,
      sustain: 0.0,
      release: 0.2,
      bodyFreq: 2600,
      bodyResonance: 5.5,
      hpFreq: 200,
      lpFreq: 12000,
      saturation: 0.22,
      compThreshold: -12,
      snapLevel: 0.2,
      level: 1.1
    },
    'Lo-Fi Snare': {
      toneFrequency: 165,
      toneSweep: 4,
      toneDecay: 0.25,
      toneLevel: 0.55,
      toneWaveform: 'sine',
      noiseDecay: 0.35,
      noiseLevel: 0.8,
      noiseType: 'brown',
      attack: 0.0015,
      sustain: 0.0,
      release: 0.18,
      bodyFreq: 1500,
      bodyResonance: 2.1,
      hpFreq: 130,
      lpFreq: 6000,
      saturation: 0.28,
      compThreshold: -20,
      snapLevel: 0.05,
      level: 0.85
    },
    '808 Snare': {
      toneFrequency: 205,
      toneSweep: 8,
      toneDecay: 0.24,
      toneLevel: 0.68,
      toneWaveform: 'triangle',
      noiseDecay: 0.3,
      noiseLevel: 1.0,
      noiseType: 'white',
      attack: 0.001,
      sustain: 0.0,
      release: 0.16,
      bodyFreq: 2100,
      bodyResonance: 3.8,
      hpFreq: 150,
      lpFreq: 9000,
      saturation: 0.16,
      compThreshold: -15,
      snapLevel: 0.14,
      level: 1.0
    },
    'Rim Snare': {
      toneFrequency: 320,
      toneSweep: 3,
      toneDecay: 0.12,
      toneLevel: 0.5,
      toneWaveform: 'sine',
      noiseDecay: 0.18,
      noiseLevel: 0.6,
      noiseType: 'white',
      attack: 0.001,
      sustain: 0.0,
      release: 0.1,
      bodyFreq: 3400,
      bodyResonance: 1.9,
      hpFreq: 260,
      lpFreq: 9500,
      saturation: 0.12,
      compThreshold: -18,
      snapLevel: 0.2,
      level: 0.85
    },
    'Crunch Snare': {
      toneFrequency: 190,
      toneSweep: 5,
      toneDecay: 0.2,
      toneLevel: 0.65,
      toneWaveform: 'triangle',
      noiseDecay: 0.24,
      noiseLevel: 1.15,
      noiseType: 'white',
      attack: 0.0008,
      sustain: 0.0,
      release: 0.12,
      bodyFreq: 2100,
      bodyResonance: 4.1,
      hpFreq: 180,
      lpFreq: 10000,
      saturation: 0.24,
      compThreshold: -13,
      snapLevel: 0.18,
      level: 1.05
    },
    'Brush Snare': {
      toneFrequency: 150,
      toneSweep: 2,
      toneDecay: 0.3,
      toneLevel: 0.4,
      toneWaveform: 'sine',
      noiseDecay: 0.38,
      noiseLevel: 0.7,
      noiseType: 'pink',
      attack: 0.001,
      sustain: 0.0,
      release: 0.22,
      bodyFreq: 1400,
      bodyResonance: 1.5,
      hpFreq: 120,
      lpFreq: 6500,
      saturation: 0.08,
      compThreshold: -22,
      snapLevel: 0.04,
      level: 0.8
    },
    'Huge Snare': {
      toneFrequency: 230,
      toneSweep: 12,
      toneDecay: 0.32,
      toneLevel: 0.75,
      toneWaveform: 'triangle',
      noiseDecay: 0.42,
      noiseLevel: 1.2,
      noiseType: 'white',
      attack: 0.001,
      sustain: 0.0,
      release: 0.24,
      bodyFreq: 2400,
      bodyResonance: 5.0,
      hpFreq: 180,
      lpFreq: 11500,
      saturation: 0.2,
      compThreshold: -12,
      snapLevel: 0.22,
      level: 1.15
    }
  };

  constructor(track, presetName = null) {
    super(track);
    const defaultState = {
      toneFrequency: 205,
      toneSweep: 8,
      toneDecay: 0.2,
      toneLevel: 0.68,
      toneWaveform: 'triangle',
      noiseDecay: 0.25,
      noiseLevel: 1.0,
      noiseType: 'white',
      attack: 0.001,
      sustain: 0.0,
      release: 0.14,
      bodyFreq: 2100,
      bodyResonance: 3.8,
      hpFreq: 180,
      lpFreq: 9500,
      saturation: 0.16,
      compThreshold: -16,
      snapLevel: 0.15,
      level: 1.0
    };

    const presetState = presetName && this.constructor.presets[presetName]
      ? this.constructor.presets[presetName]
      : defaultState;

    this.state = reactive({ ...presetState });
  }

  getName() {
    return SnareGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();
    const ctx = this.audioCtx;

    const attack = clamp(this.state.attack ?? 0.001, 0, 0.02);
    const toneDecay = clamp(this.state.toneDecay ?? 0.2, 0.01, 1.5);
    const noiseDecay = clamp(this.state.noiseDecay ?? 0.25, 0.01, 1.5);
    const release = clamp(this.state.release ?? 0.14, 0.01, 1.5);
    const sustain = clamp(this.state.sustain ?? 0, 0, 1);
    const playDur = duration || Math.max(toneDecay, noiseDecay) + release + 0.05;

    const baseFreq = clamp(this.state.toneFrequency ?? 200, 60, 4000);
    const sweep = clamp(this.state.toneSweep ?? 8, -24, 24);
    const startFreq = clamp(baseFreq * Math.pow(2, sweep / 12), 40, 8000);
    const toneLevel = clamp(this.state.toneLevel ?? 0.7, 0, 1.5);

    const toneOsc = acquireNode('oscillator');
    toneOsc.type = this.state.toneWaveform || 'triangle';
    toneOsc.frequency.setValueAtTime(startFreq, when);
    toneOsc.frequency.exponentialRampToValueAtTime(baseFreq, when + Math.max(0.01, toneDecay * 0.6));

    const toneGain = acquireNode('gain');
    toneGain.gain.setValueAtTime(0.0001, when);
    toneGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, toneLevel), when + attack + 0.0001);
    toneGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, toneLevel * sustain), when + attack + toneDecay + 0.0001);
    const toneReleaseStart = when + playDur - release;
    if (toneReleaseStart > when + attack + toneDecay) {
      toneGain.gain.setValueAtTime(Math.max(0.0001, toneLevel * sustain), toneReleaseStart);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, toneReleaseStart + release + 0.0001);
    } else {
      toneGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001);
    }
    toneOsc.connect(toneGain);

    const noiseType = this.state.noiseType || 'white';
    const noiseBuffer = getNoiseBuffer(ctx, playDur + 0.05, noiseType);
    const noiseSource = acquireNode('bufferSource');
    noiseSource.buffer = noiseBuffer;
    const noiseGain = acquireNode('gain');
    const noiseLevel = clamp(this.state.noiseLevel ?? 1, 0, 2);
    noiseGain.gain.setValueAtTime(0.0001, when);
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, noiseLevel), when + attack + 0.0001);
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, noiseLevel * sustain), when + attack + noiseDecay + 0.0001);
    const noiseReleaseStart = when + playDur - release;
    if (noiseReleaseStart > when + attack + noiseDecay) {
      noiseGain.gain.setValueAtTime(Math.max(0.0001, noiseLevel * sustain), noiseReleaseStart);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, noiseReleaseStart + release + 0.0001);
    } else {
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001);
    }
    noiseSource.connect(noiseGain);

    const snapLevel = clamp(this.state.snapLevel ?? 0, 0, 1);
    let snapSource = null;
    let snapGain = null;
    if (snapLevel > 0.0001) {
      snapSource = acquireNode('bufferSource');
      snapSource.buffer = getNoiseBuffer(ctx, 0.05, 'white');
      snapGain = acquireNode('gain');
      snapGain.gain.setValueAtTime(Math.max(0.0001, snapLevel), when);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
      snapSource.connect(snapGain);
    }

    const mixGain = acquireNode('gain');
    mixGain.gain.value = 1;
    toneGain.connect(mixGain);
    noiseGain.connect(mixGain);
    if (snapGain) snapGain.connect(mixGain);

    let lastNode = mixGain;

    let waveShaper = null;
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    if (saturation > 0.0001) {
      waveShaper = acquireNode('waveShaper');
      waveShaper.curve = getSaturationCurve(saturation);
      waveShaper.oversample = '4x';
      lastNode.connect(waveShaper);
      lastNode = waveShaper;
    }

    const bodyFilter = acquireNode('biquadFilter');
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.value = clamp(this.state.bodyFreq ?? 2000, 200, 10000);
    bodyFilter.Q.value = clamp(this.state.bodyResonance ?? 3, 0.1, 20);
    lastNode.connect(bodyFilter);
    lastNode = bodyFilter;

    const hp = acquireNode('biquadFilter');
    hp.type = 'highpass';
    hp.frequency.value = clamp(this.state.hpFreq ?? 180, 40, 4000);
    hp.Q.value = 0.707;
    lastNode.connect(hp);
    lastNode = hp;

    const lp = acquireNode('biquadFilter');
    lp.type = 'lowpass';
    lp.frequency.value = clamp(this.state.lpFreq ?? 9500, 1000, 20000);
    lp.Q.value = 0.707;
    lastNode.connect(lp);
    lastNode = lp;

    const comp = acquireNode('dynamicsCompressor');
    comp.threshold.value = clamp(this.state.compThreshold ?? -16, -60, 0);
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    lastNode.connect(comp);
    lastNode = comp;

    const levelGain = acquireNode('gain');
    const level = clamp(this.state.level ?? 1, 0, 2);
    levelGain.gain.value = level * 1.25;
    lastNode.connect(levelGain);
    levelGain.connect(this.track.gainNode);

    if (toneOsc._hasStarted) {
      console.warn('SnareGeneratorPlugin: oscillator already started');
    } else {
      toneOsc._hasStarted = true;
      toneOsc.start(when);
      toneOsc.stop(when + playDur + 0.05);
    }

    noiseSource.start(when);
    noiseSource.stop(when + playDur + 0.05);
    if (snapSource) {
      snapSource.start(when);
      snapSource.stop(when + 0.05);
    }

    const cleanupTime = when + playDur + 0.1;
    setTimeout(() => {
      releaseNode('gain', toneGain);
      releaseNode('gain', noiseGain);
      releaseNode('gain', mixGain);
      if (snapGain) releaseNode('gain', snapGain);
      if (waveShaper) releaseNode('waveShaper', waveShaper);
      releaseNode('biquadFilter', bodyFilter);
      releaseNode('biquadFilter', hp);
      releaseNode('biquadFilter', lp);
      releaseNode('dynamicsCompressor', comp);
      releaseNode('gain', levelGain);
    }, Math.max(0, (cleanupTime - ctx.currentTime) * 1000));
  }

  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    const ctx = offlineCtx;

    const attack = clamp(this.state.attack ?? 0.001, 0, 0.02);
    const toneDecay = clamp(this.state.toneDecay ?? 0.2, 0.01, 1.5);
    const noiseDecay = clamp(this.state.noiseDecay ?? 0.25, 0.01, 1.5);
    const release = clamp(this.state.release ?? 0.14, 0.01, 1.5);
    const sustain = clamp(this.state.sustain ?? 0, 0, 1);
    const playDur = duration || Math.max(toneDecay, noiseDecay) + release + 0.05;

    const baseFreq = clamp(this.state.toneFrequency ?? 200, 60, 4000);
    const sweep = clamp(this.state.toneSweep ?? 8, -24, 24);
    const startFreq = clamp(baseFreq * Math.pow(2, sweep / 12), 40, 8000);
    const toneLevel = clamp(this.state.toneLevel ?? 0.7, 0, 1.5);

    const toneOsc = ctx.createOscillator();
    toneOsc.type = this.state.toneWaveform || 'triangle';
    toneOsc.frequency.setValueAtTime(startFreq, when);
    toneOsc.frequency.exponentialRampToValueAtTime(baseFreq, when + Math.max(0.01, toneDecay * 0.6));

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0.0001, when);
    toneGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, toneLevel), when + attack + 0.0001);
    toneGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, toneLevel * sustain), when + attack + toneDecay + 0.0001);
    const toneReleaseStart = when + playDur - release;
    if (toneReleaseStart > when + attack + toneDecay) {
      toneGain.gain.setValueAtTime(Math.max(0.0001, toneLevel * sustain), toneReleaseStart);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, toneReleaseStart + release + 0.0001);
    } else {
      toneGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001);
    }
    toneOsc.connect(toneGain);

    const noiseBuffer = getNoiseBuffer(ctx, playDur + 0.05, this.state.noiseType || 'white');
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    const noiseLevel = clamp(this.state.noiseLevel ?? 1, 0, 2);
    noiseGain.gain.setValueAtTime(0.0001, when);
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, noiseLevel), when + attack + 0.0001);
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, noiseLevel * sustain), when + attack + noiseDecay + 0.0001);
    const noiseReleaseStart = when + playDur - release;
    if (noiseReleaseStart > when + attack + noiseDecay) {
      noiseGain.gain.setValueAtTime(Math.max(0.0001, noiseLevel * sustain), noiseReleaseStart);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, noiseReleaseStart + release + 0.0001);
    } else {
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001);
    }
    noiseSource.connect(noiseGain);

    const snapLevel = clamp(this.state.snapLevel ?? 0, 0, 1);
    let snapSource = null;
    let snapGain = null;
    if (snapLevel > 0.0001) {
      snapSource = ctx.createBufferSource();
      snapSource.buffer = getNoiseBuffer(ctx, 0.05, 'white');
      snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(Math.max(0.0001, snapLevel), when);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
      snapSource.connect(snapGain);
    }

    const mixGain = ctx.createGain();
    mixGain.gain.value = 1;
    toneGain.connect(mixGain);
    noiseGain.connect(mixGain);
    if (snapGain) snapGain.connect(mixGain);

    let lastNode = mixGain;

    if (clamp(this.state.saturation ?? 0, 0, 1) > 0.0001) {
      const waveShaper = ctx.createWaveShaper();
      waveShaper.curve = getSaturationCurve(this.state.saturation);
      waveShaper.oversample = '4x';
      lastNode.connect(waveShaper);
      lastNode = waveShaper;
    }

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.value = clamp(this.state.bodyFreq ?? 2000, 200, 10000);
    bodyFilter.Q.value = clamp(this.state.bodyResonance ?? 3, 0.1, 20);
    lastNode.connect(bodyFilter);
    lastNode = bodyFilter;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = clamp(this.state.hpFreq ?? 180, 40, 4000);
    hp.Q.value = 0.707;
    lastNode.connect(hp);
    lastNode = hp;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = clamp(this.state.lpFreq ?? 9500, 1000, 20000);
    lp.Q.value = 0.707;
    lastNode.connect(lp);
    lastNode = lp;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = clamp(this.state.compThreshold ?? -16, -60, 0);
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    lastNode.connect(comp);
    lastNode = comp;

    const levelGain = ctx.createGain();
    const level = clamp(this.state.level ?? 1, 0, 2);
    levelGain.gain.value = level * 1.25;
    lastNode.connect(levelGain);
    levelGain.connect(destination);

    toneOsc.start(when);
    toneOsc.stop(when + playDur + 0.05);
    noiseSource.start(when);
    noiseSource.stop(when + playDur + 0.05);
    if (snapSource) {
      snapSource.start(when);
      snapSource.stop(when + 0.05);
    }
  }
}
