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
  const safeDuration = Math.max(0.05, duration)
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
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
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

export class WhiteNoiseGeneratorPlugin extends TrackPlugin {
  static name = 'White Noise Generator'

  static presets = {
    'Pure White': {
      level: 0.8,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.7,
      hold: 0.5,
      release: 0.3,
      noiseType: 'white',
      hpFreq: 200,
      hpQ: 0.7,
      lpFreq: 16000,
      lpQ: 0.9,
      bandFreq: 4000,
      bandGain: 0,
      bandQ: 1.4,
      saturation: 0.05,
      compThreshold: -28
    },
    'Air Wash': {
      level: 0.9,
      attack: 0.02,
      decay: 0.25,
      sustain: 0.8,
      hold: 1.2,
      release: 0.6,
      noiseType: 'white',
      hpFreq: 1200,
      hpQ: 0.9,
      lpFreq: 19000,
      lpQ: 0.8,
      bandFreq: 9000,
      bandGain: 4,
      bandQ: 1.2,
      saturation: 0.08,
      compThreshold: -24
    },
    'Dark Rumble': {
      level: 0.75,
      attack: 0.03,
      decay: 0.3,
      sustain: 0.6,
      hold: 1.5,
      release: 0.7,
      noiseType: 'brown',
      hpFreq: 40,
      hpQ: 0.7,
      lpFreq: 4000,
      lpQ: 1.5,
      bandFreq: 220,
      bandGain: 6,
      bandQ: 3.5,
      saturation: 0.12,
      compThreshold: -20
    },
    'Pink Pad': {
      level: 0.85,
      attack: 0.05,
      decay: 0.4,
      sustain: 0.9,
      hold: 2,
      release: 1.1,
      noiseType: 'pink',
      hpFreq: 150,
      hpQ: 0.8,
      lpFreq: 14000,
      lpQ: 1,
      bandFreq: 2500,
      bandGain: 3,
      bandQ: 1.8,
      saturation: 0.1,
      compThreshold: -26
    },
    'Perc Burst': {
      level: 0.9,
      attack: 0.005,
      decay: 0.08,
      sustain: 0.2,
      hold: 0.08,
      release: 0.12,
      noiseType: 'white',
      hpFreq: 800,
      hpQ: 1.5,
      lpFreq: 11000,
      lpQ: 0.9,
      bandFreq: 6000,
      bandGain: 5,
      bandQ: 2.8,
      saturation: 0.2,
      compThreshold: -18
    },
    'Lo-Fi Static': {
      level: 0.7,
      attack: 0.015,
      decay: 0.18,
      sustain: 0.5,
      hold: 0.6,
      release: 0.25,
      noiseType: 'pink',
      hpFreq: 300,
      hpQ: 0.7,
      lpFreq: 8000,
      lpQ: 1.6,
      bandFreq: 3200,
      bandGain: -3,
      bandQ: 2,
      saturation: 0.18,
      compThreshold: -30
    }
  }

  constructor(track, presetName = null) {
    super(track)
    const defaultState = {
      level: 0.8,
      attack: 0.02,
      decay: 0.25,
      sustain: 0.8,
      hold: 1,
      release: 0.5,
      noiseType: 'white',
      hpFreq: 200,
      hpQ: 0.8,
      lpFreq: 16000,
      lpQ: 1,
      bandFreq: 4000,
      bandGain: 0,
      bandQ: 1.5,
      saturation: 0.08,
      compThreshold: -24
    }

    const presetState = presetName && this.constructor.presets[presetName]
      ? this.constructor.presets[presetName]
      : defaultState

    this.state = reactive({ ...presetState })
  }

  getName() {
    return WhiteNoiseGeneratorPlugin.name
  }

