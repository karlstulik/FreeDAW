import { getAudioContext, getMasterGain, acquireNode, releaseNode } from './audio'
import { formatTime, nextStepTime } from './utils'

let startTime = 0; // when transport started
let schedulerInterval = null;
const lookahead = 0.2; // seconds - increased for better buffering
const scheduleAhead = 0.5; // seconds - increased for better buffering
// track the last absolute step index we've scheduled to avoid scheduling the same AudioSource twice
let lastScheduledIndex = -1;

export function schedule(isPlaying, tracks, bpm, stepsCount, timeDisplay, metronomeEnabled, currentStep) {
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
  currentStep.value = position;
  // schedule ahead
  const lookaheadUntil = now + scheduleAhead;
  // we'll iterate steps forward and schedule any that fall before lookaheadUntil
  // compute the absolute start time of the next step
  let stepIndex = Math.floor(elapsed / stepDuration);
  let stepTime = startTime + stepIndex * stepDuration;
  while (stepTime < lookaheadUntil) {
    const s = stepIndex % stepsCountVal;
    // only schedule this absolute step once
    if (stepIndex > lastScheduledIndex) {
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
      const o = acquireNode('oscillator');
      o.type = 'square';
      const g = acquireNode('gain');
      g.gain.value = isDownbeat ? 0.02 : 0.01;
      o.connect(g);
      g.connect(getMasterGain());
      o.start(stepTime);
      o.stop(stepTime + 0.06);

      // Schedule cleanup
      setTimeout(() => {
        // Don't release oscillator as it can't be reused
        releaseNode('gain', g);
      }, (stepTime + 0.1 - ctx.currentTime) * 1000);
    }
      // mark this absolute step as scheduled
      lastScheduledIndex = stepIndex;
    }
    stepIndex++;
    stepTime = startTime + stepIndex * stepDuration;
  }
  // update UI time display
  const totalSec = now - startTime;
  timeDisplay.value = formatTime(totalSec);
}

export async function togglePlay(isPlaying, bpm, stepsCount, timeDisplay, metronomeEnabled, tracks, currentStep) {
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
  // reset scheduled index when starting
  lastScheduledIndex = -1;
    schedulerInterval = setInterval(() => {
      try {
        schedule(isPlaying, tracks, bpm, stepsCount, timeDisplay, metronomeEnabled, currentStep);
      } catch (e) {
        console.error('Error in scheduler:', e);
      }
    }, 100); // increased from 50ms to 100ms for less CPU load
  } else {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isPlaying.value = false;
    // reset scheduled index when stopping
    lastScheduledIndex = -1;
  }
}

export function stop(isPlaying, timeDisplay, currentStep) {
  if (isPlaying.value) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isPlaying.value = false;
    timeDisplay.value = '0:00';
    currentStep.value = -1;
  }
}