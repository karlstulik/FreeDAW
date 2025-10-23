<template>
  <div class="adsr-envelope">
    <!-- Graph -->
    <div class="adsr-graph">
      <svg :width="width" :height="height" viewBox="0 0 200 60" class="adsr-svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="200" height="20" fill="url(#grid)" />

        <path
          :d="adsrPath"
          fill="none"
          stroke="#68f06f"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        <text x="0" y="60" fill="rgba(255,255,255,1)" font-size="10" text-anchor="start">0</text>
        <text x="100" y="60" fill="rgba(255,255,255,1)" font-size="10" text-anchor="middle">Time</text>
        <text x="198" y="60" fill="rgba(255,255,255,1)" font-size="10" text-anchor="end">∞</text>

        <line x1="0" y1="0" x2="0" y2="50" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        <text x="-2" y="8" fill="rgba(255,255,255,1)" font-size="10" text-anchor="end">1.0</text>
        <text x="-2" y="26" fill="rgba(255,255,255,1)" font-size="10" text-anchor="end">{{ localSustain.toFixed(1) }}</text>
        <text x="-2" y="48" fill="rgba(255,255,255,1)" font-size="10" text-anchor="end">0.0</text>
      </svg>
    </div>

    <!-- Knobs / Controls -->
    <v-row dense class="mt-2">
      <v-col cols="12" sm="6" md="6">
        <v-card flat class="pa-1" color="rgba(255,255,255,0.01)">
          <v-card-title class="text-caption pa-1">Attack</v-card-title>
          <v-card-text class="pa-1">
            <Knob v-model="localAttack" label="Time (s)" :min="attackMin" :max="attackMax" :step="attackStep" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="6">
        <v-card flat class="pa-1" color="rgba(255,255,255,0.01)">
          <v-card-title class="text-caption pa-1">Decay</v-card-title>
          <v-card-text class="pa-1">
            <Knob v-model="localDecay" label="Time (s)" :min="decayMin" :max="decayMax" :step="decayStep" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row dense class="mt-2">
      <v-col cols="12" sm="6" md="6">
        <v-card flat class="pa-1" color="rgba(255,255,255,0.01)">
          <v-card-title class="text-caption pa-1">Sustain</v-card-title>
          <v-card-text class="pa-1">
            <Knob v-model="localSustain" label="Level" :min="sustainMin" :max="sustainMax" :step="sustainStep" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="6">
        <v-card flat class="pa-1" color="rgba(255,255,255,0.01)">
          <v-card-title class="text-caption pa-1">Release</v-card-title>
          <v-card-text class="pa-1">
            <Knob v-model="localRelease" label="Time (s)" :min="releaseMin" :max="releaseMax" :step="releaseStep" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import Knob from './Knob.vue'

const props = defineProps({
  attack: { type: Number, default: 0.1 },
  decay: { type: Number, default: 0.2 },
  sustain: { type: Number, default: 0.8 },
  release: { type: Number, default: 0.3 },

  // Ranges
  attackMin: { type: Number, default: 0 },
  attackMax: { type: Number, default: 2 },
  attackStep: { type: Number, default: 0.001 },

  decayMin: { type: Number, default: 0 },
  decayMax: { type: Number, default: 2 },
  decayStep: { type: Number, default: 0.01 },

  sustainMin: { type: Number, default: 0 },
  sustainMax: { type: Number, default: 1 },
  sustainStep: { type: Number, default: 0.01 },

  releaseMin: { type: Number, default: 0 },
  releaseMax: { type: Number, default: 2 },
  releaseStep: { type: Number, default: 0.01 },

  width: { type: Number, default: 200 },
  height: { type: Number, default: 30 }
})

// Local v-model refs
const localAttack = ref(props.attack)
const localDecay = ref(props.decay)
const localSustain = ref(props.sustain)
const localRelease = ref(props.release)

watch(() => props.attack, v => (localAttack.value = v))
watch(() => props.decay, v => (localDecay.value = v))
watch(() => props.sustain, v => (localSustain.value = v))
watch(() => props.release, v => (localRelease.value = v))

const emit = defineEmits(['update:attack','update:decay','update:sustain','update:release'])
watch(localAttack, v => emit('update:attack', v))
watch(localDecay, v => emit('update:decay', v))
watch(localSustain, v => emit('update:sustain', v))
watch(localRelease, v => emit('update:release', v))

// Graph calculations (copied from AdsrGraph)
const normalizedAttack = computed(() => Math.min(localAttack.value * 40, 35))
const normalizedDecay = computed(() => Math.min(localDecay.value * 30, 45))
const normalizedRelease = computed(() => Math.min(localRelease.value * 25, 60))

const adsrPath = computed(() => {
  const totalWidth = 200
  const totalHeight = 50
  const sustainY = totalHeight - (localSustain.value * totalHeight)

  const attackEnd = Math.min(normalizedAttack.value, totalWidth * 0.25)
  const decayEnd = attackEnd + Math.min(normalizedDecay.value, totalWidth * 0.35)
  const sustainEnd = decayEnd + Math.min(totalWidth * 0.25, totalWidth - decayEnd - normalizedRelease.value)
  const releaseEnd = sustainEnd + Math.min(normalizedRelease.value, totalWidth - sustainEnd)

  let path = `M 0 ${totalHeight}`
  if (attackEnd > 0) path += ` L ${attackEnd} 3`
  if (decayEnd > attackEnd) path += ` L ${decayEnd} ${sustainY}`
  if (sustainEnd > decayEnd) path += ` L ${sustainEnd} ${sustainY}`
  if (releaseEnd > sustainEnd) path += ` L ${releaseEnd} ${totalHeight - 1}`
  else path += ` L ${totalWidth} ${sustainY}`

  return path
})
</script>

<style scoped>
.adsr-envelope { width: 100%; }
.adsr-graph { display: flex; justify-content: center; align-items: center; margin: 8px 0; width: 100%; }
.adsr-svg { width: 100% !important; height: auto !important; max-width: 100%; border-radius: 6px; background: rgba(0,0,0,0.3); }
</style>
