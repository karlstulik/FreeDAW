<template>
  <v-file-input
    ref="fileInput"
    v-model="file"
    label="Load Audio File"
    accept="audio/*"
    show-size
    @change="onFileChange"
    density="compact"
    variant="outlined"
  />
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  plugin: {
    type: Object,
    required: true
  }
})

const file = ref(null)
const fileInput = ref(null)

const onFileChange = async () => {
  if (file.value && file.value[0]) {
    await props.plugin.loadFile(file.value[0])
  }
}
</script>