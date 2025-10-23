export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function makeId() { return Math.random().toString(36).slice(2, 9) }

export function nextStepTime(stepIndex, whenStarted, bpm, stepsCount) {
  const bpmVal = parseFloat(bpm) || 120;
  const quarterNoteSec = 60.0 / bpmVal;
  const stepsCountVal = parseInt(stepsCount, 10) || 16;
  // assume we divide bar into stepsCount per bar
  const stepDuration = (quarterNoteSec * 4) / stepsCountVal; // seconds per step
  return whenStarted + stepIndex * stepDuration;
}

// tiny WAV converter
export function bufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const buf = new ArrayBuffer(length);
  const view = new DataView(buf);
  function writeString(view, offset, string) { for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); } }
  let offset = 0;
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;
  // write interleaved
  const channels = [];
  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
  let pos = 0;
  while (pos < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][pos]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    pos++;
  }
  return view;
}