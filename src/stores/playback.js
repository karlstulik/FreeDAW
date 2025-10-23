import { getAudioContext, getMasterGain } from './audio'
import { formatTime, nextStepTime } from './utils'

let startTime = 0; // when transport started
let schedulerInterval = null;
const lookahead = 0.1; // seconds
const scheduleAhead = 0.2; // seconds

export function schedule(isPlaying, tracks, bpm, stepsCount, timeDisplay, metronomeEnabled) {
  if (!isPlaying.value) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const bpmVal = parseFloat(bpm.value) || 120;
  const quarterNoteSec = 60.0 / bpmVal;
  const stepsCountVal = parseInt(stepsCount.value, 10) || 16;
  const stepDuration = (quarterNoteSec * 4) / stepsCountVal;
  // determine current transport time
  const elapsed = now - startTime;
  let position = Math.floor((elapsed / stepDuration)) % stepsCountVal;
  // schedule ahead
  const lookaheadUntil = now + scheduleAhead;
  // we'll iterate steps forward and schedule any that fall before lookaheadUntil
  // compute the absolute start time of the next step
  let stepIndex = Math.floor(elapsed / stepDuration);
  let stepTime = startTime + stepIndex * stepDuration;
  while (stepTime < lookaheadUntil) {
    const s = stepIndex % stepsCountVal;
    // schedule step s at stepTime
    // play samples for tracks that have step true
    tracks.forEach(tr => {
      const soloActive = tracks.some(tt => tt.solo);
      const muted = tr.muted || (soloActive && !tr.solo);
      if (tr.steps[s] && !muted) {
        tr.plugin.play(stepTime);
      }
    });
    // metronome click
    if (metronomeEnabled.value) {
      const isDownbeat = (s === 0);
      const o = ctx.createOscillator(); o.type = 'square';
      const g = ctx.createGain(); g.gain.value = isDownbeat ? 0.02 : 0.01;
      o.connect(g); g.connect(getMasterGain());
      o.start(stepTime); o.stop(stepTime + 0.06);
    }
    stepIndex++;
    stepTime = startTime + stepIndex * stepDuration;
  }
  // update UI time display
  const totalSec = now - startTime;
  timeDisplay.value = formatTime(totalSec);
}

export async function togglePlay(isPlaying, bpm, stepsCount, timeDisplay, metronomeEnabled, tracks) {
  const ctx = getAudioContext();
  if (!isPlaying.value) {
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.error('Cannot resume audio context. Please interact with the page first.', e);
        return;
      }
    }
    isPlaying.value = true;
    startTime = ctx.currentTime + 0.05; // small offset
    schedulerInterval = setInterval(() => {
      try {
        schedule(isPlaying, tracks, bpm, stepsCount, timeDisplay, metronomeEnabled);
      } catch (e) {
        console.error('Error in scheduler:', e);
      }
    }, 50);
  } else {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isPlaying.value = false;
  }
}

export function stop(isPlaying, timeDisplay) {
  if (isPlaying.value) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isPlaying.value = false;
    timeDisplay.value = '0:00';
  }
}