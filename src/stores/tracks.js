import { reactive } from 'vue'
import { TrackPlugin, FileLoaderPlugin, ToneGeneratorPlugin, KickGeneratorPlugin, BassGeneratorPlugin, ClapGeneratorPlugin, SnareGeneratorPlugin, HiHatGeneratorPlugin, WhiteNoiseGeneratorPlugin } from '@/plugins/dawPlugins'
import { makeId } from './utils'
import { getAudioContext, getMasterGain, acquireNode, releaseNode } from './audio'
import { clamp, getSaturationCurve } from '@/utils/audioDSP'

export const pluginTypes = {
  'file-loader': FileLoaderPlugin,
  'tone-generator': ToneGeneratorPlugin,
  'kick-generator': KickGeneratorPlugin,
  'bass-generator': BassGeneratorPlugin,
  'clap-generator': ClapGeneratorPlugin,
  'snare-generator': SnareGeneratorPlugin,
  'hihat-generator': HiHatGeneratorPlugin,
  'white-noise-generator': WhiteNoiseGeneratorPlugin
};

export const pluginIcons = {
  'file-loader': 'mdi-file-music',
  'tone-generator': 'mdi-waveform',
  'kick-generator': 'mdi-kickstarter',
  'bass-generator': 'mdi-speaker-wireless',
  'clap-generator': 'mdi-hand-clap',
  'snare-generator': 'mdi-music-note',
  'hihat-generator': 'mdi-music-note-sixteenth',
  'white-noise-generator': 'mdi-weather-windy'
};

