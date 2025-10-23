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
              height="38"
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
                  class="d-flex align-center gap-1 mb-1"
                >
                  <v-btn
                    v-for="(step, index) in track.steps"
                    :key="index"
                    :variant="step ? 'flat' : 'outlined'"
                    :color="step ? 'primary' : 'grey-darken-2'"
                    size="small"
                    min-width="40"
                    height="40"
                    density="comfortable"
                    @click="toggleStep(track, index)"
                    :title="`Step ${index + 1}`"
                  >
                    <v-icon v-if="step" size="small">mdi-circle</v-icon>
                    <span v-else>{{ index + 1 }}</span>
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
        <v-row>
          <v-col cols="12" md="6">
            <v-slider
              v-model="masterVolume"
              label="Master Volume"
              min="0"
              max="1"
              step="0.01"
              density="compact"
              color="primary"
              track-color="grey-darken-2"
              thumb-color="primary"
              prepend-icon="mdi-volume-high"
            >
              <template v-slot:append>
                <v-text-field
                  v-model="masterVolumeDisplay"
                  density="compact"
                  readonly
                  style="width: 75px;"
                  class="text-center"
                ></v-text-field>
              </template>
            </v-slider>
          </v-col>
          <v-col cols="12" md="6">
            <v-switch
              v-model="metronomeEnabled"
              label="Metronome"
              density="compact"
              color="primary"
              prepend-icon="mdi-metronome"
            >
              <template v-slot:append>
                <v-icon v-if="metronomeEnabled" color="primary">mdi-metronome-tick</v-icon>
                <v-icon v-else color="grey">mdi-metronome</v-icon>
              </template>
            </v-switch>
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

const dawStore = useDaw()
const { tracks, masterVolume, metronomeEnabled } = storeToRefs(dawStore)
const { toggleStep } = dawStore

const dialogStore = useDialogStore()

const masterVolumeDisplay = computed(() => {
  return Math.round(masterVolume.value * 100) + '%'
})

const openTrackDialog = (track) => {
  dialogStore.showCustom(Track, { track }, track.name)
}
</script>