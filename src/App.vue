<template>
  <v-app @dragover.prevent @drop="onDrop">
    <div class="app">
      <header>
        <Transport />
      </header>

      <aside class="left">
        <TrackList />
      </aside>

      <main class="center">
        <Sequencer />
      </main>
    </div>
  </v-app>
</template>

<script setup>
import { onMounted } from 'vue'
import Transport from './components/Transport.vue'
import TrackList from './components/TrackList.vue'
import Sequencer from './components/Sequencer.vue'
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
:root {
  --bg: #0f1724;
  --panel: #111827;
  --muted: #94a3b8;
  --accent: #60a5fa;
  --glass: rgba(255, 255, 255, 0.04);
}

html, body {
  height: 100%;
  margin: 0;
  font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  background: linear-gradient(180deg, #071029 0%, #081026 100%);
  color: #e6eef8;
}

.app {
  display: grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: auto 1fr;
  gap: 12px;
  padding: 14px;
  height: 100vh;
  box-sizing: border-box;
}

header {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  align-items: center;
}

.left {
  background: var(--panel);
  padding: 12px;
  border-radius: 10px;
  height: calc(100vh - 120px);
  overflow: auto;
}

.center {
  background: transparent;
  padding: 12px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sequencer {
  background: var(--glass);
  padding: 12px;
  border-radius: 8px;
}

.tracks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  align-items: center;
}

.track-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.track-buttons {
  display: flex;
  gap: 6px;
}

input[type=range] {
  width: 120px;
}

.steps {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 4px;
}

.step {
  width: 100%;
  padding: 8px;
  text-align: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  user-select: none;
}

.step.active {
  background: var(--accent);
  color: #022;
}

.meter {
  height: 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  overflow: hidden;
}

.meter > i {
  display: block;
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #34d399, #60a5fa);
}

.file-drop {
  border: 1px dashed rgba(255, 255, 255, 0.04);
  padding: 8px;
  border-radius: 8px;
  text-align: center;
}

.footer-note {
  font-size: 12px;
  color: var(--muted);
  margin-top: 10px;
}

.small {
  font-size: 13px;
}

.controls-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tempo {
  display: flex;
  flex-direction: column;
}

.bpm {
  font-weight: 700;
}
</style>
