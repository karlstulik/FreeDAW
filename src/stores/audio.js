let audioCtx = null;
let masterGain = null;

export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    // create master gain and connect to destination
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.9; // default master volume
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function getMasterGain() {
  if (!masterGain) {
    getAudioContext(); // Ensure context is created
  }
  return masterGain;
}

export function updateMasterVolume(volume) {
  if (masterGain) {
    masterGain.gain.value = volume;
  }
}