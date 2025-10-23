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
                    <v-btn icon="mdi-play" size="small" density="compact" @click.stop="auditionPreset(item.value)"></v-btn>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">Noise Settings</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6">
                <Knob v-model="plugin.state.level" label="Level" :min="0" :max="2" :step="0.01" />
              </v-col>
              <v-col cols="6">
                <Knob v-model="plugin.state.hold" label="Hold" :min="0" :max="4" :step="0.05" />
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

      <v-col cols="12" md="6">
        <v-card flat color="rgba(255, 255, 255, 0.02)" class="mb-3">
          <v-card-title class="text-subtitle-1 pa-2">Dynamics</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6">
                <Knob v-model="plugin.state.saturation" label="Saturation" :min="0" :max="1" :step="0.01" />
              </v-col>
              <v-col cols="6">
                <Knob v-model="plugin.state.compThreshold" label="Comp Thresh" :min="-60" :max="0" :step="1" />
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
              :attack-max="1"
              :attack-step="0.001"
              :decay-min="0.001"
              :decay-max="2"
              :decay-step="0.005"
              :sustain-min="0"
              :sustain-max="1"
              :sustain-step="0.01"
              :release-min="0.001"
              :release-max="2"
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
          <v-card-title class="text-subtitle-1 pa-2">Filtering</v-card-title>
          <v-card-text class="pa-1">
            <v-row dense>
              <v-col cols="6" md="4">
                <Knob v-model="plugin.state.hpFreq" label="High-Pass" :min="20" :max="8000" :step="10" />
              </v-col>
              <v-col cols="6" md="4">
                <Knob v-model="plugin.state.hpQ" label="HP Q" :min="0.1" :max="12" :step="0.05" />
              </v-col>
              <v-col cols="6" md="4">
                <Knob v-model="plugin.state.lpFreq" label="Low-Pass" :min="200" :max="20000" :step="20" />
              </v-col>
              <v-col cols="6" md="4">
                <Knob v-model="plugin.state.lpQ" label="LP Q" :min="0.1" :max="12" :step="0.05" />
              </v-col>
              <v-col cols="6" md="4">
                <Knob v-model="plugin.state.bandFreq" label="Peak Freq" :min="200" :max="16000" :step="20" />
              </v-col>
              <v-col cols="6" md="4">
                <Knob v-model="plugin.state.bandGain" label="Peak Gain" :min="-24" :max="24" :step="0.5" />
              </v-col>
              <v-col cols="6" md="4">
                <Knob v-model="plugin.state.bandQ" label="Peak Q" :min="0.1" :max="18" :step="0.05" />
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
import { WhiteNoiseGeneratorPlugin } from '@/plugins/WhiteNoiseGeneratorPlugin.js'

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
  return Object.keys(WhiteNoiseGeneratorPlugin.presets).map(name => ({
    title: name,
    value: name
  }))
})

const loadPreset = async (presetName) => {
  if (presetName && WhiteNoiseGeneratorPlugin.presets[presetName]) {
    isLoadingPreset.value = true
    const preset = WhiteNoiseGeneratorPlugin.presets[presetName]
    Object.assign(props.plugin.state, preset)
    selectedPreset.value = presetName
    await nextTick()
    isLoadingPreset.value = false
  }
}

const auditionPreset = (presetName) => {
  if (presetName && WhiteNoiseGeneratorPlugin.presets[presetName]) {
    const tempPlugin = new WhiteNoiseGeneratorPlugin(props.plugin.track, presetName)
    const ctx = props.plugin.audioCtx
    const now = ctx.currentTime
    const length = tempPlugin.state.attack + tempPlugin.state.decay + tempPlugin.state.hold + tempPlugin.state.release + 0.5
    tempPlugin.play(now, length)
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
