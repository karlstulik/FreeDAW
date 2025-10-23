import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'
import { clamp, getSaturationCurve } from '@/utils/audioDSP'

const NOISE_BUFFER_CACHE = new WeakMap();

function getNoiseCache(ctx) {
  if (!NOISE_BUFFER_CACHE.has(ctx)) {
    NOISE_BUFFER_CACHE.set(ctx, new Map());
  }
  return NOISE_BUFFER_CACHE.get(ctx);
}

export class ClapGeneratorPlugin extends TrackPlugin {
  static name = 'Clap Generator';

  static presets = {
    'Tight Clap': {
      level: 0.8,
      attack: 0.001,
      decay: 0.06,
      sustain: 0.0,
      release: 0.04,
      noiseType: 'white',
      hpFreq: 300,
      lpFreq: 6000,
      resonance: 1.5,
      layers: 2,
      layerSpread: 0.003,
      layerLevel: 0.8,
      saturation: 0.06,
      compThreshold: -16
    },
    'Loose Clap': {
      level: 0.75,
      attack: 0.001,
      decay: 0.1,
      sustain: 0.0,
      release: 0.06,
      noiseType: 'white',
      hpFreq: 150,
      lpFreq: 5000,
      resonance: 1.2,
      layers: 3,
      layerSpread: 0.008,
      layerLevel: 0.6,
      saturation: 0.08,
      compThreshold: -18
    },
    'Layered Clap': {
      level: 0.82,
      attack: 0.001,
      decay: 0.08,
      sustain: 0.0,
      release: 0.05,
      noiseType: 'white',
      hpFreq: 200,
      lpFreq: 8000,
      resonance: 2.0,
      layers: 4,
      layerSpread: 0.005,
      layerLevel: 0.7,
      saturation: 0.1,
      compThreshold: -18
    },
    'Snappy Clap': {
      level: 0.78,
      attack: 0.0005,
      decay: 0.04,
      sustain: 0.0,
      release: 0.03,
      noiseType: 'white',
      hpFreq: 400,
      lpFreq: 7000,
      resonance: 2.5,
      layers: 2,
      layerSpread: 0.002,
      layerLevel: 0.9,
      saturation: 0.05,
      compThreshold: -14
    },
    'Sharp Clap': {
      level: 0.8,
      attack: 0.0008,
      decay: 0.05,
      sustain: 0.0,
      release: 0.035,
      noiseType: 'pink',
      hpFreq: 250,
      lpFreq: 6500,
      resonance: 1.8,
      layers: 1,
      layerSpread: 0,
      layerLevel: 1.0,
      saturation: 0.07,
      compThreshold: -16
    },
    'Boom Clap': {
      level: 0.85,
      attack: 0.002,
      decay: 0.12,
      sustain: 0.0,
      release: 0.08,
      noiseType: 'brown',
      hpFreq: 100,
      lpFreq: 4000,
      resonance: 1.0,
      layers: 3,
      layerSpread: 0.01,
      layerLevel: 0.5,
      saturation: 0.12,
      compThreshold: -20
    },
    'Vintage Clap': {
      level: 0.82,
      attack: 0.001,
      decay: 0.09,
      sustain: 0.0,
      release: 0.06,
      noiseType: 'white',
      hpFreq: 150,
      lpFreq: 5500,
      resonance: 1.5,
      layers: 2,
      layerSpread: 0.004,
      layerLevel: 0.8,
      saturation: 0.04,
      compThreshold: -18
    },
    'Modern Clap': {
      level: 0.8,
      attack: 0.0008,
      decay: 0.07,
      sustain: 0.0,
      release: 0.04,
      noiseType: 'white',
      hpFreq: 250,
      lpFreq: 7000,
      resonance: 2.2,
      layers: 4,
      layerSpread: 0.003,
      layerLevel: 0.9,
      saturation: 0.08,
      compThreshold: -16
    },
    'Filtered Clap': {
      level: 0.78,
      attack: 0.001,
      decay: 0.08,
      sustain: 0.0,
      release: 0.05,
      noiseType: 'pink',
      hpFreq: 400,
      lpFreq: 3000,
      resonance: 3.0,
      layers: 2,
      layerSpread: 0.005,
      layerLevel: 0.7,
      saturation: 0.06,
      compThreshold: -14
    },
    'Wide Clap': {
      level: 0.83,
      attack: 0.001,
      decay: 0.1,
      sustain: 0.0,
      release: 0.07,
      noiseType: 'white',
      hpFreq: 180,
      lpFreq: 6500,
      resonance: 1.8,
      layers: 5,
      layerSpread: 0.012,
      layerLevel: 0.6,
      saturation: 0.1,
      compThreshold: -17
    }
  };

