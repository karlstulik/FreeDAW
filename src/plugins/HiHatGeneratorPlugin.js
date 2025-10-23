import { reactive } from 'vue'
import { TrackPlugin } from './TrackPlugin.js'
import { acquireNode, releaseNode } from '@/stores/audio'
import { clamp, getSaturationCurve } from '@/utils/audioDSP'

const NOISE_BUFFER_CACHE = new WeakMap()

function getNoiseCache(ctx) {
  if (!NOISE_BUFFER_CACHE.has(ctx)) {
    NOISE_BUFFER_CACHE.set(ctx, new Map())
  }
  return NOISE_BUFFER_CACHE.get(ctx)
}

function getNoiseBuffer(ctx, duration, type = 'white') {
  const cache = getNoiseCache(ctx)
  const safeDuration = Math.max(0.02, duration)
  const key = `${type}:${Math.round(safeDuration * 1000)}`
  if (cache.has(key)) {
    return cache.get(key)
  }

  const length = Math.max(1, Math.ceil(ctx.sampleRate * safeDuration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  } else {
    let lastOut = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + white * 0.02) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
  }

  cache.set(key, buffer)
  return buffer
}

export class HiHatGeneratorPlugin extends TrackPlugin {
  static name = 'Hi-Hat Generator';

  static presets = {
    'Closed Hat': {
      attack: 0.0008,
      decay: 0.08,
      sustain: 0.0,
      release: 0.06,
      noiseType: 'white',
      noiseLevel: 0.9,
      noiseDecay: 0.07,
      metalLevel: 0.7,
      metalDecay: 0.06,
      metalFreq: 8200,
      metalSpread: 1.5,
      hpFreq: 3000,
      bpFreq: 8000,
      bpResonance: 6,
      lpFreq: 15000,
      saturation: 0.08,
      compThreshold: -18,
      level: 0.85
    },
    'Open Hat': {
      attack: 0.001,
      decay: 0.25,
      sustain: 0.0,
      release: 0.22,
      noiseType: 'white',
      noiseLevel: 1.0,
      noiseDecay: 0.24,
      metalLevel: 0.85,
      metalDecay: 0.22,
      metalFreq: 7600,
      metalSpread: 1.4,
      hpFreq: 2500,
      bpFreq: 7500,
      bpResonance: 5,
      lpFreq: 14000,
      saturation: 0.12,
      compThreshold: -16,
      level: 0.95
    },
    'Trap Hat': {
      attack: 0.0006,
      decay: 0.06,
      sustain: 0.0,
      release: 0.05,
      noiseType: 'white',
      noiseLevel: 1.1,
      noiseDecay: 0.05,
      metalLevel: 0.5,
      metalDecay: 0.04,
      metalFreq: 9000,
      metalSpread: 1.65,
      hpFreq: 3200,
      bpFreq: 8800,
      bpResonance: 7,
      lpFreq: 16000,
      saturation: 0.16,
      compThreshold: -14,
      level: 0.9
    },
    'Analog Hat': {
      attack: 0.001,
      decay: 0.12,
      sustain: 0.0,
      release: 0.08,
      noiseType: 'pink',
      noiseLevel: 0.85,
      noiseDecay: 0.1,
      metalLevel: 0.75,
      metalDecay: 0.09,
      metalFreq: 7200,
      metalSpread: 1.45,
      hpFreq: 2600,
      bpFreq: 7200,
      bpResonance: 5.5,
      lpFreq: 13000,
      saturation: 0.18,
      compThreshold: -18,
      level: 0.88
    },
    'Lo-Fi Hat': {
      attack: 0.0015,
      decay: 0.15,
      sustain: 0.0,
      release: 0.12,
      noiseType: 'pink',
      noiseLevel: 0.7,
      noiseDecay: 0.12,
      metalLevel: 0.4,
      metalDecay: 0.1,
      metalFreq: 6400,
      metalSpread: 1.3,
      hpFreq: 2200,
      bpFreq: 6400,
      bpResonance: 4,
      lpFreq: 10000,
      saturation: 0.22,
      compThreshold: -20,
      level: 0.8
    },
    'Bright Hat': {
      attack: 0.0008,
      decay: 0.11,
      sustain: 0.0,
      release: 0.09,
      noiseType: 'white',
      noiseLevel: 1.05,
      noiseDecay: 0.09,
      metalLevel: 0.85,
      metalDecay: 0.08,
      metalFreq: 8800,
      metalSpread: 1.55,
      hpFreq: 3000,
      bpFreq: 8200,
      bpResonance: 6.5,
      lpFreq: 17000,
      saturation: 0.12,
      compThreshold: -15,
      level: 0.95
    },
    '808 Hat': {
      attack: 0.0007,
      decay: 0.09,
      sustain: 0.0,
      release: 0.07,
      noiseType: 'white',
      noiseLevel: 0.95,
      noiseDecay: 0.08,
      metalLevel: 0.7,
      metalDecay: 0.07,
      metalFreq: 7800,
      metalSpread: 1.48,
      hpFreq: 3200,
      bpFreq: 7800,
      bpResonance: 6,
      lpFreq: 15000,
      saturation: 0.14,
      compThreshold: -17,
      level: 0.9
    },
    '909 Hat': {
      attack: 0.001,
      decay: 0.14,
      sustain: 0.0,
      release: 0.1,
      noiseType: 'white',
      noiseLevel: 1.0,
      noiseDecay: 0.12,
      metalLevel: 0.9,
      metalDecay: 0.11,
      metalFreq: 8400,
      metalSpread: 1.52,
      hpFreq: 3100,
      bpFreq: 8400,
      bpResonance: 6.2,
      lpFreq: 15500,
      saturation: 0.18,
      compThreshold: -16,
      level: 0.98
    },
    'Shimmer Hat': {
      attack: 0.0012,
      decay: 0.2,
      sustain: 0.0,
      release: 0.18,
      noiseType: 'white',
      noiseLevel: 0.8,
      noiseDecay: 0.18,
      metalLevel: 0.95,
      metalDecay: 0.17,
      metalFreq: 8900,
      metalSpread: 1.3,
      hpFreq: 2600,
      bpFreq: 9000,
      bpResonance: 4.5,
      lpFreq: 17000,
      saturation: 0.1,
      compThreshold: -18,
      level: 0.92
    },
    'Chopped Hat': {
      attack: 0.0005,
      decay: 0.05,
      sustain: 0.0,
      release: 0.04,
      noiseType: 'white',
      noiseLevel: 1.1,
      noiseDecay: 0.045,
      metalLevel: 0.55,
      metalDecay: 0.04,
      metalFreq: 9200,
      metalSpread: 1.7,
      hpFreq: 3500,
      bpFreq: 9000,
      bpResonance: 7,
      lpFreq: 18000,
      saturation: 0.2,
      compThreshold: -14,
      level: 0.88
    }
  };

