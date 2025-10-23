// Base plugin class for DAW tracks
import { reactive } from 'vue'

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