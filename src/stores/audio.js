let audioCtx = null;
let masterGain = null;

// Node pools for reusing audio nodes to reduce GC pressure and improve performance
// Note: AudioScheduledSourceNodes (oscillator, bufferSource) cannot be reused once started
const nodePools = {
  gain: [],
  biquadFilter: [],
  waveShaper: [],
  dynamicsCompressor: [],
  stereoPanner: []
};

const POOL_SIZE = 50; // Maximum nodes to keep in pool

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
  stereoPanner: createNodePool('stereoPanner')
};

export function acquireNode(type) {
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