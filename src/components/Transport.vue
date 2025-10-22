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
        <v-select
          v-model="newTrackPluginType"
          :items="Object.entries(pluginTypes).map(([key, plugin]) => ({ title: plugin.name, value: key }))"
          label="Plugin Type"
        ></v-select>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="addTrackDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="createNewTrack">Create</v-btn>
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
const { togglePlay, stop, exportMixdown, createTrack } = dawStore
const pluginTypes = dawStore.pluginTypes

const handlePlay = async () => {
  try {
    await togglePlay();
  } catch (e) {
    console.error('Error starting playback:', e);
  }
}

const addTrackDialog = ref(false)
const newTrackPluginType = ref('file-loader')

const createNewTrack = () => {
  createTrack('Track ' + (tracks.value.length + 1), newTrackPluginType.value)
  addTrackDialog.value = false
}
</script>