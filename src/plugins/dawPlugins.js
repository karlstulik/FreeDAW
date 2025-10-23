// Base plugin class for DAW tracks
import { reactive } from 'vue'
import { useDialogStore } from '@/stores/dialog'

export class TrackPlugin {
  constructor(track) {
    this.track = track;
    this.audioCtx = track.audioCtx;
  }

  // Play the sound at the given time
  play(when, duration) {
    // Override in subclasses
  }

  // Play in offline context for export
  playOffline(offlineCtx, when, duration) {
    // Override in subclasses - default to regular play
    return this.play(when, duration);
  }

  // Get display name
  getName() {
    return 'Base Plugin';
  }

  // Cleanup resources
  destroy() {
    // Override if needed
  }
}

export class FileLoaderPlugin extends TrackPlugin {
  static name = 'File Loader';

  constructor(track) {
    super(track);
    this.state = reactive({
      buffer: null
    });
  }

  getName() {
    return FileLoaderPlugin.name;
  }

  async loadFile(file) {
    try {
      const arr = await file.arrayBuffer();
      this.state.buffer = await this.audioCtx.decodeAudioData(arr.slice(0));
      const dialog = useDialogStore()
      await dialog.showAlert(`${this.track.name} — Sample loaded (${Math.round(this.state.buffer.duration * 1000) / 1000}s)`, 'Sample Loaded')
    } catch (error) {
      const dialog = useDialogStore()
      await dialog.showAlert('Error loading file: ' + error.message, 'Load Error')
    }
  }

  play(when, duration) {
    if (!this.state.buffer) return;

    this.track.ensureAudioNodes();

    const src = this.audioCtx.createBufferSource();
    src.buffer = this.state.buffer;

    // Create envelope gain for fade in/out
    const envelopeGain = this.audioCtx.createGain();
    const fadeTime = 0.005; // 5ms fade
    envelopeGain.gain.setValueAtTime(0, when);
    envelopeGain.gain.linearRampToValueAtTime(1, when + fadeTime);

    const playDuration = duration || this.state.buffer.duration;
    envelopeGain.gain.setValueAtTime(1, when + playDuration - fadeTime);
    envelopeGain.gain.linearRampToValueAtTime(0, when + playDuration);

    src.connect(envelopeGain);
    envelopeGain.connect(this.track.gainNode);

    src.start(when);
    if (duration) {
      src.stop(when + duration);
    }
  }

  playOffline(offlineCtx, when, duration) {
    if (!this.state.buffer) return;

    const src = offlineCtx.createBufferSource();
    src.buffer = this.state.buffer;

    const envelopeGain = offlineCtx.createGain();
    const fadeTime = 0.005;
    envelopeGain.gain.setValueAtTime(0, when);
    envelopeGain.gain.linearRampToValueAtTime(1, when + fadeTime);

    const playDuration = duration || this.state.buffer.duration;
    envelopeGain.gain.setValueAtTime(1, when + playDuration - fadeTime);
    envelopeGain.gain.linearRampToValueAtTime(0, when + playDuration);

    src.connect(envelopeGain);
    envelopeGain.connect(offlineCtx.destination);

    src.start(when);
    if (duration) {
      src.stop(when + duration);
    }
  }
}

export class KickGeneratorPlugin extends TrackPlugin {
  static name = 'Kick Generator';

  constructor(track) {
    super(track);
    this.state = reactive({
      frequency: 60 // Starting frequency for kick
    });
  }

  getName() {
    return KickGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();

    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.state.frequency * 2, when); // Start higher
    osc.frequency.exponentialRampToValueAtTime(this.state.frequency, when + 0.05); // Sweep down

    // Create envelope gain for decay
    const envelopeGain = this.audioCtx.createGain();
    envelopeGain.gain.setValueAtTime(1, when);
    envelopeGain.gain.exponentialRampToValueAtTime(0.01, when + (duration || 0.2)); // Decay

    osc.connect(envelopeGain);
    envelopeGain.connect(this.track.gainNode);

    const playDuration = duration || 0.2;
    osc.start(when);
    osc.stop(when + playDuration);
  }

  playOffline(offlineCtx, when, duration) {
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.state.frequency * 2, when);
    osc.frequency.exponentialRampToValueAtTime(this.state.frequency, when + 0.05);

    const envelopeGain = offlineCtx.createGain();
    envelopeGain.gain.setValueAtTime(1, when);
    envelopeGain.gain.exponentialRampToValueAtTime(0.01, when + (duration || 0.2));

    osc.connect(envelopeGain);
    envelopeGain.connect(offlineCtx.destination);

    const playDuration = duration || 0.2;
    osc.start(when);
    osc.stop(when + playDuration);
  }
}

export class ToneGeneratorPlugin extends TrackPlugin {
  static name = 'Tone Generator';

  constructor(track) {
    super(track);
    this.state = reactive({
      frequency: 440, // A4
      waveform: 'sine',
      duration: 0.1 // seconds
    });
  }

  getName() {
    return ToneGeneratorPlugin.name;
  }

  play(when, duration) {
    this.track.ensureAudioNodes();

    const osc = this.audioCtx.createOscillator();
    osc.type = this.state.waveform;
    osc.frequency.value = this.state.frequency;

    // Create envelope gain to prevent clicks
    const envelopeGain = this.audioCtx.createGain();
    envelopeGain.gain.setValueAtTime(0, when);
    envelopeGain.gain.linearRampToValueAtTime(1, when + 0.01); // 10ms attack
    envelopeGain.gain.setValueAtTime(1, when + (duration || this.state.duration) - 0.01);
    envelopeGain.gain.linearRampToValueAtTime(0, when + (duration || this.state.duration)); // 10ms release

    osc.connect(envelopeGain);
    envelopeGain.connect(this.track.gainNode);

    const playDuration = duration || this.state.duration;
    osc.start(when);
    osc.stop(when + playDuration);
  }

  playOffline(offlineCtx, when, duration) {
    const osc = offlineCtx.createOscillator();
    osc.type = this.state.waveform;
    osc.frequency.value = this.state.frequency;

    // Create envelope gain
    const envelopeGain = offlineCtx.createGain();
    envelopeGain.gain.setValueAtTime(0, when);
    envelopeGain.gain.linearRampToValueAtTime(1, when + 0.01);
    envelopeGain.gain.setValueAtTime(1, when + (duration || this.state.duration) - 0.01);
    envelopeGain.gain.linearRampToValueAtTime(0, when + (duration || this.state.duration));

    osc.connect(envelopeGain);
    envelopeGain.connect(offlineCtx.destination);

    const playDuration = duration || this.state.duration;
    osc.start(when);
    osc.stop(when + playDuration);
  }
}