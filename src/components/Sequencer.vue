<template>
  <v-card flat color="rgba(255, 255, 255, 0.04)">
    <v-card-title>Step Sequencer</v-card-title>
    <v-card-subtitle>Click steps to toggle and use play/stop</v-card-subtitle>
    <v-card-text>
      <div v-for="track in tracks" :key="track.id" class="mb-4">
        <v-row no-gutters align="center">
          <v-col cols="12" md="2">
            <v-chip variant="outlined" size="small">{{ track.name }}</v-chip>
          </v-col>
          <v-col cols="12" md="10">
            <v-row no-gutters class="flex-wrap">
              <v-col
                v-for="(step, index) in track.steps"
                :key="index"
                cols="auto"
                class="pa-1"
              >
                <v-btn
                  :variant="step ? 'flat' : 'outlined'"
                  :color="step ? 'primary' : 'secondary'"
                  size="small"
                  min-width="40"
                  height="40"
                  @click="toggleStep(track, index)"
                >
                  {{ index + 1 }}
                </v-btn>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>

  <v-card flat color="rgba(255, 255, 255, 0.04)" class="mt-4">
    <v-card-text>
      <v-row>
        <v-col cols="12" md="4">
          <v-slider
            v-model="masterVolume"
            label="Master Volume"
            min="0"
            max="1"
            step="0.01"
            density="compact"
          ></v-slider>
        </v-col>
        <v-col cols="12" md="4">
          <v-alert type="info" variant="tonal" density="compact">
            Master Pan (not applied to master — per-track only)
          </v-alert>
        </v-col>
        <v-col cols="12" md="4">
          <v-switch
            v-model="metronomeEnabled"
            label="Metronome"
            density="compact"
          ></v-switch>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useDaw } from '@/composables/useDaw'

const dawStore = useDaw()
const { tracks, masterVolume, metronomeEnabled } = storeToRefs(dawStore)
const { toggleStep } = dawStore
</script>