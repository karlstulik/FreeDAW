<template>
  <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
    <v-card-title class="text-caption pa-1">Spectrum Analyser</v-card-title>
    <v-card-text class="pa-1">
      <canvas
        ref="canvas"
        :width="width"
        :height="height"
        class="analyser-canvas"
      ></canvas>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getMasterAnalyser, getAudioContext } from '@/stores/audio'

const canvas = ref(null)
const width = ref(300)
const height = ref(100)
let animationId = null
let analyser = null
let dataArray = null

onMounted(() => {
  const audioCtx = getAudioContext()
  analyser = getMasterAnalyser()

  if (analyser) {
    analyser.fftSize = 2048
    const bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)

    draw()
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})

const draw = () => {
  if (!canvas.value || !analyser || !dataArray) return

  const ctx = canvas.value.getContext('2d')

  analyser.getByteFrequencyData(dataArray)

  ctx.fillStyle = 'rgb(7, 16, 41)' // Match the app background
  ctx.fillRect(0, 0, width.value, height.value)

  const barWidth = (width.value / dataArray.length) * 2.5
  let barHeight
  let x = 0

  for (let i = 0; i < dataArray.length; i++) {
    barHeight = (dataArray[i] / 255) * height.value

    // Create a gradient from blue to green to red
    const gradient = ctx.createLinearGradient(0, height.value - barHeight, 0, height.value)
    gradient.addColorStop(0, '#2196F3') // Blue
    gradient.addColorStop(0.5, '#4CAF50') // Green
    gradient.addColorStop(1, '#F44336') // Red

    ctx.fillStyle = gradient
    ctx.fillRect(x, height.value - barHeight, barWidth, barHeight)

    x += barWidth + 1
  }

  animationId = requestAnimationFrame(draw)
}
</script>

<style scoped>
.analyser-canvas {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgb(7, 16, 41);
}
</style>