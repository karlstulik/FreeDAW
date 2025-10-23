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
    src.connect(this.track.gainNode);

    src.start(when);
    if (duration) {
      src.stop(when + duration);
    }
  }

  playOffline(offlineCtx, when, duration) {
    if (!this.state.buffer) return;

    const src = offlineCtx.createBufferSource();
    src.buffer = this.state.buffer;
    src.connect(offlineCtx.destination);

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
    osc.frequency.setValueAtTime(this.state.frequency, when);

    osc.connect(this.track.gainNode);

    const playDuration = duration || 0.1;
    osc.start(when);
    osc.stop(when + playDuration);
  }

  playOffline(offlineCtx, when, duration) {
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.state.frequency, when);

    osc.connect(offlineCtx.destination);

    const playDuration = duration || 0.1;
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

    osc.connect(this.track.gainNode);

    const playDuration = duration || this.state.duration;
    osc.start(when);
    osc.stop(when + playDuration);
  }

  playOffline(offlineCtx, when, duration) {
    const osc = offlineCtx.createOscillator();
    osc.type = this.state.waveform;
    osc.frequency.value = this.state.frequency;

    osc.connect(offlineCtx.destination);

    const playDuration = duration || this.state.duration;
    osc.start(when);
    osc.stop(when + playDuration);
  }
}