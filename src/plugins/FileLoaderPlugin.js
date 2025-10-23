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

    // Create envelope gain for fade in/out with auto-leveling
    const envelopeGain = acquireNode('gain');
    const fadeTime = 0.003; // 3ms fade - fast but click-free
    
    // Auto-normalize: analyze buffer RMS and apply makeup gain
    const targetRMS = 0.3; // Target RMS level
    let bufferRMS = 0;
    const channelData = this.state.buffer.getChannelData(0);
    let sumSquares = 0;
    const sampleCount = Math.min(channelData.length, 44100); // Analyze first second
    for (let i = 0; i < sampleCount; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    bufferRMS = Math.sqrt(sumSquares / sampleCount);
    const makeupGain = bufferRMS > 0.01 ? Math.min(2.5, targetRMS / bufferRMS) : 1;
    
    envelopeGain.gain.setValueAtTime(0, when);
    envelopeGain.gain.linearRampToValueAtTime(makeupGain, when + fadeTime);

    const playDuration = duration || this.state.buffer.duration;
    const fadeOutStart = Math.max(when + fadeTime, when + playDuration - fadeTime);
    envelopeGain.gain.setValueAtTime(makeupGain, fadeOutStart);
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

  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    if (!this.state.buffer) return;

    const src = offlineCtx.createBufferSource();
    src.buffer = this.state.buffer;

    const envelopeGain = offlineCtx.createGain();
    const fadeTime = 0.003;
    
    // Auto-normalize for offline rendering
    const targetRMS = 0.3;
    let bufferRMS = 0;
    const channelData = this.state.buffer.getChannelData(0);
    let sumSquares = 0;
    const sampleCount = Math.min(channelData.length, 44100);
    for (let i = 0; i < sampleCount; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    bufferRMS = Math.sqrt(sumSquares / sampleCount);
    const makeupGain = bufferRMS > 0.01 ? Math.min(2.5, targetRMS / bufferRMS) : 1;
    
    envelopeGain.gain.setValueAtTime(0, when);
    envelopeGain.gain.linearRampToValueAtTime(makeupGain, when + fadeTime);

    const playDuration = duration || this.state.buffer.duration;
    const fadeOutStart = Math.max(when + fadeTime, when + playDuration - fadeTime);
    envelopeGain.gain.setValueAtTime(makeupGain, fadeOutStart);
    envelopeGain.gain.linearRampToValueAtTime(0, when + playDuration);

  src.connect(envelopeGain);
  envelopeGain.connect(destination);

    src.start(when);
    if (duration) {
      src.stop(when + duration);
    }
  }
}