<template>
  <v-row no-gutters align="center" class="flex-wrap">
    <v-col cols="auto" class="mr-2">
      <v-btn variant="flat" @click="handlePlay" :color="isPlaying ? 'warning' : 'success'">
        {{ isPlaying ? 'Pause' : 'Play' }}
      </v-btn>
    </v-col>
    <v-col cols="auto" class="mr-2">
      <v-btn variant="flat" @click="stop" color="error">Stop</v-btn>
    </v-col>
    <v-col cols="auto" class="mr-2">
      <v-text-field
        v-model.number="bpm"
        label="BPM"
        type="number"
        min="40"
        max="300"
        density="compact"
        variant="outlined"
        hide-details
        style="width: 80px"
      ></v-text-field>
    </v-col>
    <v-col cols="auto" class="mr-2">
      <v-select
        v-model.number="stepsCount"
        :items="[8, 16, 32]"
        label="Steps"
        density="compact"
        variant="outlined"
        hide-details
        style="width: 80px"
      ></v-select>
    </v-col>
    <v-col cols="auto" class="mr-2">
      <v-btn @click="addTrackDialog = true" color="secondary" variant="flat">+ Track</v-btn>
    </v-col>
    <v-col cols="auto" class="mr-2">
      <v-btn @click="exportMixdown" color="secondary" variant="flat">Export</v-btn>
    </v-col>
    <v-col cols="auto">
      <v-chip variant="outlined" size="small">{{ timeDisplay }}</v-chip>
    </v-col>
  </v-row>

  <v-dialog v-model="addTrackDialog" max-width="400">
    <v-card>
      <v-card-title>Add New Track</v-card-title>
      <v-card-text>
        <div class="d-flex flex-column gap-3">
          <div
            v-for="(plugin, key) in pluginTypes"
            :key="key"
            class="d-flex align-center gap-2"
          >
            <v-btn
              variant="outlined"
              color="primary"
              @click="selectPluginType(key)"
              class="flex-grow-1 justify-start"
            >
              <v-icon class="me-2">{{ pluginIcons[key] }}</v-icon>
              {{ plugin.name }}
            </v-btn>
            <v-btn
              v-if="key !== 'file-loader'"
              icon="mdi-play"
              size="small"
              variant="flat"
              color="secondary"
              @click="previewPlugin(key)"
              :disabled="isPreviewing"
              title="Preview sound"
            ></v-btn>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="addTrackDialog = false">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDaw } from '@/composables/useDaw'

const dawStore = useDaw()
const { isPlaying, bpm, stepsCount, timeDisplay, tracks } = storeToRefs(dawStore)
const { togglePlay, stop, exportMixdown, createTrack, getAudioContext, getMasterGain } = dawStore
const pluginTypes = dawStore.pluginTypes
const pluginIcons = dawStore.pluginIcons

const handlePlay = async () => {
  try {
    await togglePlay();
  } catch (e) {
    console.error('Error starting playback:', e);
  }
}

const addTrackDialog = ref(false)
const isPreviewing = ref(false)

const selectPluginType = (pluginType) => {
  createTrack(undefined, pluginType)
  addTrackDialog.value = false
}

const previewPlugin = async (pluginType) => {
  if (isPreviewing.value) return

  try {
    isPreviewing.value = true

    // Get audio context
    const audioCtx = getAudioContext()
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }

    // Create a temporary track-like object
    const tempTrack = {
      audioCtx,
      ensureAudioNodes() {
        if (!this.gainNode) {
          this.gainNode = audioCtx.createGain()
          this.gainNode.gain.value = 0.3 // Lower volume for preview
          this.panNode = audioCtx.createStereoPanner()
          this.panNode.pan.value = 0
          this.gainNode.connect(this.panNode)
          this.panNode.connect(getMasterGain())
        }
      }
    }

    // Create plugin instance
    let plugin
    const PluginClass = pluginTypes[pluginType]
    const presets = PluginClass.presets
    const firstPreset = presets ? Object.keys(presets)[0] : null
    plugin = new PluginClass(tempTrack, firstPreset)

    // Play preview
    const now = audioCtx.currentTime + 0.1 // Small delay
    const previewLength = pluginType === 'white-noise-generator' ? 1.5 : 0.5
    plugin.play(now, previewLength)

  } catch (error) {
    console.error('Error playing preview:', error)
  } finally {
    // Re-enable after a short delay
    setTimeout(() => {
      isPreviewing.value = false
    }, 600)
  }
}
</script>