<template>
  <v-row dense>
    <v-col cols="12">
      <v-slider
        v-model="plugin.state.frequency"
        label="Base Frequency (Hz)"
        :min="20"
        :max="200"
        :step="1"
        thumb-label
        density="compact"
      />
    </v-col>

    <v-col cols="12" md="6">
      <v-slider v-model="plugin.state.pitchOffset" label="Pitch Offset (semitones)" :min="-12" :max="12" :step="1" density="compact" />
    </v-col>

    <v-col cols="12" md="6">
      <v-slider v-model="plugin.state.level" label="Level (gain)" :min="0" :max="2" :step="0.01" density="compact" />
    </v-col>

    <v-col cols="12">
      <div class="text-subtitle-2 mb-2">Envelope (ADSR)</div>
      <v-row>
        <v-col cols="6" md="3">
          <v-slider v-model="plugin.state.attack" label="Attack (s)" :min="0" :max="0.1" :step="0.001" density="compact" />
        </v-col>
        <v-col cols="6" md="3">
          <v-slider v-model="plugin.state.decay" label="Decay (s)" :min="0" :max="1" :step="0.01" density="compact" />
        </v-col>
        <v-col cols="6" md="3">
          <v-slider v-model="plugin.state.sustain" label="Sustain" :min="0" :max="1" :step="0.01" density="compact" />
        </v-col>
        <v-col cols="6" md="3">
          <v-slider v-model="plugin.state.release" label="Release (s)" :min="0" :max="1" :step="0.01" density="compact" />
        </v-col>
      </v-row>
    </v-col>

    <v-col cols="12" md="6">
      <v-slider v-model="plugin.state.clickLevel" label="Click Level" :min="0" :max="0.5" :step="0.001" density="compact" />
    </v-col>

    <v-col cols="12" md="6">
      <v-slider v-model="plugin.state.hpFreq" label="High-pass (Hz)" :min="10" :max="200" :step="1" density="compact" />
    </v-col>

    <v-col cols="12" md="6">
      <v-slider v-model="plugin.state.saturation" label="Saturation" :min="0" :max="1" :step="0.01" density="compact" />
    </v-col>

    <v-col cols="12" md="6">
      <v-slider v-model="plugin.state.compThreshold" label="Compressor Threshold" :min="-60" :max="0" :step="1" density="compact" />
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