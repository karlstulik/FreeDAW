import { useDialogStore } from '@/stores/dialog'
import { bufferToWav } from './utils'

export async function exportMixdown(tracks, bpm, stepsCount, masterVolume) {
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

  const soloActive = tracks.some(tr => tr.solo);
  const masterVol = typeof masterVolume === 'number'
    ? masterVolume
    : (masterVolume && typeof masterVolume.value === 'number' ? masterVolume.value : 0.9);

  // Build master processing chain to mirror real-time playback
  const masterGain = offline.createGain();
  masterGain.gain.value = masterVol;

  const dcFilter = offline.createBiquadFilter();
  dcFilter.type = 'highpass';
  dcFilter.frequency.value = 8;
  dcFilter.Q.value = Math.SQRT1_2;

  const masterCompressor = offline.createDynamicsCompressor();
  masterCompressor.threshold.value = -12;
  masterCompressor.knee.value = 8;
  masterCompressor.ratio.value = 3;
  masterCompressor.attack.value = 0.003;
  masterCompressor.release.value = 0.12;

  const masterLimiter = offline.createDynamicsCompressor();
  masterLimiter.threshold.value = -0.5;
  masterLimiter.knee.value = 0;
  masterLimiter.ratio.value = 20;
  masterLimiter.attack.value = 0.001;
  masterLimiter.release.value = 0.05;

  // Makeup gain to normalize after compression
  const makeupGain = offline.createGain();
  makeupGain.gain.value = 1.2;

  masterGain.connect(dcFilter);
  dcFilter.connect(masterCompressor);
  masterCompressor.connect(makeupGain);
  makeupGain.connect(masterLimiter);
  masterLimiter.connect(offline.destination);

  const routing = tracks.map(tr => {
    const trackGain = offline.createGain();
    trackGain.gain.value = typeof tr.volume === 'number' ? tr.volume : 1;

    const trackPan = offline.createStereoPanner();
    trackPan.pan.value = typeof tr.pan === 'number' ? tr.pan : 0;

    trackGain.connect(trackPan);
    trackPan.connect(masterGain);

    return { track: tr, gain: trackGain };
  });

  tracks.forEach((tr, index) => {
    const route = routing[index];
    if (!route) return;

    const muted = tr.muted || (soloActive && !tr.solo);
    if (muted) return;

    for (let i = 0; i < stepsCountVal; i++) {
      if (!tr.steps[i]) continue;
      const when = i * stepDuration;
      if (tr.plugin && typeof tr.plugin.playOffline === 'function') {
        tr.plugin.playOffline(offline, when, undefined, route.gain);
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