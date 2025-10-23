import { reactive } from 'vue'
import { TrackPlugin, FileLoaderPlugin, ToneGeneratorPlugin, KickGeneratorPlugin, BassGeneratorPlugin } from '@/plugins/dawPlugins'
import { makeId } from './utils'
import { getAudioContext, getMasterGain, acquireNode, releaseNode } from './audio'

export const pluginTypes = {
  'file-loader': FileLoaderPlugin,
  'tone-generator': ToneGeneratorPlugin,
  'kick-generator': KickGeneratorPlugin,
  'bass-generator': BassGeneratorPlugin
};

export function createTrack(tracks, stepsCount, name, pluginType = 'file-loader') {
  const id = makeId();

  const track = reactive({
    id,
    name: '', // Will be set after
    plugin: null, // Will be set after creation
    pluginType,
    steps: [],
    gainNode: null, // Lazy initialization
    panNode: null, // Lazy initialization
    muted: false,
    solo: false,
    volume: 1,
    pan: 0,
    level: 0, // For meter display
    get audioCtx() { return getAudioContext(); },
    ensureAudioNodes() {
      if (!this.gainNode) {
        const ctx = this.audioCtx;
        this.gainNode = acquireNode('gain');
        this.gainNode.gain.value = this.volume;
        this.panNode = acquireNode('stereoPanner');
        this.panNode.pan.value = this.pan;
        this.gainNode.connect(this.panNode);
        this.panNode.connect(getMasterGain());
      }
    }
  });

  const PluginClass = pluginTypes[pluginType];
  track.plugin = new PluginClass(track);
  track.name = name || (PluginClass.name + ' ' + (tracks.filter(t => t.pluginType === pluginType).length + 1));

  const stepsCountVal = parseInt(stepsCount.value, 10) || 16;
  for (let i = 0; i < stepsCountVal; i++) track.steps.push(false);
  tracks.push(track);
  return track;
}

export function changeTrackPlugin(track, newPluginType) {
  if (track.pluginType === newPluginType) return;

  // Destroy old plugin
  if (track.plugin.destroy) {
    track.plugin.destroy();
  }

  // Create new plugin
  const PluginClass = pluginTypes[newPluginType];
  track.plugin = new PluginClass(track);
  track.pluginType = newPluginType;
}

export async function deleteTrack(tracks, track) {
  // Destroy plugin
  if (track.plugin && track.plugin.destroy) {
    track.plugin.destroy();
  }

  // Release audio nodes back to pool
  if (track.gainNode) {
    releaseNode('gain', track.gainNode);
    track.gainNode = null;
  }
  if (track.panNode) {
    releaseNode('stereoPanner', track.panNode);
    track.panNode = null;
  }

  // Remove from tracks array
  const index = tracks.indexOf(track);
  if (index > -1) {
    tracks.splice(index, 1);
  }
}

export function updateVolume(track) {
  track.ensureAudioNodes();
  const ctx = track.audioCtx;
  const now = ctx.currentTime;
  const param = track.gainNode.gain;
  const current = param.value;
  const target = typeof track.volume === 'number' ? track.volume : current;
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.linearRampToValueAtTime(target, now + 0.01);
}

export function updatePan(track) {
  track.ensureAudioNodes();
  const ctx = track.audioCtx;
  const now = ctx.currentTime;
  const param = track.panNode.pan;
  const current = param.value;
  const target = typeof track.pan === 'number' ? track.pan : current;
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.linearRampToValueAtTime(target, now + 0.01);
}

export function toggleStep(track, index) {
  track.steps[index] = !track.steps[index];
}