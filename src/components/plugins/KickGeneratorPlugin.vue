...existing code...
<template>
  <v-container fluid class="pa-0">
    <v-row>
      <!-- Core Sound Section -->
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">Core Sound</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Base Frequency</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob
                      v-model="plugin.state.frequency"
                      label="Hz"
                      :min="20"
                      :max="200"
                      :step="1"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Pitch Offset</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.pitchOffset" label="Semitones" :min="-12" :max="12" :step="1" />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Level</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.level" label="dB" :min="0" :max="2" :step="0.01" />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Click</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.clickLevel" label="dB" :min="0" :max="0.5" :step="0.001" />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Processing Section -->
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)">
          <v-card-title class="text-subtitle-1 pa-2">Processing</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Filter</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.hpFreq" label="High-Pass (Hz)" :min="10" :max="200" :step="1" />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Saturation</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.saturation" label="Amount" :min="0" :max="1" :step="0.01" />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Compressor</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.compThreshold" label="Threshold" :min="-60" :max="0" :step="1" />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <!-- empty -->
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Envelope Section -->
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">ADSR Envelope</v-card-title>
          <v-card-text class="pa-1">
            <!-- ADSR Visualization -->
            <v-row dense class="mb-2">
              <v-col cols="12">
                <AdsrEnvelope
                  :attack="plugin.state.attack"
                  :decay="plugin.state.decay"
                  :sustain="plugin.state.sustain"
                  :release="plugin.state.release"
                  :attack-min="0"
                  :attack-max="0.1"
                  :attack-step="0.001"
                  :decay-min="0"
                  :decay-max="1"
                  :decay-step="0.01"
                  :sustain-min="0"
                  :sustain-max="1"
                  :sustain-step="0.01"
                  :release-min="0"
                  :release-max="1"
                  :release-step="0.01"
                  @update:attack="plugin.state.attack = $event"
                  @update:decay="plugin.state.decay = $event"
                  @update:sustain="plugin.state.sustain = $event"
                  @update:release="plugin.state.release = $event"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import Knob from '../Knob.vue'
import AdsrEnvelope from '../AdsrEnvelope.vue'

defineProps({
  plugin: {
    type: Object,
    required: true
  }
})
</script>