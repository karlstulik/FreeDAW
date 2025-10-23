import { reactive } from 'vue'
import { useDialogStore } from '@/stores/dialog'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'

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

    const src = acquireNode('bufferSource');
    src.buffer = this.state.buffer;

    // Create envelope gain for fade in/out
    const envelopeGain = acquireNode('gain');
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

    // Schedule cleanup after sound ends
    const cleanupTime = when + playDuration + 0.01;
    setTimeout(() => {
      // Don't release bufferSource as it can't be reused
      releaseNode('gain', envelopeGain);
    }, (cleanupTime - this.audioCtx.currentTime) * 1000);
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