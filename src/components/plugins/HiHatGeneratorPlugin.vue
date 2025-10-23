<template>
  <v-container fluid class="pa-0">
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
            >
              <template #item="{ item }">
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
      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">Noise Layer</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6">
                <Knob v-model="plugin.state.noiseLevel" label="Level" :min="0" :max="2" :step="0.01" />
              </v-col>
              <v-col cols="6">
                <Knob v-model="plugin.state.noiseDecay" label="Decay" :min="0.01" :max="1" :step="0.01" />
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="12">
                <v-select
                  v-model="plugin.state.noiseType"
                  label="Noise Type"
                  :items="['white', 'pink', 'brown']"
                  density="compact"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">Metal Partials</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6">
                <Knob v-model="plugin.state.metalLevel" label="Level" :min="0" :max="1.5" :step="0.01" />
              </v-col>
              <v-col cols="6">
                <Knob v-model="plugin.state.metalDecay" label="Decay" :min="0.01" :max="1" :step="0.01" />
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="6">
                <Knob v-model="plugin.state.metalFreq" label="Base Freq" :min="2000" :max="18000" :step="10" />
              </v-col>
              <v-col cols="6">
                <Knob v-model="plugin.state.metalSpread" label="Spread" :min="1" :max="2.5" :step="0.01" />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">Envelope</v-card-title>
          <v-card-text class="pa-2">
            <AdsrEnvelope
              :attack="plugin.state.attack"
              :decay="plugin.state.decay"
              :sustain="plugin.state.sustain"
              :release="plugin.state.release"
              :attack-min="0"
              :attack-max="0.02"
              :attack-step="0.0005"
              :decay-min="0.01"
              :decay-max="1"
              :decay-step="0.01"
              :sustain-min="0"
              :sustain-max="1"
              :sustain-step="0.01"
              :release-min="0.01"
              :release-max="0.5"
              :release-step="0.005"
              @update:attack="plugin.state.attack = $event"
              @update:decay="plugin.state.decay = $event"
              @update:sustain="plugin.state.sustain = $event"
              @update:release="plugin.state.release = $event"
            />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card flat color="rgba(255, 255, 255, 0.02)">
          <v-card-title class="text-subtitle-1 pa-2">Processing</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6" sm="4">
                <Knob v-model="plugin.state.hpFreq" label="High-Pass" :min="500" :max="8000" :step="20" />
              </v-col>
              <v-col cols="6" sm="4">
                <Knob v-model="plugin.state.bpFreq" label="Bandpass" :min="1000" :max="16000" :step="20" />
              </v-col>
              <v-col cols="6" sm="4">
                <Knob v-model="plugin.state.bpResonance" label="Resonance" :min="0.1" :max="20" :step="0.1" />
              </v-col>
              <v-col cols="6" sm="4">
                <Knob v-model="plugin.state.lpFreq" label="Low-Pass" :min="2000" :max="20000" :step="20" />
              </v-col>
              <v-col cols="6" sm="4">
                <Knob v-model="plugin.state.saturation" label="Saturation" :min="0" :max="1" :step="0.01" />
              </v-col>
              <v-col cols="6" sm="4">
                <Knob v-model="plugin.state.compThreshold" label="Compressor" :min="-60" :max="0" :step="1" />
              </v-col>
              <v-col cols="6" sm="4">
                <Knob v-model="plugin.state.level" label="Level" :min="0" :max="2" :step="0.01" />
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
import { HiHatGeneratorPlugin } from '@/plugins/HiHatGeneratorPlugin.js'

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
  return Object.keys(HiHatGeneratorPlugin.presets).map(name => ({
    title: name,
    value: name
  }))
})

const loadPreset = async (presetName) => {
  if (presetName && HiHatGeneratorPlugin.presets[presetName]) {
    isLoadingPreset.value = true
    const preset = HiHatGeneratorPlugin.presets[presetName]
    Object.assign(props.plugin.state, preset)
    selectedPreset.value = presetName
    await nextTick()
    isLoadingPreset.value = false
  }
}

const auditionPreset = (presetName) => {
  if (presetName && HiHatGeneratorPlugin.presets[presetName]) {
    const tempPlugin = new HiHatGeneratorPlugin(props.plugin.track, presetName)
    tempPlugin.play(props.plugin.audioCtx.currentTime, 0.3)
  }
}

const selectPreset = (presetName) => {
  selectedPreset.value = presetName
  loadPreset(presetName)
  if (presetSelect.value) {
    presetSelect.value.menu = false
  }
}

watch(() => props.plugin.state, () => {
  if (!isLoadingPreset.value) {
    selectedPreset.value = ''
  }
}, { deep: true })
</script>
