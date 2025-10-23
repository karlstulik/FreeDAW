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
import ConfirmDialog from './ConfirmDialog.vue'
import Knob from './Knob.vue'

const props = defineProps({
  track: Object
})

const dawStore = useDaw()
const { tracks, stepsCount } = storeToRefs(dawStore)
const { deleteTrack, updateVolume, updatePan } = dawStore

const displayedTracks = computed(() => {
  return props.track ? [props.track] : tracks.value
})

const pluginComponents = {
  'file-loader': FileLoaderPlugin,
  'kick-generator': KickGeneratorPlugin,
  'tone-generator': ToneGeneratorPlugin,
  'bass-generator': BassGeneratorPlugin
}

const getPluginComponent = (pluginType) => {
  return pluginComponents[pluginType] || null
}

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
</script>