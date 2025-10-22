<template>
  <div style="font-weight:700;margin-bottom:8px">Tracks</div>
  <div id="tracksList" class="tracks">
    <div v-for="track in tracks" :key="track.id" class="track">
      <div class="track-controls">
        <div style="font-weight:700;cursor:pointer" @click="renameTrack(track)">
          {{ track.name }}
        </div>

        <select v-model="track.pluginType" @change="changeTrackPlugin(track, $event.target.value)">
          <option v-for="(plugin, type) in pluginTypes" :key="type" :value="type">
            {{ plugin.name }}
          </option>
        </select>

        <div class="plugin-controls" :ref="el => pluginContainers[track.id] = el"></div>

        <div class="track-buttons">
          <v-btn size="small" @click="track.muted = !track.muted" :style="{ opacity: track.muted ? 0.5 : 1 }">
            Mute
          </v-btn>
          <v-btn size="small" @click="track.solo = !track.solo" :style="{ opacity: track.solo ? 1 : 0.6 }">
            Solo
          </v-btn>
          <v-btn size="small" color="error" @click="deleteTrack(track)">
            Delete
          </v-btn>
          <input type="range" min="0" max="2" step="0.01" v-model.number="track.volume" @input="updateVolume(track)" />
          <input type="range" min="-1" max="1" step="0.01" v-model.number="track.pan" @input="updatePan(track)" />
        </div>
      </div>
      <div style="text-align:right">
        <div class="meter">
          <i></i>
        </div>
      </div>
    </div>
  </div>
  <div class="footer-note">
    Drag & drop audio files onto a track or use the file picker. Supports WAV/MP3/OGG. Each track has a {{ stepsCount }}-step sequencer.
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue'
import { useDaw } from '@/composables/useDaw'

const { tracks, stepsCount, pluginTypes, changeTrackPlugin, deleteTrack, updateVolume, updatePan } = useDaw()

const pluginContainers = ref({})

const renameTrack = (track) => {
  const newName = prompt('Rename track', track.name)
  if (newName) {
    track.name = newName
  }
}

watch(tracks, () => {
  // When tracks change, update plugin controls
  tracks.forEach(track => {
    const container = pluginContainers.value[track.id]
    if (container) {
      container.innerHTML = ''
      track.plugin.createControls(container)
    }
  })
}, { deep: true })

onMounted(() => {
  tracks.forEach(track => {
    const container = pluginContainers.value[track.id]
    if (container) {
      track.plugin.createControls(container)
    }
  })
})
</script>