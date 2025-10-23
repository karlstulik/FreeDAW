<template>
  <v-app @dragover.prevent @drop="onDrop">
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>FreeDAW</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn color="white" variant="flat" @click="handleNewProject" class="mr-2">
        New
      </v-btn>
      <Transport />
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <Sequencer />
      </v-container>
    </v-main>

    <Dialog />
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import Transport from './components/Transport.vue'
import Sequencer from './components/Sequencer.vue'
import Dialog from './components/Dialog.vue'
import { useDaw } from '@/composables/useDaw'
import { useDialogStore } from '@/stores/dialog'

const { createTrack, newProject, tracks } = useDaw()
const { showConfirm } = useDialogStore()

const handleNewProject = async () => {
  if (tracks.length > 0) {
    const confirmed = await showConfirm('Are you sure you want to create a new project? All unsaved changes will be lost.', 'New Project')
    if (!confirmed) return
  }
  newProject()
}

const onDrop = async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const t = createTrack(file.name.replace(/\.[^/.]+$/,'') || 'Sample', 'file-loader');
  if (t.plugin.loadFile) {
    await t.plugin.loadFile(file);
  }
}
</script>

<style>
html, body {
  height: 100%;
  margin: 0;
  background: linear-gradient(180deg, #071029 0%, #081026 100%);
}

.v-application {
  background: linear-gradient(180deg, #071029 0%, #081026 100%) !important;
}
</style>
