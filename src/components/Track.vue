<template>
  <v-card flat color="transparent">
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2">mdi-music-note</v-icon>
      {{ displayedTracks.length === 1 ? displayedTracks[0].name : 'Track List' }}
      <v-spacer></v-spacer>
      <v-chip variant="outlined" size="small" color="primary" v-if="displayedTracks.length > 1">
        {{ displayedTracks.length }} tracks
      </v-chip>
      <div v-if="displayedTracks.length === 1" class="d-flex">
        <v-btn
          icon="mdi-volume-off"
          density="compact"
          @click="displayedTracks[0].muted = !displayedTracks[0].muted"
          :color="displayedTracks[0].muted ? 'error' : 'grey'"
          :title="displayedTracks[0].muted ? 'Unmute' : 'Mute'"
          class="ms-2"
        ></v-btn>
        <v-btn
          icon="mdi-numeric-1-circle"
          density="compact"
          @click="displayedTracks[0].solo = !displayedTracks[0].solo"
          :color="displayedTracks[0].solo ? 'warning' : 'grey'"
          :title="displayedTracks[0].solo ? 'Unsolo' : 'Solo'"
          class="ms-1"
        ></v-btn>
        <v-btn
          icon="mdi-delete"
          density="compact"
          color="error"
          @click="confirmDelete(displayedTracks[0])"
          title="Delete Track"
          class="ms-1"
        ></v-btn>
      </div>
    </v-card-title>
    <v-card-text>
      <v-list density="compact" bg-color="transparent">
        <v-list-item v-for="t in displayedTracks" :key="t.id">
          <v-row no-gutters>
            <v-col cols="12" v-if="displayedTracks.length > 1">
              <div @click="renameTrack(t)" class="text-h6 mb-2" style="cursor: pointer;">
                {{ t.name }}
              </div>
            </v-col>

            <v-col cols="12">
              <component :is="getPluginComponent(t.pluginType)" :plugin="t.plugin" class="mt-2" />

              <!-- Track Controls Section -->
              <v-card flat color="rgba(255, 255, 255, 0.02)" class="mt-2">
                <v-card-title class="text-subtitle-2 pa-2">Track Controls</v-card-title>
                <v-card-text class="pa-1">
                  <v-row dense>
                    <v-col cols="6" md="6">
                      <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                        <v-card-title class="text-caption pa-1">Volume</v-card-title>
                        <v-card-text class="pa-1">
                          <v-row dense>
                            <v-col cols="12">
                              <Knob
                                v-model="t.volume"
                                label="Level"
                                :min="0"
                                :max="2"
                                :step="0.01"
                                @update:model-value="updateVolume(t)"
                              />
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" md="6">
                      <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1">
                        <v-card-title class="text-caption pa-1">Pan</v-card-title>
                        <v-card-text class="pa-1">
                          <v-row dense>
                            <v-col cols="12">
                              <Knob
                                v-model="t.pan"
                                label="Position"
                                :min="-1"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updatePan(t)"
                              />
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Effects Section -->
              <v-card flat color="rgba(255, 255, 255, 0.02)" class="mt-2">
                <v-card-title class="text-subtitle-2 pa-2 d-flex align-center">
                  Effects
                  <v-spacer></v-spacer>
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn icon="mdi-plus" size="small" v-bind="props" title="Add Effect"></v-btn>
                    </template>
                    <v-list>
                      <v-list-item v-for="effect in availableEffects" :key="effect.type" @click="addEffect(t, effect.type)">
                        <v-list-item-title>{{ effect.name }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-card-title>
                <v-card-text class="pa-1">
                  <v-row dense>
                    <v-col cols="12" v-if="!t.effects || t.effects.length === 0">
                      <div class="text-center text-caption text-disabled pa-4">
                        No effects added yet
                      </div>
                    </v-col>
                    <v-col cols="12" v-for="(effect, index) in (t.effects || [])" :key="index">
                      <v-card flat color="rgba(255, 255, 255, 0.01)" class="pa-1 mb-1">
                        <v-card-title class="text-caption pa-1 d-flex align-center">
                          {{ effect.type }}
                          <v-spacer></v-spacer>
                          <v-btn icon="mdi-delete" size="x-small" color="error" @click="removeEffect(t, index)" title="Remove Effect"></v-btn>
                        </v-card-title>
                        <v-card-text class="pa-1">
                          <v-row dense>
                            <v-col cols="12" v-if="effect.type === 'gain'">
                              <Knob
                                v-model="effect.value"
                                label="Gain"
                                :min="0"
                                :max="2"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="6" v-if="effect.type === 'flanger'">
                              <Knob
                                v-model="effect.rate"
                                label="Rate"
                                :min="0.1"
                                :max="10"
                                :step="0.1"
                                :syncMode="true"
                                :bpm="bpm"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="6" v-if="effect.type === 'flanger'">
                              <Knob
                                v-model="effect.depth"
                                label="Depth"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="6" v-if="effect.type === 'flanger'">
                              <Knob
                                v-model="effect.feedback"
                                label="Feedback"
                                :min="0"
                                :max="0.9"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="6" v-if="effect.type === 'flanger'">
                              <Knob
                                v-model="effect.delay"
                                label="Delay"
                                :min="0.001"
                                :max="0.02"
                                :step="0.001"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="12" v-if="effect.type === 'flanger'">
                              <Knob
                                v-model="effect.mix"
                                label="Mix"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'reverb'">
                              <Knob
                                v-model="effect.decay"
                                label="Decay"
                                :min="0.1"
                                :max="5"
                                :step="0.1"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'reverb'">
                              <Knob
                                v-model="effect.mix"
                                label="Mix"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'reverb'">
                              <Knob
                                v-model="effect.preDelay"
                                label="Pre-Delay"
                                :min="0"
                                :max="0.2"
                                :step="0.001"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'reverb'">
                              <Knob
                                v-model="effect.damping"
                                label="Damping"
                                :min="500"
                                :max="8000"
                                :step="100"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'delay'">
                              <Knob
                                v-model="effect.time"
                                label="Time"
                                :min="0.01"
                                :max="2"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'delay'">
                              <Knob
                                v-model="effect.feedback"
                                label="Feedback"
                                :min="0"
                                :max="0.6"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'delay'">
                              <Knob
                                v-model="effect.mix"
                                label="Mix"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'delay'">
                              <Knob
                                v-model="effect.damping"
                                label="Damping"
                                :min="500"
                                :max="8000"
                                :step="100"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="4" v-if="effect.type === 'distortion'">
                              <Knob
                                v-model="effect.amount"
                                label="Amount"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="4" v-if="effect.type === 'distortion'">
                              <Knob
                                v-model="effect.drive"
                                label="Drive"
                                :min="1"
                                :max="10"
                                :step="0.1"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="4" v-if="effect.type === 'distortion'">
                              <Knob
                                v-model="effect.mix"
                                label="Mix"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'chorus'">
                              <Knob
                                v-model="effect.rate"
                                label="Rate"
                                :min="0.1"
                                :max="5"
                                :step="0.1"
                                :syncMode="true"
                                :bpm="bpm"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'chorus'">
                              <Knob
                                v-model="effect.depth"
                                label="Depth"
                                :min="0.001"
                                :max="0.01"
                                :step="0.001"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'chorus'">
                              <Knob
                                v-model="effect.delay"
                                label="Delay"
                                :min="0.005"
                                :max="0.03"
                                :step="0.001"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'chorus'">
                              <Knob
                                v-model="effect.mix"
                                label="Mix"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'phaser'">
                              <Knob
                                v-model="effect.rate"
                                label="Rate"
                                :min="0.1"
                                :max="5"
                                :step="0.1"
                                :syncMode="true"
                                :bpm="bpm"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'phaser'">
                              <Knob
                                v-model="effect.depth"
                                label="Depth"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'phaser'">
                              <Knob
                                v-model="effect.frequency"
                                label="Freq"
                                :min="200"
                                :max="5000"
                                :step="100"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="3" v-if="effect.type === 'phaser'">
                              <Knob
                                v-model="effect.mix"
                                label="Mix"
                                :min="0"
                                :max="1"
                                :step="0.01"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="4" v-if="effect.type === 'eq'">
                              <Knob
                                v-model="effect.lowGain"
                                label="Low"
                                :min="-20"
                                :max="20"
                                :step="0.5"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="4" v-if="effect.type === 'eq'">
                              <Knob
                                v-model="effect.midGain"
                                label="Mid"
                                :min="-20"
                                :max="20"
                                :step="0.5"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <v-col cols="4" v-if="effect.type === 'eq'">
                              <Knob
                                v-model="effect.highGain"
                                label="High"
                                :min="-20"
                                :max="20"
                                :step="0.5"
                                @update:model-value="updateEffect(t, index)"
                              />
                            </v-col>
                            <!-- Add more effect types here -->
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <div v-if="displayedTracks.length > 1" class="mt-2">
                <v-btn-group density="compact">
                  <v-btn size="small" @click="t.muted = !t.muted" :color="t.muted ? 'secondary' : 'primary'">
                    Mute
                  </v-btn>
                  <v-btn size="small" @click="t.solo = !t.solo" :color="t.solo ? 'warning' : 'primary'">
                    Solo
                  </v-btn>
                  <v-btn size="small" color="error" @click="confirmDelete(t)">
                    Delete
                  </v-btn>
                </v-btn-group>
              </div>
            </v-col>
            <v-col cols="12" md="4" class="text-right">
              <v-progress-linear
                :model-value="t.level * 100"
                height="6"
                color="success"
                bg-color="surface"
              ></v-progress-linear>
            </v-col>
          </v-row>
        </v-list-item>
      </v-list>
    </v-card-text>

    <ConfirmDialog
      v-model="showConfirmDialog"
      :title="'Delete Track'"
      :message="'Delete track &quot;' + trackToDelete?.name + '&quot;?'"
      @confirm="executeDelete"
    />
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDaw } from '@/composables/useDaw'
import { useDialogStore } from '@/stores/dialog'
import FileLoaderPlugin from './plugins/FileLoaderPlugin.vue'
import KickGeneratorPlugin from './plugins/KickGeneratorPlugin.vue'
import ToneGeneratorPlugin from './plugins/ToneGeneratorPlugin.vue'
import BassGeneratorPlugin from './plugins/BassGeneratorPlugin.vue'
import ClapGeneratorPlugin from './plugins/ClapGeneratorPlugin.vue'
import SnareGeneratorPlugin from './plugins/SnareGeneratorPlugin.vue'
import HiHatGeneratorPlugin from './plugins/HiHatGeneratorPlugin.vue'
import WhiteNoiseGeneratorPlugin from './plugins/WhiteNoiseGeneratorPlugin.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import Knob from './Knob.vue'
import { releaseNode } from '@/stores/audio'

