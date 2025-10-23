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
                  <v-card-title class="text-caption pa-1">Level</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob
                      v-model="plugin.state.level"
                      label="dB"
                      :min="0"
                      :max="2"
                      :step="0.01"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Noise Type</v-card-title>
                  <v-card-text class="pa-1">
                    <v-select
                      v-model="plugin.state.noiseType"
                      :items="['white', 'pink', 'brown']"
                      density="compact"
                      variant="outlined"
                      class="mt-1"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Layers</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob
                      v-model="plugin.state.layers"
                      label="Count"
                      :min="1"
                      :max="5"
                      :step="1"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Layer Level</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob
                      v-model="plugin.state.layerLevel"
                      label="dB"
                      :min="0.01"
                      :max="1"
                      :step="0.01"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="12">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Layer Spread</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob
                      v-model="plugin.state.layerSpread"
                      label="Seconds"
                      :min="0"
                      :max="0.02"
                      :step="0.001"
                    />
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
                  <v-card-title class="text-caption pa-1">High-Pass</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.hpFreq" label="Hz" :min="20" :max="1000" :step="10" />
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Low-Pass</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.lpFreq" label="Hz" :min="1000" :max="16000" :step="100" />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="6">
                <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                  <v-card-title class="text-caption pa-1">Resonance</v-card-title>
                  <v-card-text class="pa-1">
                    <Knob v-model="plugin.state.resonance" label="Q" :min="0.1" :max="10" :step="0.1" />
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
                  :attack-max="0.01"
                  :attack-step="0.0001"
                  :decay-min="0"
                  :decay-max="0.2"
                  :decay-step="0.001"
                  :sustain-min="0"
                  :sustain-max="0.5"
                  :sustain-step="0.01"
                  :release-min="0"
                  :release-max="0.2"
                  :release-step="0.001"
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