  constructor(track, presetName = null) {
    super(track);
    const defaultState = {
      attack: 0.0008,
      decay: 0.1,
      sustain: 0.0,
      release: 0.08,
      noiseType: 'white',
      noiseLevel: 0.95,
      noiseDecay: 0.09,
      metalLevel: 0.8,
      metalDecay: 0.08,
      metalFreq: 8200,
      metalSpread: 1.5,
      hpFreq: 3000,
      bpFreq: 7800,
      bpResonance: 6,
      lpFreq: 15000,
      saturation: 0.12,
      compThreshold: -17,
      level: 0.9
    };

    const presetState = presetName && this.constructor.presets[presetName]
      ? this.constructor.presets[presetName]
      : defaultState;

    this.state = reactive({ ...presetState });
  }

  getName() {
    return HiHatGeneratorPlugin.name;
  }

  buildNoise(ctx, when, playDur, attack, decay, sustain, release, level) {
    const noiseSource = acquireNode('bufferSource')
    noiseSource.buffer = getNoiseBuffer(ctx, playDur + 0.05, this.state.noiseType || 'white')
    const noiseGain = acquireNode('gain')
    noiseGain.gain.setValueAtTime(0.0001, when)
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), when + attack + 0.0001)
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level * sustain), when + attack + decay + 0.0001)
    const releaseStart = when + playDur - release
    if (releaseStart > when + attack + decay) {
      noiseGain.gain.setValueAtTime(Math.max(0.0001, level * sustain), releaseStart)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release + 0.0001)
    } else {
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001)
    }
    noiseSource.connect(noiseGain)
    return { noiseSource, noiseGain }
  }

  buildMetalPartials(ctx, when, playDur, attack, decay, sustain, release, level) {
    const partialRatios = [1, 1.447, 1.95, 2.63]
    const metalGain = acquireNode('gain')
    metalGain.gain.setValueAtTime(0.0001, when)
    metalGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), when + attack + 0.0001)
    metalGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level * sustain), when + attack + decay + 0.0001)
    const releaseStart = when + playDur - release
    if (releaseStart > when + attack + decay) {
      metalGain.gain.setValueAtTime(Math.max(0.0001, level * sustain), releaseStart)
      metalGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release + 0.0001)
    } else {
      metalGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001)
    }

    const baseFreq = clamp(this.state.metalFreq ?? 8200, 2000, 18000)
    const spread = clamp(this.state.metalSpread ?? 1.5, 1, 2.5)
    const partialGains = []
    const oscillators = []
    const mix = Math.max(0.0001, level)
    const perPartial = mix / partialRatios.length

    partialRatios.forEach((ratio, idx) => {
      const osc = acquireNode('oscillator')
      osc.type = 'square'
      const freq = clamp(baseFreq * Math.pow(spread, idx) * ratio, 1000, 20000)
      osc.frequency.setValueAtTime(freq, when)
      const gain = acquireNode('gain')
      gain.gain.setValueAtTime(perPartial, when)
      osc.connect(gain)
      gain.connect(metalGain)
      oscillators.push(osc)
      partialGains.push(gain)
    })

    return { metalGain, oscillators, partialGains }
  }

  play(when, duration) {
    this.track.ensureAudioNodes()
    const ctx = this.audioCtx

    const attack = clamp(this.state.attack ?? 0.0008, 0, 0.02)
    const decay = clamp(this.state.decay ?? 0.1, 0.01, 1)
    const sustain = clamp(this.state.sustain ?? 0, 0, 1)
    const release = clamp(this.state.release ?? 0.08, 0.01, 1)
    const noiseDecay = clamp(this.state.noiseDecay ?? decay, 0.01, 1)
    const metalDecay = clamp(this.state.metalDecay ?? decay, 0.01, 1)
    const playDur = duration || Math.max(noiseDecay, metalDecay) + release + 0.05

    const noiseLevel = clamp(this.state.noiseLevel ?? 1, 0, 2)
    const metalLevel = clamp(this.state.metalLevel ?? 0.8, 0, 1.5)

    const { noiseSource, noiseGain } = this.buildNoise(ctx, when, playDur, attack, noiseDecay, sustain, release, noiseLevel)
    const { metalGain, oscillators, partialGains } = this.buildMetalPartials(ctx, when, playDur, attack, metalDecay, sustain, release, metalLevel)

    const mixGain = acquireNode('gain')
    mixGain.gain.value = 1
    noiseGain.connect(mixGain)
    metalGain.connect(mixGain)

    let lastNode = mixGain

    let waveShaper = null
    const saturation = clamp(this.state.saturation ?? 0, 0, 1)
    if (saturation > 0.0001) {
      waveShaper = acquireNode('waveShaper')
      waveShaper.curve = getSaturationCurve(saturation)
      waveShaper.oversample = '4x'
      lastNode.connect(waveShaper)
      lastNode = waveShaper
    }

    const hp = acquireNode('biquadFilter')
    hp.type = 'highpass'
    hp.frequency.value = clamp(this.state.hpFreq ?? 3000, 500, 8000)
    hp.Q.value = 0.707
    lastNode.connect(hp)
    lastNode = hp

    const bp = acquireNode('biquadFilter')
    bp.type = 'bandpass'
    bp.frequency.value = clamp(this.state.bpFreq ?? 7800, 1000, 16000)
    bp.Q.value = clamp(this.state.bpResonance ?? 6, 0.1, 20)
    lastNode.connect(bp)
    lastNode = bp

    const lp = acquireNode('biquadFilter')
    lp.type = 'lowpass'
    lp.frequency.value = clamp(this.state.lpFreq ?? 15000, 2000, 20000)
    lp.Q.value = 0.707
    lastNode.connect(lp)
    lastNode = lp

    const comp = acquireNode('dynamicsCompressor')
    comp.threshold.value = clamp(this.state.compThreshold ?? -17, -60, 0)
    comp.knee.value = 10
    comp.ratio.value = 3
    comp.attack.value = 0.002
    comp.release.value = 0.15
    lastNode.connect(comp)
    lastNode = comp

    const levelGain = acquireNode('gain')
    const level = clamp(this.state.level ?? 1, 0, 2)
    levelGain.gain.value = level * 1.1
    lastNode.connect(levelGain)
    levelGain.connect(this.track.gainNode)

    noiseSource.start(when)
    noiseSource.stop(when + playDur + 0.05)

    oscillators.forEach(osc => {
      if (!osc._hasStarted) {
        osc._hasStarted = true
        osc.start(when)
        osc.stop(when + playDur + 0.05)
      }
    })

    const cleanupTime = when + playDur + 0.1
    setTimeout(() => {
      releaseNode('gain', noiseGain)
      releaseNode('gain', metalGain)
      releaseNode('gain', mixGain)
      partialGains.forEach(g => releaseNode('gain', g))
      if (waveShaper) releaseNode('waveShaper', waveShaper)
      releaseNode('biquadFilter', hp)
      releaseNode('biquadFilter', bp)
      releaseNode('biquadFilter', lp)
      releaseNode('dynamicsCompressor', comp)
      releaseNode('gain', levelGain)
    }, Math.max(0, (cleanupTime - ctx.currentTime) * 1000))
  }

  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    const ctx = offlineCtx

    const attack = clamp(this.state.attack ?? 0.0008, 0, 0.02)
    const decay = clamp(this.state.decay ?? 0.1, 0.01, 1)
    const sustain = clamp(this.state.sustain ?? 0, 0, 1)
    const release = clamp(this.state.release ?? 0.08, 0.01, 1)
    const noiseDecay = clamp(this.state.noiseDecay ?? decay, 0.01, 1)
    const metalDecay = clamp(this.state.metalDecay ?? decay, 0.01, 1)
    const playDur = duration || Math.max(noiseDecay, metalDecay) + release + 0.05

    const noiseLevel = clamp(this.state.noiseLevel ?? 1, 0, 2)
    const metalLevel = clamp(this.state.metalLevel ?? 0.8, 0, 1.5)

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = getNoiseBuffer(ctx, playDur + 0.05, this.state.noiseType || 'white')
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.0001, when)
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, noiseLevel), when + attack + 0.0001)
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, noiseLevel * sustain), when + attack + noiseDecay + 0.0001)
    const noiseReleaseStart = when + playDur - release
    if (noiseReleaseStart > when + attack + noiseDecay) {
      noiseGain.gain.setValueAtTime(Math.max(0.0001, noiseLevel * sustain), noiseReleaseStart)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, noiseReleaseStart + release + 0.0001)
    } else {
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001)
    }
    noiseSource.connect(noiseGain)

    const metalGain = ctx.createGain()
    metalGain.gain.setValueAtTime(0.0001, when)
    metalGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, metalLevel), when + attack + 0.0001)
    metalGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, metalLevel * sustain), when + attack + metalDecay + 0.0001)
    const metalReleaseStart = when + playDur - release
    if (metalReleaseStart > when + attack + metalDecay) {
      metalGain.gain.setValueAtTime(Math.max(0.0001, metalLevel * sustain), metalReleaseStart)
      metalGain.gain.exponentialRampToValueAtTime(0.0001, metalReleaseStart + release + 0.0001)
    } else {
      metalGain.gain.exponentialRampToValueAtTime(0.0001, when + playDur + 0.0001)
    }

    const partialRatios = [1, 1.447, 1.95, 2.63]
    const baseFreq = clamp(this.state.metalFreq ?? 8200, 2000, 18000)
    const spread = clamp(this.state.metalSpread ?? 1.5, 1, 2.5)
    const mix = Math.max(0.0001, metalLevel)
    const perPartial = mix / partialRatios.length

    partialRatios.forEach((ratio, idx) => {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      const freq = clamp(baseFreq * Math.pow(spread, idx) * ratio, 1000, 20000)
      osc.frequency.setValueAtTime(freq, when)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(perPartial, when)
      osc.connect(gain)
      gain.connect(metalGain)
      osc.start(when)
      osc.stop(when + playDur + 0.05)
    })

    const mixGain = ctx.createGain()
    mixGain.gain.value = 1
    noiseGain.connect(mixGain)
    metalGain.connect(mixGain)

    let lastNode = mixGain

    if (clamp(this.state.saturation ?? 0, 0, 1) > 0.0001) {
      const waveShaper = ctx.createWaveShaper()
      waveShaper.curve = getSaturationCurve(this.state.saturation)
      waveShaper.oversample = '4x'
      lastNode.connect(waveShaper)
      lastNode = waveShaper
    }

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = clamp(this.state.hpFreq ?? 3000, 500, 8000)
    hp.Q.value = 0.707
    lastNode.connect(hp)
    lastNode = hp

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = clamp(this.state.bpFreq ?? 7800, 1000, 16000)
    bp.Q.value = clamp(this.state.bpResonance ?? 6, 0.1, 20)
    lastNode.connect(bp)
    lastNode = bp

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = clamp(this.state.lpFreq ?? 15000, 2000, 20000)
    lp.Q.value = 0.707
    lastNode.connect(lp)
    lastNode = lp

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = clamp(this.state.compThreshold ?? -17, -60, 0)
    comp.knee.value = 10
    comp.ratio.value = 3
    comp.attack.value = 0.002
    comp.release.value = 0.15
    lastNode.connect(comp)
    lastNode = comp

    const levelGain = ctx.createGain()
    const level = clamp(this.state.level ?? 1, 0, 2)
    levelGain.gain.value = level * 1.1
    lastNode.connect(levelGain)
    levelGain.connect(destination)

    noiseSource.start(when)
    noiseSource.stop(when + playDur + 0.05)
  }
}