const props = defineProps({
  track: Object
})

const dawStore = useDaw()
const { tracks, stepsCount, bpm } = storeToRefs(dawStore)
const { deleteTrack, updateVolume, updatePan } = dawStore

const displayedTracks = computed(() => {
  return props.track ? [props.track] : tracks.value
})

const pluginComponents = {
  'file-loader': FileLoaderPlugin,
  'kick-generator': KickGeneratorPlugin,
  'tone-generator': ToneGeneratorPlugin,
  'bass-generator': BassGeneratorPlugin,
  'clap-generator': ClapGeneratorPlugin,
  'snare-generator': SnareGeneratorPlugin,
  'hihat-generator': HiHatGeneratorPlugin,
  'white-noise-generator': WhiteNoiseGeneratorPlugin
}

const getPluginComponent = (pluginType) => {
  return pluginComponents[pluginType] || null
}

const availableEffects = [
  { type: 'gain', name: 'Gain' },
  { type: 'flanger', name: 'Flanger' },
  { type: 'reverb', name: 'Reverb' },
  { type: 'delay', name: 'Delay' },
  { type: 'distortion', name: 'Distortion' },
  { type: 'chorus', name: 'Chorus' },
  { type: 'phaser', name: 'Phaser' },
  { type: 'eq', name: 'EQ' }
]

