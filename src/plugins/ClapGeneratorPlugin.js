import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'

export class ClapGeneratorPlugin extends TrackPlugin {
  static name = 'Clap Generator';

  constructor(track) {
    super(track);
    this.state = reactive({
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
    });
  }

  getName() {
    return ClapGeneratorPlugin.name;
  }

  // Generate noise buffer
  createNoiseBuffer(ctx, duration, type = 'white') {
    const sampleRate = ctx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
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
        data[i] *= 0.11; // normalize
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // normalize
      }
    }

    return buffer;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();
    const ctx = this.audioCtx;

    // Create multiple layers for fuller clap sound
    for (let layer = 0; layer < this.state.layers; layer++) {
      const layerDelay = layer * this.state.layerSpread;
      const layerWhen = when + layerDelay;
      const layerLevel = layer === 0 ? 1.0 : this.state.layerLevel;

      // Create noise source
      const noiseBuffer = this.createNoiseBuffer(ctx, 0.2, this.state.noiseType);
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
      hp.frequency.value = Math.max(20, this.state.hpFreq || 100);
      hp.Q.value = this.state.resonance || 1;
      lastNode.connect(hp);
      lastNode = hp;

      // Low-pass filter
      const lp = acquireNode('biquadFilter');
      lp.type = 'lowpass';
      lp.frequency.value = Math.max(200, this.state.lpFreq || 8000);
      lp.Q.value = this.state.resonance || 1;
      lastNode.connect(lp);
      lastNode = lp;

      // Optional saturation
      let waveShaper = null;
      if (this.state.saturation && this.state.saturation > 0.001) {
        waveShaper = acquireNode('waveShaper');
        const amount = Math.min(1, this.state.saturation);
        const samples = 1024;
        const curve = new Float32Array(samples);
        const k = amount * 50;
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        }
        waveShaper.curve = curve;
        waveShaper.oversample = '4x';
        lastNode.connect(waveShaper);
        lastNode = waveShaper;
      }

      // Compressor
      const comp = acquireNode('dynamicsCompressor');
      comp.threshold.value = this.state.compThreshold || -24;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      lastNode.connect(comp);
      lastNode = comp;

      // Level gain and route to track
      const levelGain = acquireNode('gain');
      levelGain.gain.value = (this.state.level || 1) * 1.2; // Slight boost for clap presence
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

    // Create multiple layers for fuller clap sound
    for (let layer = 0; layer < this.state.layers; layer++) {
      const layerDelay = layer * this.state.layerSpread;
      const layerWhen = when + layerDelay;
      const layerLevel = layer === 0 ? 1.0 : this.state.layerLevel;

      // Create noise source
      const noiseBuffer = this.createNoiseBuffer(ctx, 0.2, this.state.noiseType);
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
      hp.frequency.value = Math.max(20, this.state.hpFreq || 100);
      hp.Q.value = this.state.resonance || 1;
      lastNode.connect(hp);
      lastNode = hp;

      // Low-pass filter
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.max(200, this.state.lpFreq || 8000);
      lp.Q.value = this.state.resonance || 1;
      lastNode.connect(lp);
      lastNode = lp;

      // Optional saturation
      if (this.state.saturation && this.state.saturation > 0.001) {
        const ws = ctx.createWaveShaper();
        const amount = Math.min(1, this.state.saturation);
        const samples = 1024;
        const curve = new Float32Array(samples);
        const k = amount * 50;
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        }
        ws.curve = curve;
        ws.oversample = '4x';
        lastNode.connect(ws);
        lastNode = ws;
      }

      // Compressor
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = this.state.compThreshold || -24;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      lastNode.connect(comp);
      lastNode = comp;

      // Level gain and route to destination
      const levelGain = ctx.createGain();
      levelGain.gain.value = (this.state.level || 1) * 1.2; // Slight boost for clap presence
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