export function createTrack(tracks, stepsCount, name, pluginType = 'file-loader') {
  const id = makeId();

  const track = reactive({
    id,
    name: '', // Will be set after
    plugin: null, // Will be set after creation
    pluginType,
    icon: pluginIcons[pluginType] || 'mdi-music-note',
    steps: [],
    gainNode: null, // Lazy initialization
    panNode: null, // Lazy initialization
    muted: false,
    solo: false,
    volume: 1,
    pan: 0,
    level: 0, // For meter display
    effects: [], // Array of effect objects
    meterGainNode: null,
    meterAnalyser: null,
    meterData: null,
    get audioCtx() { return getAudioContext(); },
    ensureAudioNodes() {
      if (!this.gainNode) {
        const ctx = this.audioCtx;
        this.gainNode = acquireNode('gain');
        this.gainNode.gain.value = this.volume;
        this.panNode = acquireNode('stereoPanner');
        this.panNode.pan.value = this.pan;
        this.ensureMeterNodes();
        this.updateEffectsChain();
      }
    },
    ensureMeterNodes() {
      if (!this.meterGainNode) {
        this.meterGainNode = acquireNode('gain');
        this.meterGainNode.gain.value = 1;
      }
      if (!this.meterAnalyser) {
        this.meterAnalyser = acquireNode('analyser');
        this.meterAnalyser.fftSize = 256;
        this.meterAnalyser.minDecibels = -100;
        this.meterAnalyser.maxDecibels = -10;
        this.meterAnalyser.smoothingTimeConstant = 0.75;
        this.meterData = new Float32Array(this.meterAnalyser.fftSize);
      }
    },
    updateEffectsChain() {
      if (!this.gainNode || !this.panNode) return;
      this.ensureMeterNodes();
      // Disconnect gainNode from everything
      this.gainNode.disconnect();
      // Disconnect panNode from masterGain temporarily
      this.panNode.disconnect();
      if (this.meterGainNode) {
        try {
          this.meterGainNode.disconnect();
        } catch (e) {
          // ignore
        }
      }
      if (this.meterAnalyser) {
        try {
          this.meterAnalyser.disconnect();
        } catch (e) {
          // ignore
        }
      }
      // Start chain from gainNode
      let current = this.gainNode;
      for (let effect of this.effects) {
        if (effect.type === 'gain') {
          if (!effect.node) {
            effect.node = acquireNode('gain');
          }
          const gainValue = clamp(effect.value ?? 1, 0, 4);
          effect.node.gain.value = gainValue;
          current.connect(effect.node);
          current = effect.node;
        } else if (effect.type === 'flanger') {
          const rate = clamp(effect.rate ?? 0.5, 0.01, 8);
          const depth = clamp(effect.depth ?? 0.5, 0, 1);
          const baseDelay = clamp(effect.delay ?? 0.005, 0.0005, 0.02);
          const feedback = clamp(effect.feedback ?? 0.3, 0, 0.85);
          const flangerMix = clamp(effect.mix ?? 0.5, 0, 1);

          if (!effect.delayNode) {
            effect.delayNode = acquireNode('delay', 0.02);
            effect.feedbackGain = acquireNode('gain');
            effect.lfoOsc = acquireNode('oscillator');
            effect.lfoGain = acquireNode('gain');
            effect.dryGain = acquireNode('gain');
            effect.wetGain = acquireNode('gain');
            effect.finalMixer = acquireNode('gain');

            // Set up LFO
            effect.lfoOsc.type = 'sine';
            effect.lfoOsc.frequency.value = rate;
            effect.lfoGain.gain.value = depth * 0.005; // Modulate delay time
            effect.lfoOsc.connect(effect.lfoGain);
            effect.lfoGain.connect(effect.delayNode.delayTime);

            // Feedback loop
            effect.delayNode.connect(effect.feedbackGain);
            effect.feedbackGain.connect(effect.delayNode);

            // Start LFO
            effect.lfoOsc.start();
          }

          // Update parameters
          effect.lfoOsc.frequency.value = rate;
          effect.lfoGain.gain.value = depth * 0.005;
          effect.delayNode.delayTime.value = baseDelay;
          effect.feedbackGain.gain.value = feedback;
          effect.dryGain.gain.value = 1 - flangerMix;
          effect.wetGain.gain.value = flangerMix;

          // Connect the chain: input -> dry + (input -> delay -> wet) -> mixer
          current.connect(effect.dryGain);
          current.connect(effect.delayNode);
          effect.delayNode.connect(effect.wetGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'reverb') {
            const reverbMix = clamp(effect.mix ?? 0.25, 0, 1);
            const preDelay = clamp(effect.preDelay ?? 0.02, 0, 0.2);
            const dampingFreq = clamp(effect.damping ?? 3000, 500, 16000);
            const decayTime = Math.max(0.1, effect.decay ?? 1.5);

            if (!effect.preDelayNode) {
            effect.preDelayNode = acquireNode('delay', 0.2); // Max pre-delay of 200ms
            effect.inputGain = acquireNode('gain');
            effect.outputGain = acquireNode('gain');
            effect.dryGain = acquireNode('gain');
            effect.wetGain = acquireNode('gain');
            effect.finalMixer = acquireNode('gain');

            // Create multiple delay lines for reverb (improved Schroeder reverb)
            effect.delays = [];
            effect.delayGains = [];
            effect.filters = [];

            // More delay lines for better diffusion
            const delayTimes = [0.0297, 0.0371, 0.0419, 0.0437, 0.0483, 0.0527]; // in seconds
            const delayGains = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2];

            for (let i = 0; i < delayTimes.length; i++) {
              const delay = acquireNode('delay', 0.1);
              const gain = acquireNode('gain');
              const filter = acquireNode('biquadFilter');

              delay.delayTime.value = delayTimes[i];
              gain.gain.value = delayGains[i];
              filter.type = 'lowpass';
              filter.frequency.value = 4000; // Default damping frequency
              filter.Q.value = 1;

              effect.delays.push(delay);
              effect.delayGains.push(gain);
              effect.filters.push(filter);
            }

            // Connect reverb network with better diffusion
            effect.inputGain.connect(effect.preDelayNode);
            for (let i = 0; i < effect.delays.length; i++) {
              effect.preDelayNode.connect(effect.delays[i]);
              effect.delays[i].connect(effect.filters[i]);
              effect.filters[i].connect(effect.delayGains[i]);
              effect.delayGains[i].connect(effect.outputGain);
              
              // Add cross-feedback for better diffusion
              if (i < effect.delays.length - 1) {
                effect.delayGains[i].connect(effect.delays[(i + 1) % effect.delays.length]);
              }
            }
          }

          effect.preDelayNode.delayTime.value = preDelay;
          effect.dryGain.gain.value = 1 - reverbMix;
          effect.wetGain.gain.value = reverbMix;

          effect.filters.forEach(filter => {
            filter.frequency.value = dampingFreq;
          });

          const delayTimes = [0.0297, 0.0371, 0.0419, 0.0437, 0.0483, 0.0527];
          const baseGains = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2];
          for (let i = 0; i < effect.delayGains.length; i++) {
            const decayFactor = Math.pow(0.001, delayTimes[i] / decayTime);
            effect.delayGains[i].gain.value = baseGains[i] * decayFactor;
          }

          current.connect(effect.dryGain);
          current.connect(effect.inputGain);
          effect.outputGain.connect(effect.wetGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'delay') {
          // Create delay nodes if they don't exist
          const time = clamp(effect.time ?? 0.2, 0.001, 2);
          const feedback = clamp(effect.feedback ?? 0.15, 0, 0.6);
          const damping = clamp(effect.damping ?? 5000, 500, 16000);
          const delayMix = clamp(effect.mix ?? 0.3, 0, 1);

          if (!effect.delayNode) {
            effect.delayNode = acquireNode('delay', 2.0); // Max delay of 2 seconds
            effect.feedbackGain = acquireNode('gain');
            effect.dryGain = acquireNode('gain');
            effect.wetGain = acquireNode('gain');
            effect.finalMixer = acquireNode('gain');
            effect.filterNode = acquireNode('biquadFilter'); // For high-frequency damping

            // Set up filter for damping
            effect.filterNode.type = 'lowpass';
            effect.filterNode.frequency.value = 5000; // Default cutoff
            effect.filterNode.Q.value = 1;

            // Start with feedback at 0 to prevent initial runaway
            effect.feedbackGain.gain.value = 0;

            // Feedback loop with filtering
            effect.delayNode.connect(effect.filterNode);
            effect.filterNode.connect(effect.feedbackGain);
            effect.feedbackGain.connect(effect.delayNode);
          }

          effect.delayNode.delayTime.value = time;
          effect.feedbackGain.gain.value = feedback;
          effect.filterNode.frequency.value = damping;

          effect.dryGain.gain.value = 1 - delayMix;
          effect.wetGain.gain.value = delayMix;

          // Connect the chain: input -> dry + (input -> delay -> wet) -> mixer
          current.connect(effect.dryGain);
          current.connect(effect.delayNode);
          effect.delayNode.connect(effect.wetGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'distortion') {
          // Create distortion nodes if they don't exist
          if (!effect.waveShaper) {
            effect.waveShaper = acquireNode('waveShaper');
            effect.inputGain = acquireNode('gain');
            effect.outputGain = acquireNode('gain');
            effect.dryGain = acquireNode('gain');
            effect.wetGain = acquireNode('gain');
            effect.finalMixer = acquireNode('gain');

            // Set up waveshaper for distortion
            effect.waveShaper.oversample = '4x';
          } else {
            // Update waveshaper curve
            const amount = Math.min(1, effect.amount || 0.5);
            const samples = 1024;
            const curve = new Float32Array(samples);
            const k = amount * 100; // Drive amount
            for (let i = 0; i < samples; i++) {
              const x = (i * 2) / samples - 1;
              curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
            }
            effect.waveShaper.curve = curve;
          }

          // Update parameters
          effect.inputGain.gain.value = effect.drive || 1;
          effect.outputGain.gain.value = 1 / (effect.drive || 1); // Normalize output
          effect.dryGain.gain.value = 1 - (effect.mix || 0.5);
          effect.wetGain.gain.value = effect.mix || 0.5;

          // Connect the chain: input -> drive -> waveshaper -> normalize -> wet/dry -> mixer
          current.connect(effect.inputGain);
          effect.inputGain.connect(effect.waveShaper);
          effect.waveShaper.connect(effect.outputGain);
          effect.outputGain.connect(effect.wetGain);
          current.connect(effect.dryGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'chorus') {
          // Create chorus nodes if they don't exist
          const chorusRate = clamp(effect.rate ?? 0.3, 0.05, 5);
          const chorusDepth = clamp(effect.depth ?? 0.005, 0, 0.02);
          const chorusDelay = clamp(effect.delay ?? 0.01, 0.001, 0.05);
          const chorusMix = clamp(effect.mix ?? 0.5, 0, 1);

          if (!effect.delays) {
            effect.delays = [];
            effect.delayGains = [];
            effect.lfoOscs = [];
            effect.lfoGains = [];
            effect.dryGain = acquireNode('gain');
            effect.wetGain = acquireNode('gain');
            effect.finalMixer = acquireNode('gain');

            // Create 3 delay lines for chorus
            for (let i = 0; i < 3; i++) {
              const delay = acquireNode('delay', 0.05); // Max delay of 50ms
              const gain = acquireNode('gain');
              const lfoOsc = acquireNode('oscillator');
              const lfoGain = acquireNode('gain');

              // Set up LFO
              lfoOsc.type = 'sine';
              lfoOsc.frequency.value = chorusRate;
              lfoGain.gain.value = chorusDepth * (i + 1) * 0.5; // Different depths for each line
              lfoOsc.connect(lfoGain);
              lfoGain.connect(delay.delayTime);

              // Set base delay time with slight variation
              delay.delayTime.value = chorusDelay + i * 0.002;
              gain.gain.value = 1 / 3; // Equal mix of all lines

              effect.delays.push(delay);
              effect.delayGains.push(gain);
              effect.lfoOscs.push(lfoOsc);
              effect.lfoGains.push(lfoGain);

              // Start LFOs
              lfoOsc.start();
            }
          } else {
            // Update parameters
            effect.delays.forEach((delay, i) => {
              delay.delayTime.value = chorusDelay + i * 0.002;
              effect.lfoOscs[i].frequency.value = chorusRate;
              effect.lfoGains[i].gain.value = chorusDepth * (i + 1) * 0.5;
            });
          }

          // Update mix
          effect.dryGain.gain.value = 1 - chorusMix;
          effect.wetGain.gain.value = chorusMix;

          // Connect the chain: input -> dry + (input -> delays -> wet) -> mixer
          current.connect(effect.dryGain);
          effect.delays.forEach((delay, i) => {
            current.connect(delay);
            delay.connect(effect.delayGains[i]);
            effect.delayGains[i].connect(effect.wetGain);
          });
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'phaser') {
          // Create phaser nodes if they don't exist
          const phaserRate = clamp(effect.rate ?? 0.5, 0.05, 8);
          const phaserDepth = clamp(effect.depth ?? 0.5, 0, 1);
          const phaserFrequency = clamp(effect.frequency ?? 1000, 50, 8000);
          const phaserMix = clamp(effect.mix ?? 0.5, 0, 1);

          if (!effect.filters) {
            effect.filters = [];
            effect.phaseDelays = []; // Store delay nodes for cleanup
            effect.lfoOsc = acquireNode('oscillator');
            effect.lfoGain = acquireNode('gain');
            effect.dryGain = acquireNode('gain');
            effect.wetGain = acquireNode('gain');
            effect.finalMixer = acquireNode('gain');

            // Set up LFO
            effect.lfoOsc.type = 'sine';
            effect.lfoOsc.frequency.value = phaserRate;
            effect.lfoGain.gain.value = phaserDepth;
            effect.lfoOsc.connect(effect.lfoGain);

            // Create 4-6 all-pass filters for phaser
            const numFilters = 6;
            for (let i = 0; i < numFilters; i++) {
              const filter = acquireNode('biquadFilter');
              filter.type = 'allpass';
              filter.frequency.value = phaserFrequency + i * 500;
              filter.Q.value = 1;
              effect.filters.push(filter);
            }

            // Connect LFO to filter frequencies with phase offsets
            effect.lfoGain.connect(effect.filters[0].frequency);
            for (let i = 1; i < effect.filters.length; i++) {
              effect.filters[i-1].connect(effect.filters[i]);
              // Create phase offset delay
              const phaseDelay = acquireNode('delay', 0.01); // Small delay for phase offset
              effect.phaseDelays.push(phaseDelay);
              effect.lfoGain.connect(phaseDelay);
              phaseDelay.connect(effect.filters[i].frequency);
            }

            // Start LFO
            effect.lfoOsc.start();
          } else {
            // Update parameters
            effect.lfoOsc.frequency.value = phaserRate;
            effect.lfoGain.gain.value = phaserDepth;

            effect.filters.forEach((filter, i) => {
              filter.frequency.value = phaserFrequency + i * 500; // Spread frequencies
            });
          }

          // Update mix
          effect.dryGain.gain.value = 1 - phaserMix;
          effect.wetGain.gain.value = phaserMix;

          // Connect the chain: input -> dry + (input -> filters -> wet) -> mixer
          current.connect(effect.dryGain);
          current.connect(effect.filters[0]);
          effect.filters[effect.filters.length - 1].connect(effect.wetGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'eq') {
          // Create EQ nodes if they don't exist
          const lowGain = clamp(effect.lowGain ?? 0, -18, 18);
          const midGain = clamp(effect.midGain ?? 0, -18, 18);
          const highGain = clamp(effect.highGain ?? 0, -18, 18);

          if (!effect.lowFilter) {
            effect.lowFilter = acquireNode('biquadFilter');
            effect.midFilter = acquireNode('biquadFilter');
            effect.highFilter = acquireNode('biquadFilter');

            // Set up filters
            effect.lowFilter.type = 'lowshelf';
            effect.lowFilter.frequency.value = 250; // Low frequency
            effect.lowFilter.gain.value = 0; // dB

            effect.midFilter.type = 'peaking';
            effect.midFilter.frequency.value = 1000; // Mid frequency
            effect.midFilter.Q.value = 1;
            effect.midFilter.gain.value = 0; // dB

            effect.highFilter.type = 'highshelf';
            effect.highFilter.frequency.value = 4000; // High frequency
            effect.highFilter.gain.value = 0; // dB
          }

          effect.lowFilter.gain.value = lowGain;
          effect.midFilter.gain.value = midGain;
          effect.highFilter.gain.value = highGain;

          // Connect the chain: input -> low -> mid -> high
          current.connect(effect.lowFilter);
          effect.lowFilter.connect(effect.midFilter);
          effect.midFilter.connect(effect.highFilter);

          current = effect.highFilter;
        }
        // Add more effect types here
      }
      // Connect to panNode
      current.connect(this.panNode);
      // Branch into metering path without affecting audio output
      if (this.meterGainNode && this.meterAnalyser) {
        this.ensureMeterNodes();
        current.connect(this.meterGainNode);
        this.meterGainNode.connect(this.meterAnalyser);
      }
      // Connect panNode to masterGain
      this.panNode.connect(getMasterGain());
    }
  });

  const PluginClass = pluginTypes[pluginType];
  const presets = PluginClass.presets;
  const firstPreset = presets ? Object.keys(presets)[0] : null;
  track.plugin = new PluginClass(track, firstPreset);
  track.name = name || (PluginClass.name + ' ' + (tracks.filter(t => t.pluginType === pluginType).length + 1));

  const stepsCountVal = parseInt(stepsCount.value, 10) || 16;
  for (let i = 0; i < stepsCountVal; i++) track.steps.push(false);
  tracks.push(track);
  return track;
}

export function changeTrackPlugin(track, newPluginType) {
  if (track.pluginType === newPluginType) return;

  // Destroy old plugin
  if (track.plugin.destroy) {
    track.plugin.destroy();
  }

  // Create new plugin
  const PluginClass = pluginTypes[newPluginType];
  const presets = PluginClass.presets;
  const firstPreset = presets ? Object.keys(presets)[0] : null;
  track.plugin = new PluginClass(track, firstPreset);
  track.pluginType = newPluginType;
  track.icon = pluginIcons[newPluginType] || 'mdi-music-note';
}

function releaseEffectNodes(effect) {
  if (effect.node) {
    releaseNode('gain', effect.node);
    effect.node = null;
  }
  if (effect.type === 'flanger') {
    if (effect.delayNode) releaseNode('delay', effect.delayNode);
    if (effect.feedbackGain) releaseNode('gain', effect.feedbackGain);
    if (effect.lfoOsc) effect.lfoOsc.stop();
    if (effect.lfoGain) releaseNode('gain', effect.lfoGain);
    if (effect.dryGain) releaseNode('gain', effect.dryGain);
    if (effect.wetGain) releaseNode('gain', effect.wetGain);
    if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
  } else if (effect.type === 'reverb') {
    if (effect.preDelayNode) releaseNode('delay', effect.preDelayNode);
    if (effect.inputGain) releaseNode('gain', effect.inputGain);
    if (effect.outputGain) releaseNode('gain', effect.outputGain);
    if (effect.dryGain) releaseNode('gain', effect.dryGain);
    if (effect.wetGain) releaseNode('gain', effect.wetGain);
    if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    if (effect.delays) effect.delays.forEach(delay => releaseNode('delay', delay));
    if (effect.delayGains) effect.delayGains.forEach(gain => releaseNode('gain', gain));
    if (effect.filters) effect.filters.forEach(filter => releaseNode('biquadFilter', filter));
  } else if (effect.type === 'delay') {
    if (effect.delayNode) releaseNode('delay', effect.delayNode);
    if (effect.feedbackGain) releaseNode('gain', effect.feedbackGain);
    if (effect.dryGain) releaseNode('gain', effect.dryGain);
    if (effect.wetGain) releaseNode('gain', effect.wetGain);
    if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    if (effect.filterNode) releaseNode('biquadFilter', effect.filterNode);
  } else if (effect.type === 'distortion') {
    if (effect.waveShaper) releaseNode('waveShaper', effect.waveShaper);
    if (effect.inputGain) releaseNode('gain', effect.inputGain);
    if (effect.outputGain) releaseNode('gain', effect.outputGain);
    if (effect.dryGain) releaseNode('gain', effect.dryGain);
    if (effect.wetGain) releaseNode('gain', effect.wetGain);
    if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
  } else if (effect.type === 'chorus') {
    if (effect.delays) effect.delays.forEach(delay => releaseNode('delay', delay));
    if (effect.delayGains) effect.delayGains.forEach(gain => releaseNode('gain', gain));
    if (effect.lfoOscs) effect.lfoOscs.forEach(osc => osc.stop());
    if (effect.lfoGains) effect.lfoGains.forEach(gain => releaseNode('gain', gain));
    if (effect.dryGain) releaseNode('gain', effect.dryGain);
    if (effect.wetGain) releaseNode('gain', effect.wetGain);
    if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
  } else if (effect.type === 'phaser') {
    if (effect.filters) effect.filters.forEach(filter => releaseNode('biquadFilter', filter));
    if (effect.phaseDelays) effect.phaseDelays.forEach(delay => releaseNode('delay', delay));
    if (effect.lfoOsc) effect.lfoOsc.stop();
    if (effect.lfoGain) releaseNode('gain', effect.lfoGain);
    if (effect.dryGain) releaseNode('gain', effect.dryGain);
    if (effect.wetGain) releaseNode('gain', effect.wetGain);
    if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
  } else if (effect.type === 'eq') {
    if (effect.lowFilter) releaseNode('biquadFilter', effect.lowFilter);
    if (effect.midFilter) releaseNode('biquadFilter', effect.midFilter);
    if (effect.highFilter) releaseNode('biquadFilter', effect.highFilter);
  }
}

export async function deleteTrack(tracks, track) {
  // Destroy plugin
  if (track.plugin && track.plugin.destroy) {
    track.plugin.destroy();
  }

  // Release audio nodes back to pool
  if (track.gainNode) {
    releaseNode('gain', track.gainNode);
    track.gainNode = null;
  }
  if (track.panNode) {
    releaseNode('stereoPanner', track.panNode);
    track.panNode = null;
  }
  if (track.meterGainNode) {
    releaseNode('gain', track.meterGainNode);
    track.meterGainNode = null;
  }
  if (track.meterAnalyser) {
    releaseNode('analyser', track.meterAnalyser);
    track.meterAnalyser = null;
  }
  track.meterData = null;

  // Release effect nodes
  for (let effect of track.effects) {
    releaseEffectNodes(effect);
  }

  // Remove from tracks array
  const index = tracks.indexOf(track);
  if (index > -1) {
    tracks.splice(index, 1);
  }
}

function updateAudioParam(track, param, value) {
  track.ensureAudioNodes();
  const ctx = track.audioCtx;
  const now = ctx.currentTime;
  const current = param.value;
  const target = typeof value === 'number' ? value : current;
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.linearRampToValueAtTime(target, now + 0.01);
}

export function updateVolume(track) {
  updateAudioParam(track, track.gainNode.gain, track.volume);
}

export function updatePan(track) {
  updateAudioParam(track, track.panNode.pan, track.pan);
}

export function toggleStep(track, index) {
  track.steps[index] = !track.steps[index];
}