const showConfirmDialog = ref(false)
const trackToDelete = ref(null)

const confirmDelete = (track) => {
  trackToDelete.value = track
  showConfirmDialog.value = true
}

const executeDelete = () => {
  if (trackToDelete.value) {
    const dialog = useDialogStore()
    dialog.close()
    deleteTrack(trackToDelete.value)
    trackToDelete.value = null
    showConfirmDialog.value = false
  }
}

const renameTrack = async (track) => {
  const dialog = useDialogStore()
  const newName = await dialog.showPrompt('Enter new track name', 'Rename Track', track.name)
  if (newName) {
    track.name = newName
  }
}

const addEffect = (track, effectType) => {
  console.log('Adding effect:', effectType)
  if (!track.effects) track.effects = [];
  let effect;
  if (effectType === 'gain') {
    effect = {
      type: 'gain',
      value: 1
    };
  } else if (effectType === 'flanger') {
    effect = {
      type: 'flanger',
      rate: 0.5, // LFO rate in Hz
      depth: 0.5, // Modulation depth
      feedback: 0.3, // Feedback amount
      delay: 0.005, // Base delay time in seconds
      mix: 0.5 // Dry/wet mix
    };
  } else if (effectType === 'reverb') {
    effect = {
      type: 'reverb',
      decay: 1.5, // Reverb decay time in seconds (reduced from 2.0)
      mix: 0.25, // Dry/wet mix (reduced from 0.3 for more subtle default)
      preDelay: 0.02, // Pre-delay time in seconds (increased from 0.01)
      damping: 3000 // High-frequency damping in Hz
    };
  } else if (effectType === 'delay') {
    effect = {
      type: 'delay',
      time: 0.2, // Delay time in seconds (reduced from 0.3)
      feedback: 0.15, // Feedback amount (reduced from 0.3)
      mix: 0.3, // Dry/wet mix
      damping: 5000 // High-frequency damping in Hz
    };
  } else if (effectType === 'distortion') {
    effect = {
      type: 'distortion',
      amount: 0.5, // Distortion amount
      drive: 2, // Input drive
      mix: 0.5 // Dry/wet mix
    };
  } else if (effectType === 'chorus') {
    effect = {
      type: 'chorus',
      rate: 0.3, // LFO rate in Hz
      depth: 0.005, // Modulation depth
      delay: 0.01, // Base delay time in seconds
      mix: 0.5 // Dry/wet mix
    };
  } else if (effectType === 'phaser') {
    effect = {
      type: 'phaser',
      rate: 0.5, // LFO rate in Hz
      depth: 0.5, // Modulation depth
      frequency: 1000, // Base frequency in Hz
      mix: 0.5 // Dry/wet mix
    };
  } else if (effectType === 'eq') {
    effect = {
      type: 'eq',
      lowGain: 0, // Low gain in dB
      midGain: 0, // Mid gain in dB
      highGain: 0 // High gain in dB
    };
  }
  track.effects.push(effect);
  track.ensureAudioNodes();
  track.updateEffectsChain();
}