  play(when, duration) {
    this.track.ensureAudioNodes()
    const ctx = this.audioCtx

    const attack = clamp(this.state.attack ?? 0.02, 0, 10)
    const decay = clamp(this.state.decay ?? 0.25, 0.001, 10)
    const sustain = clamp(this.state.sustain ?? 0.8, 0, 1)
    const hold = clamp(this.state.hold ?? 1, 0, 10)
    const release = clamp(this.state.release ?? 0.5, 0.001, 10)
    const amplitude = clamp(this.state.level ?? 0.8, 0, 2)
    const sustainValue = Math.max(0.0001, sustain)

    const peakTime = when + attack
    const decayEnd = peakTime + decay
    const holdEnd = decayEnd + hold
    const playDur = duration || (attack + decay + hold + release + 0.05)

    const noiseSource = acquireNode('bufferSource')
    noiseSource.buffer = getNoiseBuffer(ctx, playDur + 0.1, this.state.noiseType || 'white')

    const envGain = acquireNode('gain')
    envGain.gain.setValueAtTime(0.0001, when)
    envGain.gain.exponentialRampToValueAtTime(1, peakTime + 0.0001)
    envGain.gain.exponentialRampToValueAtTime(sustainValue, decayEnd + 0.0001)
    if (hold > 0.0001) {
      envGain.gain.setValueAtTime(sustainValue, holdEnd)
    }
    envGain.gain.exponentialRampToValueAtTime(0.0001, holdEnd + release + 0.0001)

    noiseSource.connect(envGain)

    let lastNode = envGain

    const saturation = clamp(this.state.saturation ?? 0, 0, 1)
    let waveShaper = null
    if (saturation > 0.0001) {
      waveShaper = acquireNode('waveShaper')
      waveShaper.curve = getSaturationCurve(saturation)
      waveShaper.oversample = '4x'
      lastNode.connect(waveShaper)
      lastNode = waveShaper
    }

    const hp = acquireNode('biquadFilter')
    hp.type = 'highpass'
    hp.frequency.value = clamp(this.state.hpFreq ?? 200, 20, ctx.sampleRate * 0.5)
    hp.Q.value = clamp(this.state.hpQ ?? 0.8, 0.1, 12)
    lastNode.connect(hp)
    lastNode = hp

    let peakFilter = null
    const bandGain = clamp(this.state.bandGain ?? 0, -24, 24)
    if (Math.abs(bandGain) > 0.01) {
      peakFilter = acquireNode('biquadFilter')
      peakFilter.type = 'peaking'
      peakFilter.frequency.value = clamp(this.state.bandFreq ?? 4000, 20, ctx.sampleRate * 0.5)
      peakFilter.gain.value = bandGain
      peakFilter.Q.value = clamp(this.state.bandQ ?? 1.5, 0.1, 18)
      lastNode.connect(peakFilter)
      lastNode = peakFilter
    }

    const lp = acquireNode('biquadFilter')
    lp.type = 'lowpass'
    lp.frequency.value = clamp(this.state.lpFreq ?? 16000, 200, ctx.sampleRate * 0.5)
    lp.Q.value = clamp(this.state.lpQ ?? 1, 0.1, 12)
    lastNode.connect(lp)
    lastNode = lp

    const comp = acquireNode('dynamicsCompressor')
    comp.threshold.value = clamp(this.state.compThreshold ?? -24, -60, 0)
    comp.knee.value = 8
    comp.ratio.value = 2.5
    comp.attack.value = 0.005
    comp.release.value = 0.25
    lastNode.connect(comp)
    lastNode = comp

    const levelGain = acquireNode('gain')
    levelGain.gain.value = amplitude
    lastNode.connect(levelGain)
    levelGain.connect(this.track.gainNode)

    noiseSource.start(when)
    noiseSource.stop(when + playDur + 0.05)

    const cleanupTime = when + playDur + 0.1
    setTimeout(() => {
      releaseNode('gain', envGain)
      if (waveShaper) releaseNode('waveShaper', waveShaper)
      releaseNode('biquadFilter', hp)
      if (peakFilter) releaseNode('biquadFilter', peakFilter)
      releaseNode('biquadFilter', lp)
      releaseNode('dynamicsCompressor', comp)
      releaseNode('gain', levelGain)
    }, Math.max(0, (cleanupTime - ctx.currentTime) * 1000))
  }

  playOffline(offlineCtx, when, duration, destination = offlineCtx.destination) {
    const ctx = offlineCtx

    const attack = clamp(this.state.attack ?? 0.02, 0, 10)
    const decay = clamp(this.state.decay ?? 0.25, 0.001, 10)
    const sustain = clamp(this.state.sustain ?? 0.8, 0, 1)
    const hold = clamp(this.state.hold ?? 1, 0, 10)
    const release = clamp(this.state.release ?? 0.5, 0.001, 10)
    const amplitude = clamp(this.state.level ?? 0.8, 0, 2)
    const sustainValue = Math.max(0.0001, sustain)

    const peakTime = when + attack
    const decayEnd = peakTime + decay
    const holdEnd = decayEnd + hold
    const playDur = duration || (attack + decay + hold + release + 0.05)

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = getNoiseBuffer(ctx, playDur + 0.1, this.state.noiseType || 'white')

    const envGain = ctx.createGain()
    envGain.gain.setValueAtTime(0.0001, when)
    envGain.gain.exponentialRampToValueAtTime(1, peakTime + 0.0001)
    envGain.gain.exponentialRampToValueAtTime(sustainValue, decayEnd + 0.0001)
    if (hold > 0.0001) {
      envGain.gain.setValueAtTime(sustainValue, holdEnd)
    }
    envGain.gain.exponentialRampToValueAtTime(0.0001, holdEnd + release + 0.0001)

    noiseSource.connect(envGain)

    let lastNode = envGain

    const saturation = clamp(this.state.saturation ?? 0, 0, 1)
    if (saturation > 0.0001) {
      const waveShaper = ctx.createWaveShaper()
      waveShaper.curve = getSaturationCurve(saturation)
      waveShaper.oversample = '4x'
      lastNode.connect(waveShaper)
      lastNode = waveShaper
    }

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = clamp(this.state.hpFreq ?? 200, 20, ctx.sampleRate * 0.5)
    hp.Q.value = clamp(this.state.hpQ ?? 0.8, 0.1, 12)
    lastNode.connect(hp)
    lastNode = hp

    if (Math.abs((this.state.bandGain ?? 0)) > 0.01) {
      const peakFilter = ctx.createBiquadFilter()
      peakFilter.type = 'peaking'
      peakFilter.frequency.value = clamp(this.state.bandFreq ?? 4000, 20, ctx.sampleRate * 0.5)
      peakFilter.gain.value = clamp(this.state.bandGain ?? 0, -24, 24)
      peakFilter.Q.value = clamp(this.state.bandQ ?? 1.5, 0.1, 18)
      lastNode.connect(peakFilter)
      lastNode = peakFilter
    }

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = clamp(this.state.lpFreq ?? 16000, 200, ctx.sampleRate * 0.5)
    lp.Q.value = clamp(this.state.lpQ ?? 1, 0.1, 12)
    lastNode.connect(lp)
    lastNode = lp

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = clamp(this.state.compThreshold ?? -24, -60, 0)
    comp.knee.value = 8
    comp.ratio.value = 2.5
    comp.attack.value = 0.005
    comp.release.value = 0.25
    lastNode.connect(comp)
    lastNode = comp

    const levelGain = ctx.createGain()
    levelGain.gain.value = amplitude
    lastNode.connect(levelGain)
    levelGain.connect(destination)

    noiseSource.start(when)
    noiseSource.stop(when + playDur + 0.05)
  }
}
