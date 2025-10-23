...existing code...
<template>
  <v-container fluid class="pa-0">
    <!-- Preset Selector -->
    <v-row dense class="mb-3">
      <v-col cols="12">
        <v-card flat color="rgba(255, 255, 255, 0.02)">
          <v-card-text class="pa-2">
            <v-select
              ref="presetSelect"
              v-model="selectedPreset"
              label="Preset"
              :items="presetOptions"
              density="compact"
              variant="outlined"
              @update:model-value="loadPreset"
              class="mb-1"
            >
              <template #item="{ item, index }">
                <v-list-item @click="selectPreset(item.value)">
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                  <template #append>
                    <v-btn icon="mdi-play" size="small" @click.stop="auditionPreset(item.value)" density="compact"></v-btn>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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
import { ref, computed, watch, nextTick } from 'vue'
import Knob from '../Knob.vue'
import AdsrEnvelope from '../AdsrEnvelope.vue'
import { KickGeneratorPlugin } from '@/plugins/KickGeneratorPlugin.js'

const props = defineProps({
  plugin: {
    type: Object,
    required: true
  }
})

const presetSelect = ref(null)
const selectedPreset = ref('')
const isLoadingPreset = ref(false)

const presetOptions = computed(() => {
  return Object.keys(KickGeneratorPlugin.presets).map(name => ({
    title: name,
    value: name
  }))
})

const loadPreset = async (presetName) => {
  if (presetName && KickGeneratorPlugin.presets[presetName]) {
    isLoadingPreset.value = true
    const preset = KickGeneratorPlugin.presets[presetName]
    Object.assign(props.plugin.state, preset)
    selectedPreset.value = presetName
    await nextTick()
    isLoadingPreset.value = false
  }
}

const auditionPreset = (presetName) => {
  if (presetName && KickGeneratorPlugin.presets[presetName]) {
    // Create a temporary plugin instance with the preset
    const tempPlugin = new KickGeneratorPlugin(props.plugin.track, presetName)
    // Play a short sample
    tempPlugin.play(props.plugin.audioCtx.currentTime, 0.5)
  }
}

const selectPreset = (presetName) => {
  selectedPreset.value = presetName
  loadPreset(presetName)
  // Close the dropdown after selection
  if (presetSelect.value) {
    presetSelect.value.menu = false
  }
}

// Watch for changes to detect when a preset is loaded externally or parameters are manually adjusted
watch(() => props.plugin.state, () => {
  // Only reset selected preset if we're not currently loading a preset
  if (!isLoadingPreset.value) {
    selectedPreset.value = ''
  }
}, { deep: true })
</script>