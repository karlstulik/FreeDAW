let audioCtx = null;
let masterGain = null;
let masterDCFilter = null;
let masterCompressor = null;
let masterLimiter = null;
let masterAnalyser = null;

const MASTER_RAMP_TIME = 0.01; // smoothing window for gain changes

// Node pools for reusing audio nodes to reduce GC pressure and improve performance
// Note: AudioScheduledSourceNodes (oscillator, bufferSource) cannot be reused once started
const nodePools = {
  gain: [],
  biquadFilter: [],
  waveShaper: [],
  dynamicsCompressor: [],
  stereoPanner: [],
  delay: []
};

const POOL_SIZE = 50; // Maximum nodes to keep in pool
const MASTER_DEFAULT_GAIN = 0.9;

function configureMasterChain(ctx) {
  if (masterGain) return;

  masterGain = ctx.createGain();
  masterGain.gain.value = MASTER_DEFAULT_GAIN;

  masterDCFilter = ctx.createBiquadFilter();
  masterDCFilter.type = 'highpass';
  masterDCFilter.frequency.value = 8; // remove DC offset and subsonic rumble
  masterDCFilter.Q.value = Math.SQRT1_2;

  masterCompressor = ctx.createDynamicsCompressor();
  masterCompressor.threshold.value = -12;
  masterCompressor.knee.value = 8;
  masterCompressor.ratio.value = 3;
  masterCompressor.attack.value = 0.003;
  masterCompressor.release.value = 0.12;

  masterLimiter = ctx.createDynamicsCompressor();
  masterLimiter.threshold.value = -0.5;
  masterLimiter.knee.value = 0;
  masterLimiter.ratio.value = 20;
  masterLimiter.attack.value = 0.001;
  masterLimiter.release.value = 0.05;

  // Makeup gain to bring normalized signal back to optimal level
  const makeupGain = ctx.createGain();
  makeupGain.gain.value = 1.2; // Compensate for compression/limiting

  masterAnalyser = ctx.createAnalyser();
  masterAnalyser.fftSize = 2048;
  masterAnalyser.smoothingTimeConstant = 0.8;

  masterGain.connect(masterDCFilter);
  masterDCFilter.connect(masterCompressor);
  masterCompressor.connect(makeupGain);
  makeupGain.connect(masterLimiter);
  masterLimiter.connect(masterAnalyser);
  masterAnalyser.connect(ctx.destination);
}

function createNodePool(type) {
  return {
    acquire: () => {
      const pool = nodePools[type];
      if (pool.length > 0) {
        return pool.pop();
      }
      return null; // Pool empty, caller should create new
    },
    release: (node) => {
      const pool = nodePools[type];
      if (pool.length < POOL_SIZE) {
        // Reset node to default state
        try {
          switch (type) {
            case 'gain':
              node.gain.value = 1;
              break;
            case 'biquadFilter':
              node.frequency.value = 1000;
              node.Q.value = 1;
              node.gain.value = 0;
              node.type = 'lowpass';
              break;
            case 'waveShaper':
              node.curve = null;
              node.oversample = 'none';
              break;
            case 'dynamicsCompressor':
              node.threshold.value = -24;
              node.knee.value = 30;
              node.ratio.value = 12;
              node.attack.value = 0.003;
              node.release.value = 0.25;
              break;
            case 'stereoPanner':
              node.pan.value = 0;
              break;
            case 'delay':
              node.delayTime.value = 0;
              break;
          }
          // Disconnect from all destinations
          if (node.disconnect) {
            try {
              node.disconnect();
            } catch (e) {
              // Ignore disconnect errors
            }
          }
          pool.push(node);
        } catch (e) {
          // If reset fails, don't add to pool
        }
      }
    }
  };
}

const pools = {
  gain: createNodePool('gain'),
  biquadFilter: createNodePool('biquadFilter'),
  waveShaper: createNodePool('waveShaper'),
  dynamicsCompressor: createNodePool('dynamicsCompressor'),
  stereoPanner: createNodePool('stereoPanner'),
  delay: createNodePool('delay')
};

export function acquireNode(type, maxDelayTime = 1) {
  if (!audioCtx) getAudioContext();
  const pool = pools[type];
  if (pool && pool.acquire) {
    const node = pool.acquire();
    if (node) return node;
  }

  // For AudioScheduledSourceNodes (oscillator, bufferSource) do NOT pool them - always create new
  switch (type) {
    case 'gain': return audioCtx.createGain();
    case 'biquadFilter': return audioCtx.createBiquadFilter();
    case 'waveShaper': return audioCtx.createWaveShaper();
    case 'dynamicsCompressor': return audioCtx.createDynamicsCompressor();
    case 'stereoPanner': return audioCtx.createStereoPanner();
    case 'delay': return audioCtx.createDelay(maxDelayTime);
    case 'oscillator': return audioCtx.createOscillator();
    case 'bufferSource': return audioCtx.createBufferSource();
    default: throw new Error(`Unknown node type: ${type}`);
  }
}

export function releaseNode(type, node) {
  // Only release reusable nodes, not AudioScheduledSourceNodes
  if (type === 'oscillator' || type === 'bufferSource') {
    return; // Don't pool these, they can't be reused
  }
  pools[type].release(node);
}

export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    configureMasterChain(audioCtx);
  }
  return audioCtx;
}

export function getMasterGain() {
  if (!masterGain) {
    getAudioContext(); // Ensure context is created
  }
  return masterGain;
}

export function getMasterAnalyser() {
  if (!masterAnalyser) {
    getAudioContext();
  }
  return masterAnalyser;
}

export function updateMasterVolume(volume) {
  if (!audioCtx) {
    getAudioContext();
  }
  if (!masterGain || !audioCtx) return;

  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setTargetAtTime(volume, now, MASTER_RAMP_TIME);
}