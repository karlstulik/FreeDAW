<template>
  <div class="brand">HTML5 DAW</div>
  <div class="transport">
    <v-btn id="playBtn" class="primary" @click="togglePlay">
      {{ isPlaying ? 'Playing' : 'Play' }}
    </v-btn>
    <v-btn id="stopBtn" @click="stop">Stop</v-btn>
    <div class="controls-row">
      <label class="small">BPM</label>
      <input id="bpm" type="number" v-model.number="bpm" min="40" max="300" style="width:70px;padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.06)" />
    </div>
    <div class="controls-row tempo">
      <label class="small">Steps</label>
      <select id="stepsCount" v-model.number="stepsCount">
        <option>16</option>
        <option>8</option>
        <option>32</option>
      </select>
    </div>
    <div style="width:12px"></div>
    <div class="controls-row">
      <v-btn id="addTrack" @click="showAddTrackDialog">+ Track</v-btn>
      <v-btn id="exportBtn" @click="exportMixdown">Export Mixdown</v-btn>
    </div>
    <div style="margin-left:12px;color:var(--muted)" id="timeDisplay">{{ timeDisplay }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDaw } from '@/composables/useDaw'

const { isPlaying, bpm, stepsCount, timeDisplay, togglePlay, stop, exportMixdown, showAddTrackDialog } = useDaw()
</script>