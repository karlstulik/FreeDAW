<template>
  <v-row dense>
    <v-col cols="12">
      <v-slider
        v-model="plugin.state.frequency"
        label="Frequency"
        :min="30"
        :max="150"
        :step="1"
        thumb-label
        density="compact"
      />
    </v-col>
    <v-col cols="12">
      <v-slider
        v-model="plugin.state.decay"
        label="Decay"
        :min="0.05"
        :max="1"
        :step="0.01"
        thumb-label
        density="compact"
      />
    </v-col>
    <v-col cols="12">
      <v-slider
        v-model="plugin.state.pitchBend"
        label="Pitch Bend"
        :min="0"
        :max="0.5"
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