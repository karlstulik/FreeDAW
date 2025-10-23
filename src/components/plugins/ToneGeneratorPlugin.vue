...existing code...
<template>
  <v-container fluid class="pa-0">
    <v-row>
      <!-- Main Oscillator Section -->
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
        <v-card-title class="text-subtitle-1 pa-2">Oscillator</v-card-title>
        <v-card-text class="pa-1">
          <v-row dense>
            <v-col cols="12">
              <v-select
                v-model="plugin.state.waveform"
                label="Waveform"
                :items="['sine', 'square', 'sawtooth', 'triangle']"
                density="compact"
                variant="outlined"
                class="mb-1"
              />
            </v-col>
          </v-row>
          <v-row dense>
            <v-col cols="6">
              <Knob
                v-model="plugin.state.frequency"
                label="Frequency"
                :min="20"
                :max="2000"
                :step="1"
              />
            </v-col>
            <v-col cols="6">
              <Knob
                v-model="plugin.state.duration"
                label="Duration"
                :min="0.01"
                :max="2"
                :step="0.01"
              />
            </v-col>
          </v-row>
          <v-row dense>
            <v-col cols="6">
              <Knob v-model="plugin.state.level" label="Level" :min="0" :max="2" :step="0.01" />
            </v-col>
            <v-col cols="6">
              <Knob v-model="plugin.state.detune" label="Detune" :min="-24" :max="24" :step="0.1" />
            </v-col>
          </v-row>
        </v-card-text>
        </v-card>
      </v-col>

      <!-- Modulation Section -->
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">Modulation</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="12">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Vibrato</v-card-title>
                  <v-card-text class="pa-1">
                    <v-row dense>
                      <v-col cols="6">
                        <Knob v-model="plugin.state.vibratoRate" label="Rate (Hz)" :min="0" :max="10" :step="0.01" />
                      </v-col>
                      <v-col cols="6">
                        <Knob v-model="plugin.state.vibratoDepth" label="Depth" :min="0" :max="2" :step="0.01" />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Filters</v-card-title>
                  <v-card-text class="pa-1">
                    <v-row dense>
                      <v-col cols="6">
                        <Knob v-model="plugin.state.hpFreq" label="High-Pass" :min="10" :max="2000" :step="1" />
                      </v-col>
                      <v-col cols="6">
                        <Knob v-model="plugin.state.lpFreq" label="Low-Pass" :min="200" :max="20000" :step="1" />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Envelope Section -->
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">ADSR Envelope</v-card-title>
          <v-card-text class="pa-2">

            <!-- ADSR Visualization -->
            <v-row dense class="mb-2">
              <v-col cols="12">
                <AdsrEnvelope
                  :attack="plugin.state.attack"
                  :decay="plugin.state.decay"
                  :sustain="plugin.state.sustain"
                  :release="plugin.state.release"
                  :attack-min="0"
                  :attack-max="0.5"
                  :attack-step="0.001"
                  :decay-min="0"
                  :decay-max="2"
                  :decay-step="0.01"
                  :sustain-min="0"
                  :sustain-max="1"
                  :sustain-step="0.01"
                  :release-min="0"
                  :release-max="2"
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

      <!-- Effects Section -->
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)">
          <v-card-title class="text-subtitle-1 pa-2">Effects</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6" sm="6" md="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Saturation</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.saturation" label="Amount" :min="0" :max="1" :step="0.01" />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6" sm="6" md="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Compressor</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.compThreshold" label="Threshold" :min="-60" :max="0" :step="1" />
                  </v-card-text>
                </v-card>
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