const removeEffect = (track, index) => {
  if (track.effects && track.effects[index]) {
    const effect = track.effects[index];
    if (effect.node) {
      releaseNode('gain', effect.node);
      effect.node = null;
    }
    // Release flanger nodes
    if (effect.type === 'flanger') {
      if (effect.delayNode) releaseNode('delay', effect.delayNode);
      if (effect.feedbackGain) releaseNode('gain', effect.feedbackGain);
      if (effect.lfoOsc) {
        effect.lfoOsc.stop();
        // Oscillators can't be released back to pool
      }
      if (effect.lfoGain) releaseNode('gain', effect.lfoGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release reverb nodes
    if (effect.type === 'reverb') {
      if (effect.preDelayNode) releaseNode('delay', effect.preDelayNode);
      if (effect.inputGain) releaseNode('gain', effect.inputGain);
      if (effect.outputGain) releaseNode('gain', effect.outputGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
      // Release delay lines
      if (effect.delays) {
        effect.delays.forEach(delay => releaseNode('delay', delay));
      }
      if (effect.delayGains) {
        effect.delayGains.forEach(gain => releaseNode('gain', gain));
      }
      if (effect.filters) {
        effect.filters.forEach(filter => releaseNode('biquadFilter', filter));
      }
    }
    // Release delay nodes
    if (effect.type === 'delay') {
      if (effect.delayNode) releaseNode('delay', effect.delayNode);
      if (effect.feedbackGain) releaseNode('gain', effect.feedbackGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
      if (effect.filterNode) releaseNode('biquadFilter', effect.filterNode);
    }
    // Release distortion nodes
    if (effect.type === 'distortion') {
      if (effect.waveShaper) releaseNode('waveShaper', effect.waveShaper);
      if (effect.inputGain) releaseNode('gain', effect.inputGain);
      if (effect.outputGain) releaseNode('gain', effect.outputGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release chorus nodes
    if (effect.type === 'chorus') {
      if (effect.delays) {
        effect.delays.forEach(delay => releaseNode('delay', delay));
      }
      if (effect.delayGains) {
        effect.delayGains.forEach(gain => releaseNode('gain', gain));
      }
      if (effect.lfoOscs) {
        effect.lfoOscs.forEach(osc => osc.stop()); // Can't release oscillators
      }
      if (effect.lfoGains) {
        effect.lfoGains.forEach(gain => releaseNode('gain', gain));
      }
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release phaser nodes
    if (effect.type === 'phaser') {
      if (effect.filters) {
        effect.filters.forEach(filter => releaseNode('biquadFilter', filter));
      }
      if (effect.phaseDelays) {
        effect.phaseDelays.forEach(delay => releaseNode('delay', delay));
      }
      if (effect.lfoOsc) {
        effect.lfoOsc.stop(); // Can't release oscillators
      }
      if (effect.lfoGain) releaseNode('gain', effect.lfoGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release EQ nodes
    if (effect.type === 'eq') {
      if (effect.lowFilter) releaseNode('biquadFilter', effect.lowFilter);
      if (effect.midFilter) releaseNode('biquadFilter', effect.midFilter);
      if (effect.highFilter) releaseNode('biquadFilter', effect.highFilter);
    }
    track.effects.splice(index, 1);
    track.ensureAudioNodes();
    track.updateEffectsChain();
  }
}

const updateEffect = (track, index) => {
  // Handle effect updates, e.g., update audio nodes
  track.ensureAudioNodes();
  track.updateEffectsChain();
}
</script>