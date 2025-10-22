<template>
  <div class="sequencer">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:700">Step Sequencer</div>
      <div style="color:var(--muted)">Click steps to toggle and use play/stop</div>
    </div>
    <div id="sequencerTracks">
      <div v-for="track in tracks" :key="track.id" style="margin-bottom:8px;display:grid;grid-template-columns:160px 1fr;gap:8px">
        <div style="font-weight:600">{{ track.name }}</div>
        <div class="steps">
          <div
            v-for="(step, index) in track.steps"
            :key="index"
            class="step"
            :class="{ active: step }"
            @click="toggleStep(track, index)"
          >
            {{ index + 1 }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="sequencer" style="display:flex;gap:12px;align-items:center">
    <div style="flex:1">
      <label class="small">Master Volume</label>
      <input id="masterVol" type="range" min="0" max="1" step="0.01" v-model.number="masterVolume" />
    </div>
    <div style="flex:1">
      <label class="small">Master Pan (not applied to master — per-track only)</label>
    </div>
    <div style="width:260px">
      <label class="small">Metronome</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="metronomeToggle" type="checkbox" v-model="metronomeEnabled" />
        <span class="small" style="color:var(--muted)">Enable</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDaw } from '@/composables/useDaw'

const { tracks, masterVolume, metronomeEnabled, toggleStep } = useDaw()
</script>