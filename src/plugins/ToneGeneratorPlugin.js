import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'

export class ToneGeneratorPlugin extends TrackPlugin {
  static name = 'Tone Generator';

  constructor(track) {
    super(track);
    this.state = reactive({
      frequency: 440, // A4
      waveform: 'sine',
      duration: 0.1, // seconds
      // new controls
      level: 1,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.8,
      release: 0.1,
      detune: 0, // semitones
      vibratoRate: 0, // Hz
      vibratoDepth: 0, // semitones
      hpFreq: 10,
      lpFreq: 20000,
      saturation: 0,
      compThreshold: -24
    });
  }

  getName() {
    return ToneGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();

    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    osc.type = this.state.waveform;

    // frequency + detune
    const baseFreq = this.state.frequency * Math.pow(2, this.state.detune / 12);
    osc.frequency.setValueAtTime(baseFreq, when);

    // envelope
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

    // vibrato LFO (applies small frequency modulation)
    let vibratoOsc = null;
    let vibratoGain = null;
    if (this.state.vibratoRate > 0 && this.state.vibratoDepth > 0) {
      vibratoOsc = ctx.createOscillator();
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.setValueAtTime(this.state.vibratoRate, when);
      vibratoGain = ctx.createGain();
      // convert semitone depth to frequency multiplier modulation in Hz: we use small detune in cents
      // WebAudio detune is in cents on oscillator.detune; but we'll modulate frequency directly using gain in Hz approximation
      const depthHz = baseFreq * (Math.pow(2, this.state.vibratoDepth / 12) - 1);
      vibratoGain.gain.setValueAtTime(depthHz, when);
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibratoOsc.start(when);
      vibratoOsc.stop(when + playDur + 0.1);
    }

    // processing chain: envelope -> saturation -> filters -> compressor -> level -> track
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
      ws.curve = curve;
      ws.oversample = '4x';
      env.connect(ws);
      last = ws;
    }

    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = Math.max(10, this.state.hpFreq || 10);
    last.connect(hp);
    last = hp;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(200, this.state.lpFreq || 20000);
    last.connect(lp);
    last = lp;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = this.state.compThreshold || -24; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25;
    last.connect(comp);
    last = comp;

    const levelGain = ctx.createGain(); levelGain.gain.value = this.state.level || 1;
    last.connect(levelGain);
    levelGain.connect(this.track.gainNode);

    osc.connect(env);

    const playDuration = playDur;
    osc.start(when);
    osc.stop(when + playDuration + 0.05);
  }

  playOffline(offlineCtx, when, duration) {
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

    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = Math.max(10, this.state.hpFreq || 10); last.connect(hp); last = hp;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(200, this.state.lpFreq || 20000); last.connect(lp); last = lp;

    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = this.state.compThreshold || -24; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25; last.connect(comp); last = comp;

    const levelGain = ctx.createGain(); levelGain.gain.value = this.state.level || 1; last.connect(levelGain); levelGain.connect(ctx.destination);

    osc.connect(env);
    const playDuration = playDur;
    osc.start(when);
    osc.stop(when + playDuration + 0.05);
  }
}