  constructor(track, presetName = null) {
    super(track);
    const defaultState = {
      level: 0.8, // Balanced level for clap in mix
      // ADSR envelope - tuned for sharp attack and fast decay
      attack: 0.001, // Very fast attack for snap
      decay: 0.08, // Fast decay for clap character
      sustain: 0.0, // No sustain for natural clap decay
      release: 0.05, // Quick release
      // noise characteristics
      noiseType: 'white', // white, pink, or brown noise
      // filtering for clap tone
      hpFreq: 200, // High-pass to remove low-end mud
      lpFreq: 8000, // Low-pass for brightness
      resonance: 2.0, // Slight resonance for character
      // layering for fuller sound
      layers: 3, // Number of clap layers
      layerSpread: 0.005, // Time spread between layers
      layerLevel: 0.7, // Level of additional layers
      // saturation for warmth and punch
      saturation: 0.08,
      // compressor settings
      compThreshold: -18
    };

    // Load preset if specified, otherwise use defaults
    const presetState = presetName && this.constructor.presets[presetName] 
      ? this.constructor.presets[presetName] 
      : defaultState;

    this.state = reactive({ ...presetState });
  }

  getName() {
    return ClapGeneratorPlugin.name;
  }

  // Generate noise buffer
  createNoiseBuffer(ctx, duration, type = 'white', variantIndex = 0) {
    const cache = getNoiseCache(ctx);
    const safeDuration = Math.max(0.001, duration);
    const durationKey = Math.round(safeDuration * 1000);
    const cacheKey = `${type}:${durationKey}`;
    let variants = cache.get(cacheKey);
    if (!variants) {
      variants = [];
      cache.set(cacheKey, variants);
    }
    const index = clamp(Math.floor(variantIndex), 0, 7);
    if (!variants[index]) {
      const sampleRate = ctx.sampleRate;
      const length = Math.max(1, Math.ceil(sampleRate * safeDuration));
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      if (type === 'white') {
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11;
          b6 = white * 0.115926;
        }
      } else if (type === 'brown') {
        let lastOut = 0.0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
      }

      variants[index] = buffer;
    }

