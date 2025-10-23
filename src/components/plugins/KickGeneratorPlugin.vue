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