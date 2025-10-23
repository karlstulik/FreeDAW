import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'

export class BassGeneratorPlugin extends TrackPlugin {
  static name = 'Bass Generator';

  constructor(track) {
    super(track);
    this.state = reactive({
      frequency: 80, // Bass frequency
      waveform: 'sine',
      duration: 0.3, // Longer default for bass
      // new controls
      level: 1,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.7,
      release: 0.3,
      detune: 0, // semitones
      subOsc: false, // Enable sub-oscillator
      subLevel: 0.5, // Sub-oscillator level
      vibratoRate: 0, // Hz
      vibratoDepth: 0, // semitones
      hpFreq: 20,
      lpFreq: 8000,
      resonance: 0, // Filter resonance
      saturation: 0,
      compThreshold: -18
    });
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
      subEnv.gain.linearRampToValueAtTime(this.state.subLevel, when + a);
      subEnv.gain.linearRampToValueAtTime(this.state.subLevel * s, when + a + d);
      if (relStart > when + a + d) {
        subEnv.gain.setValueAtTime(this.state.subLevel * s, relStart);
        subEnv.gain.linearRampToValueAtTime(0.0001, relStart + r);
      } else {
        subEnv.gain.linearRampToValueAtTime(0.0001, when + playDur);
      }
    }

    // vibrato LFO (applies small frequency modulation)
    let vibratoOsc = null;
    let vibratoGain = null;
    if (this.state.vibratoRate > 0 && this.state.vibratoDepth > 0) {
      vibratoOsc = acquireNode('oscillator');
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.setValueAtTime(this.state.vibratoRate, when);
      vibratoGain = acquireNode('gain');
      const depthHz = baseFreq * (Math.pow(2, this.state.vibratoDepth / 12) - 1);
      vibratoGain.gain.setValueAtTime(depthHz, when);
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      if (subOsc) vibratoGain.connect(subOsc.frequency);
      vibratoOsc.start(when);
      vibratoOsc.stop(when + playDur + 0.1);
    }

    // processing chain: envelope -> saturation -> filters -> compressor -> level -> track
    let last = env;

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
      env.connect(waveShaper);
      last = waveShaper;
    }

    const hp = acquireNode('biquadFilter');
    hp.type = 'highpass';
    hp.frequency.value = Math.max(10, this.state.hpFreq || 20);
    hp.Q.value = this.state.resonance || 0;
    last.connect(hp);
    last = hp;

    const lp = acquireNode('biquadFilter');
    lp.type = 'lowpass';
    lp.frequency.value = Math.max(200, this.state.lpFreq || 8000);
    lp.Q.value = this.state.resonance || 0;
    last.connect(lp);
    last = lp;

    const comp = acquireNode('dynamicsCompressor');
    comp.threshold.value = this.state.compThreshold || -18;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    last.connect(comp);
    last = comp;

    const levelGain = acquireNode('gain');
    levelGain.gain.value = this.state.level || 1;
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

  playOffline(offlineCtx, when, duration) {
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
      subEnv.gain.linearRampToValueAtTime(this.state.subLevel, when + a);
      subEnv.gain.linearRampToValueAtTime(this.state.subLevel * s, when + a + d);
      if (relStart > when + a + d) {
        subEnv.gain.setValueAtTime(this.state.subLevel * s, relStart);
        subEnv.gain.linearRampToValueAtTime(0.0001, relStart + r);
      } else {
        subEnv.gain.linearRampToValueAtTime(0.0001, when + playDur);
      }
    }

    let last = env;
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
      ws.curve = curve; ws.oversample = '4x'; env.connect(ws); last = ws;
    }

    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = Math.max(10, this.state.hpFreq || 20); hp.Q.value = this.state.resonance || 0; last.connect(hp); last = hp;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(200, this.state.lpFreq || 8000); lp.Q.value = this.state.resonance || 0; last.connect(lp); last = lp;

    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = this.state.compThreshold || -18; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25; last.connect(comp); last = comp;

    const levelGain = ctx.createGain(); levelGain.gain.value = this.state.level || 1; last.connect(levelGain); levelGain.connect(ctx.destination);

    osc.connect(env);
    if (subOsc && subEnv) {
      subOsc.connect(subEnv);
      subEnv.connect(last === env ? env : last);
    }

    const playDuration = playDur;
    osc.start(when);
    osc.stop(when + playDuration + 0.05);
    if (subOsc) {
      subOsc.start(when);
      subOsc.stop(when + playDuration + 0.05);
    }
  }
}