    return variants[index];
  }

  play(when, duration) {
    this.track.ensureAudioNodes();
    const ctx = this.audioCtx;

    const nyquist = ctx.sampleRate * 0.5;
    const layerCount = Math.max(1, Math.min(8, Math.round(this.state.layers || 1)));
    const layerSpread = clamp(this.state.layerSpread ?? 0.005, 0, 0.05);
    const layerLevelMix = clamp(this.state.layerLevel ?? 0.7, 0, 1);
    const outputLevel = clamp(this.state.level ?? 1, 0, 2);
    const resonance = clamp(this.state.resonance ?? 1, 0, 10);
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    const compThreshold = clamp(this.state.compThreshold ?? -24, -60, 0);

    // Create multiple layers for fuller clap sound
    for (let layer = 0; layer < layerCount; layer++) {
      const layerDelay = layer * layerSpread;
      const layerWhen = when + layerDelay;
      const layerLevel = layer === 0 ? 1.0 : layerLevelMix;

      // Create noise source
      const noiseBuffer = this.createNoiseBuffer(ctx, 0.2, this.state.noiseType, layer);
      const noiseSource = acquireNode('bufferSource');
      noiseSource.buffer = noiseBuffer;

      // Envelope
      const envGain = acquireNode('gain');
      const playDur = duration || (this.state.decay + this.state.release + 0.02);
      const a = Math.max(0, this.state.attack);
      const d = Math.max(0, this.state.decay);
      const s = Math.max(0, this.state.sustain);
      const r = Math.max(0, this.state.release);

      envGain.gain.setValueAtTime(0.0001, layerWhen);
      envGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, layerLevel), layerWhen + a + 0.0001);
      envGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, s * layerLevel), layerWhen + a + d + 0.0001);
      const releaseStart = layerWhen + playDur - r;
      if (releaseStart > layerWhen + a + d) {
        envGain.gain.setValueAtTime(Math.max(0.0001, s * layerLevel), releaseStart);
        envGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + r + 0.0001);
      } else {
        envGain.gain.exponentialRampToValueAtTime(0.0001, layerWhen + playDur + 0.0001);
      }

      // Build processing chain
      let lastNode = envGain;

      // High-pass filter
      const hp = acquireNode('biquadFilter');
      hp.type = 'highpass';
      hp.frequency.value = clamp(this.state.hpFreq ?? 100, 20, nyquist);
      hp.Q.value = resonance;
      lastNode.connect(hp);
      lastNode = hp;

      // Low-pass filter
      const lp = acquireNode('biquadFilter');
      lp.type = 'lowpass';
      lp.frequency.value = clamp(this.state.lpFreq ?? 8000, 200, nyquist);
      lp.Q.value = resonance;
      lastNode.connect(lp);
      lastNode = lp;

      // Optional saturation
      let waveShaper = null;
      if (saturation > 0.0001) {
        waveShaper = acquireNode('waveShaper');
        waveShaper.curve = getSaturationCurve(saturation);
        waveShaper.oversample = '4x';
        lastNode.connect(waveShaper);
        lastNode = waveShaper;
      }

      // Compressor
      const comp = acquireNode('dynamicsCompressor');
      comp.threshold.value = compThreshold;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      lastNode.connect(comp);
      lastNode = comp;

      // Level gain and route to track
      const levelGain = acquireNode('gain');
      levelGain.gain.value = outputLevel * 1.2; // Slight boost for clap presence
      lastNode.connect(levelGain);
      levelGain.connect(this.track.gainNode);

      // Connect noise source to envelope
      noiseSource.connect(envGain);

      // Start playback
      const playDuration = playDur;
      noiseSource.start(layerWhen);
      noiseSource.stop(layerWhen + playDuration + 0.02);

      // Schedule cleanup for this layer
      const cleanupTime = layerWhen + playDuration + 0.1;
      setTimeout(() => {
        // Don't release bufferSource nodes as they can't be reused
        releaseNode('gain', envGain);
        releaseNode('biquadFilter', hp);
        releaseNode('biquadFilter', lp);
        if (waveShaper) releaseNode('waveShaper', waveShaper);
        releaseNode('dynamicsCompressor', comp);
        releaseNode('gain', levelGain);
      }, (cleanupTime - ctx.currentTime) * 1000);
    }
  }

  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    const ctx = offlineCtx;

    const nyquist = ctx.sampleRate * 0.5;
    const layerCount = Math.max(1, Math.min(8, Math.round(this.state.layers || 1)));
    const layerSpread = clamp(this.state.layerSpread ?? 0.005, 0, 0.05);
    const layerLevelMix = clamp(this.state.layerLevel ?? 0.7, 0, 1);
    const outputLevel = clamp(this.state.level ?? 1, 0, 2);
    const resonance = clamp(this.state.resonance ?? 1, 0, 10);
    const saturation = clamp(this.state.saturation ?? 0, 0, 1);
    const compThreshold = clamp(this.state.compThreshold ?? -24, -60, 0);

    // Create multiple layers for fuller clap sound
    for (let layer = 0; layer < layerCount; layer++) {
      const layerDelay = layer * layerSpread;
      const layerWhen = when + layerDelay;
      const layerLevel = layer === 0 ? 1.0 : layerLevelMix;

      // Create noise source
      const noiseBuffer = this.createNoiseBuffer(ctx, 0.2, this.state.noiseType, layer);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Envelope
      const envGain = ctx.createGain();
      const playDur = duration || (this.state.decay + this.state.release + 0.02);
      const a = Math.max(0, this.state.attack);
      const d = Math.max(0, this.state.decay);
      const s = Math.max(0, this.state.sustain);
      const r = Math.max(0, this.state.release);

      envGain.gain.setValueAtTime(0.0001, layerWhen);
      envGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, layerLevel), layerWhen + a + 0.0001);
      envGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, s * layerLevel), layerWhen + a + d + 0.0001);
      const releaseStart = layerWhen + playDur - r;
      if (releaseStart > layerWhen + a + d) {
        envGain.gain.setValueAtTime(Math.max(0.0001, s * layerLevel), releaseStart);
        envGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + r + 0.0001);
      } else {
        envGain.gain.exponentialRampToValueAtTime(0.0001, layerWhen + playDur + 0.0001);
      }

      // Build processing chain
      let lastNode = envGain;

      // High-pass filter
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = clamp(this.state.hpFreq ?? 100, 20, nyquist);
      hp.Q.value = resonance;
      lastNode.connect(hp);
      lastNode = hp;

      // Low-pass filter
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = clamp(this.state.lpFreq ?? 8000, 200, nyquist);
      lp.Q.value = resonance;
      lastNode.connect(lp);
      lastNode = lp;

      // Optional saturation
      if (saturation > 0.0001) {
        const ws = ctx.createWaveShaper();
        ws.curve = getSaturationCurve(saturation);
        ws.oversample = '4x';
        lastNode.connect(ws);
        lastNode = ws;
      }

      // Compressor
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = compThreshold;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      lastNode.connect(comp);
      lastNode = comp;

      // Level gain and route to destination
      const levelGain = ctx.createGain();
      levelGain.gain.value = outputLevel * 1.2; // Slight boost for clap presence
      lastNode.connect(levelGain);
      levelGain.connect(destination);

      // Connect noise source to envelope
      noiseSource.connect(envGain);

      // Start playback
      const playDuration = playDur;
      noiseSource.start(layerWhen);
      noiseSource.stop(layerWhen + playDuration + 0.02);
    }
  }
}