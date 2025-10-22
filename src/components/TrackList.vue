<template>
  <v-card flat color="transparent">
    <v-card-title>Tracks</v-card-title>
    <v-card-text>
      <v-list density="compact" bg-color="transparent">
        <v-list-item v-for="track in tracks" :key="track.id">
          <v-row no-gutters>
            <v-col cols="12">
              <div @click="renameTrack(track)" class="text-h6 mb-2" style="cursor: pointer;">
                {{ track.name }}
              </div>

              <v-select
                v-model="track.pluginType"
                :items="Object.entries(pluginTypes).map(([key, plugin]) => ({ title: plugin.name, value: key }))"
                label="Plugin"
                density="compact"
                variant="outlined"
                hide-details
                @update:model-value="changeTrackPlugin(track, $event)"
              ></v-select>

              <component :is="getPluginComponent(track.pluginType)" :plugin="track.plugin" class="mt-2" />

              <v-row no-gutters class="mt-2">
                <v-col cols="6">
                  <v-slider
                    v-model="track.volume"
                    label="Volume"
                    min="0"
                    max="2"
                    step="0.01"
                    density="compact"
                    hide-details
                    @update:model-value="updateVolume(track)"
                  ></v-slider>
                </v-col>
                <v-col cols="6">
                  <v-slider
                    v-model="track.pan"
                    label="Pan"
                    min="-1"
                    max="1"
                    step="0.01"
                    density="compact"
                    hide-details
                    @update:model-value="updatePan(track)"
                  ></v-slider>
                </v-col>
              </v-row>

              <v-btn-group density="compact" class="mt-2">
                <v-btn size="small" @click="track.muted = !track.muted" :color="track.muted ? 'secondary' : 'primary'">
                  Mute
                </v-btn>
                <v-btn size="small" @click="track.solo = !track.solo" :color="track.solo ? 'warning' : 'primary'">
                  Solo
                </v-btn>
                <v-btn size="small" color="error" @click="deleteTrack(track)">
                  Delete
                </v-btn>
              </v-btn-group>
            </v-col>
            <v-col cols="12" md="4" class="text-right">
              <v-progress-linear
                :model-value="track.level * 100"
                height="6"
                color="success"
                bg-color="surface"
              ></v-progress-linear>
            </v-col>
          </v-row>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-alert type="info" variant="tonal" density="compact">
        Drag & drop audio files onto a track or use the file picker. Supports WAV/MP3/OGG. Each track has a {{ stepsCount }}-step sequencer.
      </v-alert>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useDaw } from '@/composables/useDaw'
import FileLoaderPlugin from './plugins/FileLoaderPlugin.vue'
import KickGeneratorPlugin from './plugins/KickGeneratorPlugin.vue'
import ToneGeneratorPlugin from './plugins/ToneGeneratorPlugin.vue'

const dawStore = useDaw()
const { tracks, stepsCount } = storeToRefs(dawStore)
const { changeTrackPlugin, deleteTrack, updateVolume, updatePan } = dawStore
const pluginTypes = dawStore.pluginTypes

const pluginComponents = {
  'file-loader': FileLoaderPlugin,
  'kick-generator': KickGeneratorPlugin,
  'tone-generator': ToneGeneratorPlugin
}

const getPluginComponent = (pluginType) => {
  return pluginComponents[pluginType] || null
}

const renameTrack = (track) => {
  const newName = prompt('Rename track', track.name)
  if (newName) {
    track.name = newName
  }
}
</script>