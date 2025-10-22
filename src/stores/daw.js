import { defineStore } from 'pinia'
import { ref, reactive, computed, watch } from 'vue'
import { TrackPlugin, FileLoaderPlugin, ToneGeneratorPlugin, KickGeneratorPlugin } from '@/plugins/dawPlugins'

let audioCtx = null;

export const useDawStore = defineStore('daw', () => {
  // Reactive state
  const isPlaying = ref(false);
  let startTime = 0; // when transport started
  let schedulerInterval = null;
  const lookahead = 0.1; // seconds
  const scheduleAhead = 0.2; // seconds
  const tracks = reactive([]);
  const bpm = ref(120);
  const stepsCount = ref(16);
  const timeDisplay = ref('0:00');
  const masterVolume = ref(0.9);
  const metronomeEnabled = ref(false);

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    return audioCtx;
  }

  const pluginTypes = {
    'file-loader': FileLoaderPlugin,
    'tone-generator': ToneGeneratorPlugin,
    'kick-generator': KickGeneratorPlugin
  };

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function makeId() { return Math.random().toString(36).slice(2, 9) }

  function createTrack(name, pluginType = 'file-loader') {
    const id = makeId();

    const track = reactive({
      id,
      name: name || ('Track ' + (tracks.length + 1)),
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
          this.gainNode = ctx.createGain();
          this.gainNode.gain.value = this.volume;
          this.panNode = ctx.createStereoPanner();
          this.panNode.pan.value = this.pan;
          this.gainNode.connect(this.panNode);
          this.panNode.connect(ctx.destination);
        }
      }
    });

    const PluginClass = pluginTypes[pluginType];
    track.plugin = new PluginClass(track);

    const stepsCountVal = parseInt(stepsCount.value, 10) || 16;
    for (let i = 0; i < stepsCountVal; i++) track.steps.push(false);
    tracks.push(track);
    return track;
  }

  function changeTrackPlugin(track, newPluginType) {
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

  function deleteTrack(track) {
    if (confirm('Delete track "' + track.name + '"?')) {
      // Destroy plugin
      if (track.plugin && track.plugin.destroy) {
        track.plugin.destroy();
      }
      // Remove from tracks array
      const index = tracks.indexOf(track);
      if (index > -1) {
        tracks.splice(index, 1);
      }
    }
  }

  function updateVolume(track) {
    track.ensureAudioNodes();
    track.gainNode.gain.value = track.volume;
  }

  function updatePan(track) {
    track.ensureAudioNodes();
    track.panNode.pan.value = track.pan;
  }

  function toggleStep(track, index) {
    track.steps[index] = !track.steps[index];
  }

  function nextStepTime(stepIndex, whenStarted) {
    const bpm = parseFloat(bpm.value) || 120;
    const quarterNoteSec = 60.0 / bpm;
    const stepsCount = parseInt(stepsCount.value, 10) || 16;
    // assume we divide bar into stepsCount per bar
    const stepDuration = (quarterNoteSec * 4) / stepsCount; // seconds per step
    return whenStarted + stepIndex * stepDuration;
  }

  function schedule() {
    if (!isPlaying.value) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const bpmVal = parseFloat(bpm.value) || 120;
    const quarterNoteSec = 60.0 / bpmVal;
    const stepsCountVal = parseInt(stepsCount.value, 10) || 16;
    const stepDuration = (quarterNoteSec * 4) / stepsCountVal;
    // determine current transport time
    const elapsed = now - startTime;
    let position = Math.floor((elapsed / stepDuration)) % stepsCountVal;
    // schedule ahead
    const lookaheadUntil = now + scheduleAhead;
    // we'll iterate steps forward and schedule any that fall before lookaheadUntil
    // compute the absolute start time of the next step
    let stepIndex = Math.floor(elapsed / stepDuration);
    let stepTime = startTime + stepIndex * stepDuration;
    while (stepTime < lookaheadUntil) {
      const s = stepIndex % stepsCountVal;
      // schedule step s at stepTime
      // play samples for tracks that have step true
      tracks.forEach(tr => {
        const soloActive = tracks.some(tt => tt.solo);
        const muted = tr.muted || (soloActive && !tr.solo);
        if (tr.steps[s] && !muted) {
          tr.plugin.play(stepTime);
        }
      });
      // metronome click
      if (metronomeEnabled.value) {
        const isDownbeat = (s === 0);
        const o = ctx.createOscillator(); o.type = 'square';
        const g = ctx.createGain(); g.gain.value = isDownbeat ? 0.08 : 0.04;
        o.connect(g); g.connect(ctx.destination);
        o.start(stepTime); o.stop(stepTime + 0.06);
      }
      stepIndex++;
      stepTime = startTime + stepIndex * stepDuration;
    }
    // update UI time display
    const totalSec = now - startTime;
    timeDisplay.value = formatTime(totalSec);
  }

  async function togglePlay() {
    const ctx = getAudioContext();
    if (!isPlaying.value) {
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (e) {
          console.error('Cannot resume audio context. Please interact with the page first.', e);
          return;
        }
      }
      isPlaying.value = true;
      startTime = ctx.currentTime + 0.05; // small offset
      schedulerInterval = setInterval(() => {
        try {
          schedule();
        } catch (e) {
          console.error('Error in scheduler:', e);
        }
      }, 50);
    } else {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      isPlaying.value = false;
    }
  }

  function stop() {
    if (isPlaying.value) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      isPlaying.value = false;
      timeDisplay.value = '0:00';
    }
  }

  async function exportMixdown() {
    if (tracks.length === 0) return alert('No tracks to export');
    const bpmVal = parseFloat(bpm.value) || 120;
    const stepsCountVal = parseInt(stepsCount.value, 10) || 16;
    const quarterNoteSec = 60.0 / bpmVal;
    const stepDuration = (quarterNoteSec * 4) / stepsCountVal;
    // estimate length: 4 bars
    const bars = 4;
    const lengthSec = bars * 4 * quarterNoteSec;
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(lengthSec * sampleRate), sampleRate);
    // create destination and render graph
    // create per-track nodes
    tracks.forEach(tr => {
      // schedule for each step
      for (let i = 0; i < stepsCountVal; i++) {
        if (tr.steps[i]) {
          tr.plugin.playOffline(offline, i * stepDuration);
        }
      }
    });
    // render
    const rendered = await offline.startRendering();
    // convert to WAV
    const wav = bufferToWav(rendered);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mixdown.wav';
    a.click();
    URL.revokeObjectURL(url);
  }

  // tiny WAV converter
  function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const buf = new ArrayBuffer(length);
    const view = new DataView(buf);
    function writeString(view, offset, string) { for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); } }
    let offset = 0;
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numOfChan, true); offset += 2;
    view.setUint32(offset, buffer.sampleRate, true); offset += 4;
    view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true); offset += 4;
    view.setUint16(offset, numOfChan * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;
    // write interleaved
    const channels = [];
    for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
    let pos = 0;
    while (pos < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][pos]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
      pos++;
    }
    return view;
  }

  // Watch for stepsCount changes to update tracks
  watch(stepsCount, (newVal) => {
    tracks.forEach(track => {
      while (track.steps.length < newVal) track.steps.push(false);
      while (track.steps.length > newVal) track.steps.pop();
    });
  });

  return {
    isPlaying,
    bpm,
    stepsCount,
    timeDisplay,
    masterVolume,
    metronomeEnabled,
    tracks,
    pluginTypes,
    togglePlay,
    stop,
    exportMixdown,
    changeTrackPlugin,
    deleteTrack,
    updateVolume,
    updatePan,
    toggleStep,
    createTrack
  }
})