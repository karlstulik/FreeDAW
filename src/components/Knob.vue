<template>
  <div class="knob-container">
    <div class="knob-label">{{ label }}</div>
    <div
      class="knob"
      @mousedown="startDrag"
      @touchstart="startDrag"
      ref="knobElement"
    >
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="35"
          fill="none"
          stroke="#ccc"
          stroke-width="2"
        />
        <circle
          cx="40"
          cy="40"
          r="30"
          fill="#333"
        />
        <line
          x1="40"
          y1="22"
          x2="40"
          y2="15"
          stroke="#ff0000"
          stroke-width="2"
          stroke-linecap="round"
          :transform="`rotate(${angle} 40 40)`"
        />
        <text
          x="40"
          y="45"
          text-anchor="middle"
          fill="#fff"
          font-size="12"
          font-family="monospace"
        >
          {{ displayValue }}
        </text>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 1
  },
  step: {
    type: Number,
    default: 0.01
  },
  label: {
    type: String,
    default: ''
  },
  precision: {
    type: Number,
    default: 2
  },
  syncMode: {
    type: Boolean,
    default: false
  },
  bpm: {
    type: Number,
    default: 120
  }
})

const emit = defineEmits(['update:modelValue'])

const knobElement = ref(null)
const isDragging = ref(false)
const startY = ref(0)
const startValue = ref(0)

// Musical time divisions for sync mode
// Each entry is [displayName, multiplier relative to quarter note]
const syncDivisions = [
  ['1/32', 1/8],    // 1/32 note = 1/8 of quarter note in Hz
  ['1/16', 1/4],    // 1/16 note
  ['1/8', 1/2],     // 1/8 note
  ['1/4', 1],       // quarter note
  ['1/2', 2],       // half note
  ['1', 4],         // whole note (1 bar in 4/4)
  ['2', 8],         // 2 bars
  ['4', 16]         // 4 bars
]

// Convert BPM to Hz for a given note division
const getHzForDivision = (division) => {
  const bpmVal = props.bpm || 120
  const quarterNoteHz = bpmVal / 60 // Hz of quarter notes
  return quarterNoteHz * division[1]
}

// Find closest sync division to a given Hz value
const findClosestDivision = (hz) => {
  let closest = syncDivisions[0]
  let minDiff = Math.abs(getHzForDivision(syncDivisions[0]) - hz)
  
  for (const division of syncDivisions) {
    const divHz = getHzForDivision(division)
    const diff = Math.abs(divHz - hz)
    if (diff < minDiff) {
      minDiff = diff
      closest = division
    }
  }
  
  return closest
}

const normalizedValue = computed(() => {
  return (props.modelValue - props.min) / (props.max - props.min)
})

const angle = computed(() => {
  // Rotate from -135 to 135 degrees (270 degree range)
  return -135 + (normalizedValue.value * 270)
})

const displayValue = computed(() => {
  if (props.syncMode) {
    // Display note value for sync mode
    const division = findClosestDivision(props.modelValue)
    return division[0]
  }
  if (props.max - props.min > 10) {
    return Math.round(props.modelValue)
  }
  return props.modelValue.toFixed(props.precision)
})

const updateValue = (deltaY) => {
  const sensitivity = 0.005 // Adjust for sensitivity
  const delta = -deltaY * sensitivity * (props.max - props.min)
  let newValue = startValue.value + delta

  // Clamp to min/max
  newValue = Math.max(props.min, Math.min(props.max, newValue))

  if (props.syncMode) {
    // Snap to nearest musical division
    const closestDivision = findClosestDivision(newValue)
    newValue = getHzForDivision(closestDivision)
    // Still clamp after sync
    newValue = Math.max(props.min, Math.min(props.max, newValue))
  } else {
    // Apply step
    newValue = Math.round(newValue / props.step) * props.step
  }

  emit('update:modelValue', newValue)
}

const startDrag = (event) => {
  event.preventDefault()
  isDragging.value = true
  startY.value = event.touches ? event.touches[0].clientY : event.clientY
  startValue.value = props.modelValue

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)
}

const onDrag = (event) => {
  if (!isDragging.value) return
  event.preventDefault()
  const currentY = event.touches ? event.touches[0].clientY : event.clientY
  const deltaY = currentY - startY.value
  updateValue(deltaY)
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
}

onUnmounted(() => {
  stopDrag()
})
</script>

<style scoped>
.knob-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 4px;
  min-width: 0;
  flex: 1;
}

.knob-label {
  font-size: 11px;
  color: #ccc;
  margin-bottom: 2px;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  hyphens: auto;
}

.knob {
  cursor: grab;
  user-select: none;
  touch-action: none;
  display: flex;
  justify-content: center;
  align-items: center;
}

.knob:active {
  cursor: grabbing;
}

/* Mobile-first responsive design */
@media (max-width: 600px) {
  .knob-container {
    margin: 2px;
  }

  .knob-label {
    font-size: 10px;
    margin-bottom: 1px;
  }

  .knob svg {
    width: 50px;
    height: 50px;
  }

  .knob svg text {
    font-size: 10px;
  }
}

@media (min-width: 601px) and (max-width: 960px) {
  .knob svg {
    width: 65px;
    height: 65px;
  }

  .knob svg text {
    font-size: 11px;
  }
}

@media (min-width: 961px) {
  .knob svg {
    width: 80px;
    height: 80px;
  }

  .knob svg text {
    font-size: 12px;
  }
}
</style>