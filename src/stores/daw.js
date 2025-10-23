import { defineStore } from 'pinia'
import { ref, reactive, computed, watch } from 'vue'
import { getAudioContext, getMasterGain, updateMasterVolume } from './audio'
import { pluginTypes, createTrack, changeTrackPlugin, deleteTrack, updateVolume, updatePan, toggleStep } from './tracks'
import { schedule, togglePlay, stop } from './playback'
import { exportMixdown } from './export'

export const useDawStore = defineStore('daw', () => {
  // Reactive state
  const isPlaying = ref(false);
  const tracks = reactive([]);
  const bpm = ref(120);
  const stepsCount = ref(16);
  const timeDisplay = ref('0:00');
  const masterVolume = ref(0.9);
  const metronomeEnabled = ref(false);

  // Watch for stepsCount changes to update tracks
  watch(stepsCount, (newVal) => {
    tracks.forEach(track => {
      while (track.steps.length < newVal) track.steps.push(false);
      while (track.steps.length > newVal) track.steps.pop();
    });
  });

  // Watch masterVolume to update master gain
  watch(masterVolume, (newVal) => {
    updateMasterVolume(newVal);
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
    togglePlay: () => togglePlay(isPlaying, bpm, stepsCount, timeDisplay, metronomeEnabled, tracks),
    stop: () => stop(isPlaying, timeDisplay),
    exportMixdown: () => exportMixdown(tracks, bpm, stepsCount),
    changeTrackPlugin,
    deleteTrack: (track) => deleteTrack(tracks, track),
    updateVolume,
    updatePan,
    toggleStep,
    createTrack: (name, pluginType) => createTrack(tracks, stepsCount, name, pluginType),
    getAudioContext,
    getMasterGain
  }
})