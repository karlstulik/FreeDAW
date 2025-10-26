<template>
  <v-container fluid class="pa-0">
    <v-card flat color="rgba(255, 255, 255, 0.04)" class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-music-box-multiple</v-icon>
        Step Sequencer
        <v-spacer></v-spacer>
        <v-chip variant="outlined" size="small" color="primary">
          {{ tracks.length }} tracks
        </v-chip>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-row no-gutters>
          <!-- Fixed track names column -->
          <v-col cols="auto" class="d-flex flex-column align-end pe-3">
            <v-sheet
              v-for="track in tracks"
              :key="track.id"
              height="40"
              class="d-flex align-center justify-space-between mb-1"
              color="transparent"
            >
              <v-chip
                variant="outlined"
                size="large"
                :color="track.color || 'primary'"
                class="font-weight-medium"
                style="cursor: pointer;"
                @click="openTrackDialog(track)"
              >
                <v-icon size="small" class="me-1">{{ track.icon || 'mdi-music-note' }}</v-icon>
                {{ track.name }}
              </v-chip>
              <div class="d-flex">
                <v-btn
                  icon="mdi-volume-off"
                  density="compact"
                  @click="track.muted = !track.muted"
                  :color="track.muted ? 'error' : 'grey'"
                  :title="track.muted ? 'Unmute' : 'Mute'"
                  class="ms-2"
                ></v-btn>
                <v-btn
                  icon="mdi-numeric-1-circle"
                  density="compact"
                  @click="track.solo = !track.solo"
                  :color="track.solo ? 'warning' : 'grey'"
                  :title="track.solo ? 'Unsolo' : 'Solo'"
                  class="ms-1"
                ></v-btn>
              </div>
            </v-sheet>
          </v-col>
          <!-- Scrollable steps column -->
          <v-col class="overflow-x-auto">
            <v-sheet color="transparent" class="d-inline-block">
              <div class="d-flex flex-column">
                <div
                  v-for="track in tracks"
                  :key="track.id"
                  class="d-flex align-center gap-2 mb-1"
                >
                  <v-btn
                    v-for="(step, index) in track.steps"
                    :key="index"
                    :variant="step ? 'flat' : 'tonal'"
                    :color="getStepColor(step, index)"
                    :class="{ 'step-playing': currentStep === index, 'mr-1': true }"
                    size="small"
                    min-width="40"
                    height="40"
                    density="comfortable"
                    @click="toggleStep(track, index)"
                    :title="`Step ${index + 1}`"
                  >
                    <div>{{ index + 1}}</div>
                  </v-btn>
                </div>
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card flat color="rgba(255, 255, 255, 0.04)">
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-tune</v-icon>
        Master Controls
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-row dense>
          <v-col cols="6" md="4">
            <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
              <v-card-title class="text-caption pa-1">Master Volume</v-card-title>
              <v-card-text class="pa-1">
                <v-row dense>
                  <v-col cols="12">
                    <Knob
                      v-model="masterVolume"
                      label="Level"
                      :min="0"
                      :max="1"
                      :step="0.01"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="4">
            <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
              <v-card-title class="text-caption pa-1">Transport</v-card-title>
              <v-card-text class="pa-1">
                <v-row dense>
                  <v-col cols="12">
                    <v-switch
                      v-model="metronomeEnabled"
                      label="Metronome"
                      density="compact"
                      color="primary"
                      prepend-icon="mdi-metronome"
                    ></v-switch>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <Analyser />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDaw } from '@/composables/useDaw'
import { useDialogStore } from '@/stores/dialog'
import Track from './Track.vue'
import Knob from './Knob.vue'
import Analyser from './Analyser.vue'
import { tr } from 'vuetify/locale'

const dawStore = useDaw()
const { tracks, masterVolume, metronomeEnabled, currentStep } = storeToRefs(dawStore)
const { toggleStep } = dawStore

const dialogStore = useDialogStore()

const openTrackDialog = (track) => {
  dialogStore.showCustom(Track, { track }, track.name)
}

const getStepColor = (step, index) => {
  // Highlight groups of 4 steps using only two grey shades (alternating every 4)
  const group = Math.floor(index / 4) % 2
  const shades = ['grey-lighten-4', 'grey-darken-1']
  const baseColor = shades[group]

  // Steps that are 'on' use the primary color. Empty steps use alternating greys.
  // The playing step is visually emphasized via the `.step-playing` class rather than changing color.
  return step ? 'primary' : baseColor
}
</script>

<style scoped>
.step-playing {
  transform: scale(1.04);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.75);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
</style>