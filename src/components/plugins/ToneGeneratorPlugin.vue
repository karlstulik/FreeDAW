<template>
  <v-row dense>
    <v-col cols="12">
      <v-slider
        v-model="plugin.state.frequency"
        label="Frequency"
        :min="20"
        :max="2000"
        :step="1"
        thumb-label
        density="compact"
      />
    </v-col>
    <v-col cols="12">
      <v-select
        v-model="plugin.state.waveform"
        label="Waveform"
        :items="['sine', 'square', 'sawtooth', 'triangle']"
        density="compact"
        variant="outlined"
      />
    </v-col>
    <v-col cols="12">
      <v-slider
        v-model="plugin.state.duration"
        label="Duration"
        :min="0.01"
        :max="2"
        :step="0.01"
        thumb-label
        density="compact"
      />
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  plugin: {
    type: Object,
    required: true
  }
})
</script>