<template>
  <v-app @dragover.prevent @drop="onDrop">
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>FreeDAW</v-toolbar-title>
      <v-spacer></v-spacer>
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

const { createTrack } = useDaw()

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
