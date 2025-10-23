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
  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    // Override in subclasses - default implementation falls back to live renderer
    return this.play(when, duration, destination);
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