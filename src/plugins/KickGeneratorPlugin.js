import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'

export class KickGeneratorPlugin extends TrackPlugin {
  static name = 'Kick Generator';

  constructor(track) {
    super(track);
    this.state = reactive({
      frequency: 60, // Starting frequency for kick
      pitchOffset: 0, // semitones offset
      level: 1, // gain multiplier for the generated sound
      // ADSR envelope
      attack: 0.001,
      decay: 0.2,
      sustain: 0.0,
      release: 0.05,
      // click/transient for attack
      clickLevel: 0.02,
      // high-pass filter to clean sub rumble
      hpFreq: 20,
      // saturation amount 0-1
      saturation: 0.0,
      // compressor settings (threshold in dB)
      compThreshold: -24
    });
  }

  getName() {
    return KickGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();
    const ctx = this.audioCtx;

    // compute frequency with pitch offset in semitones
    const freq = this.state.frequency * Math.pow(2, this.state.pitchOffset / 12);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + Math.max(0.01, this.state.decay * 0.1));

    // Envelope (ADSR-like)
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

    // build processing chain
    let lastNode = envGain;

    // optional saturation
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
      envGain.connect(ws);
      lastNode = ws;
    }

    // HP filter
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = Math.max(10, this.state.hpFreq || 20);
    lastNode.connect(hp);
    lastNode = hp;

    // compressor
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = this.state.compThreshold || -24;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    lastNode.connect(comp);
    lastNode = comp;

    // plugin level and route to track
    const levelGain = ctx.createGain();
    levelGain.gain.value = this.state.level || 1;
    lastNode.connect(levelGain);
    levelGain.connect(this.track.gainNode);

    // connect oscillator -> envelope
    osc.connect(envGain);

    // click/transient for attack
    if (this.state.clickLevel && this.state.clickLevel > 0.0001) {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(8000, when);
      const clickG = ctx.createGain();
      clickG.gain.setValueAtTime(this.state.clickLevel, when);
      clickG.gain.exponentialRampToValueAtTime(0.0001, when + 0.01);
      clickOsc.connect(clickG);
      // route click through HP (same chain)
      clickG.connect(hp);
      clickOsc.start(when);
      clickOsc.stop(when + 0.02);
    }

    const playDuration = playDur;
    osc.start(when);
    osc.stop(when + playDuration + 0.02);
  }

  playOffline(offlineCtx, when, duration) {
    const ctx = offlineCtx;
    const freq = this.state.frequency * Math.pow(2, this.state.pitchOffset / 12);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + Math.max(0.01, this.state.decay * 0.1));

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
      envGain.connect(ws);
      lastNode = ws;
    }

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = Math.max(10, this.state.hpFreq || 20);
    lastNode.connect(hp);
    lastNode = hp;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = this.state.compThreshold || -24;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    lastNode.connect(comp);
    lastNode = comp;

    const levelGain = ctx.createGain();
    levelGain.gain.value = this.state.level || 1;
    lastNode.connect(levelGain);
    levelGain.connect(ctx.destination);

    osc.connect(envGain);
    if (this.state.clickLevel && this.state.clickLevel > 0.0001) {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(8000, when);
      const clickG = ctx.createGain();
      clickG.gain.setValueAtTime(this.state.clickLevel, when);
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