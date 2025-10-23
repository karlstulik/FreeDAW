import { useDialogStore } from '@/stores/dialog'
import { bufferToWav } from './utils'

export async function exportMixdown(tracks, bpm, stepsCount) {
  if (tracks.length === 0) {
    const dialog = useDialogStore()
    await dialog.showAlert('No tracks to export')
    return
  }
  const bpmVal = parseFloat(bpm.value) || 120;
  const stepsCountVal = parseInt(stepsCount.value, 10) || 16;
  const quarterNoteSec = 60.0 / bpmVal;
  const stepDuration = (quarterNoteSec * 4) / stepsCountVal;
  // estimate length: 4 bars
  const bars = 4;
  const lengthSec = bars * 4 * quarterNoteSec;
  const sampleRate = 44100;
  const offline = new OfflineAudioContext(2, Math.ceil(lengthSec * sampleRate), sampleRate);
  // create destination and render graph
  // create per-track nodes
  tracks.forEach(tr => {
    // schedule for each step
    for (let i = 0; i < stepsCountVal; i++) {
      if (tr.steps[i]) {
        tr.plugin.playOffline(offline, i * stepDuration);
      }
    }
  });
  // render
  const rendered = await offline.startRendering();
  // convert to WAV
  const wav = bufferToWav(rendered);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mixdown.wav';
  a.click();
  URL.revokeObjectURL(url);
}