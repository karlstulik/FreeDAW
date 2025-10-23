import { reactive } from 'vue'
import { TrackPlugin, FileLoaderPlugin, ToneGeneratorPlugin, KickGeneratorPlugin, BassGeneratorPlugin, ClapGeneratorPlugin } from '@/plugins/dawPlugins'
import { makeId } from './utils'
import { getAudioContext, getMasterGain, acquireNode, releaseNode } from './audio'

export const pluginTypes = {
  'file-loader': FileLoaderPlugin,
  'tone-generator': ToneGeneratorPlugin,
  'kick-generator': KickGeneratorPlugin,
  'bass-generator': BassGeneratorPlugin,
  'clap-generator': ClapGeneratorPlugin
};

export function createTrack(tracks, stepsCount, name, pluginType = 'file-loader') {
  const id = makeId();

  const track = reactive({
    id,
    name: '', // Will be set after
    plugin: null, // Will be set after creation
    pluginType,
    steps: [],
    gainNode: null, // Lazy initialization
    panNode: null, // Lazy initialization
    muted: false,
    solo: false,
    volume: 1,
    pan: 0,
    level: 0, // For meter display
    effects: [], // Array of effect objects
    get audioCtx() { return getAudioContext(); },
    ensureAudioNodes() {
      if (!this.gainNode) {
        const ctx = this.audioCtx;
        this.gainNode = acquireNode('gain');
        this.gainNode.gain.value = this.volume;
        this.panNode = acquireNode('stereoPanner');
        this.panNode.pan.value = this.pan;
        this.updateEffectsChain();
      }
    },
    updateEffectsChain() {
      if (!this.gainNode || !this.panNode) return;
      // Disconnect gainNode from everything
      this.gainNode.disconnect();
      // Disconnect panNode from masterGain temporarily
      this.panNode.disconnect();
      // Start chain from gainNode
      let current = this.gainNode;
      for (let effect of this.effects) {
        if (effect.type === 'gain') {
          if (!effect.node) {
            effect.node = acquireNode('gain');
          }
          effect.node.gain.value = effect.value;
          current.connect(effect.node);
          current = effect.node;
        } else if (effect.type === 'flanger') {
          // Create flanger nodes if they don't exist
          if (!effect.delayNode) {
            effect.delayNode = acquireNode('delay', 0.02); // Max delay of 20ms for flanging
            effect.feedbackGain = acquireNode('gain');
            effect.lfoOsc = acquireNode('oscillator');
            effect.lfoGain = acquireNode('gain');
            effect.dryGain = acquireNode('gain');
            effect.wetGain = acquireNode('gain');
            effect.finalMixer = acquireNode('gain');

            // Set up LFO
            effect.lfoOsc.type = 'sine';
            effect.lfoOsc.frequency.value = effect.rate || 0.5;
            effect.lfoGain.gain.value = (effect.depth || 0.5) * 0.005; // Small modulation range
            effect.lfoOsc.connect(effect.lfoGain);
            effect.lfoGain.connect(effect.delayNode.delayTime);

            // Set up delay
            effect.delayNode.delayTime.value = effect.delay || 0.005; // Base delay time
            effect.feedbackGain.gain.value = effect.feedback || 0.3;

            // Feedback loop
            effect.delayNode.connect(effect.feedbackGain);
            effect.feedbackGain.connect(effect.delayNode);

            // Start LFO
            effect.lfoOsc.start();
          } else {
            // Update parameters
            effect.lfoOsc.frequency.value = effect.rate || 0.5;
            effect.lfoGain.gain.value = (effect.depth || 0.5) * 0.005;
            effect.delayNode.delayTime.value = effect.delay || 0.005;
            effect.feedbackGain.gain.value = effect.feedback || 0.3;
          }

          // Update mix
          effect.dryGain.gain.value = 1 - (effect.mix || 0.5);
          effect.wetGain.gain.value = effect.mix || 0.5;

          // Connect the chain: input -> dry + (input -> delay -> wet) -> mixer
          current.connect(effect.dryGain);
          current.connect(effect.delayNode);
          effect.delayNode.connect(effect.wetGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'reverb') {
          // Create reverb nodes if they don't exist
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
          } else {
            // Update parameters
            effect.preDelayNode.delayTime.value = effect.preDelay || 0.02;
            effect.dryGain.gain.value = 1 - (effect.mix || 0.25);
            effect.wetGain.gain.value = effect.mix || 0.25;

            // Update damping frequency
            const dampingFreq = effect.damping || 3000;
            effect.filters.forEach(filter => {
              filter.frequency.value = dampingFreq;
            });

            // Update decay by adjusting delay gains based on decay time
            const decayTime = Math.max(0.1, effect.decay || 1.5);
            const delayTimes = [0.0297, 0.0371, 0.0419, 0.0437, 0.0483, 0.0527];
            for (let i = 0; i < effect.delayGains.length; i++) {
              const baseGain = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2][i];
              // Better exponential decay: signal should decay to -60dB over decayTime
              const decayFactor = Math.pow(0.001, (delayTimes[i] / decayTime)); // -60dB decay
              effect.delayGains[i].gain.value = baseGain * decayFactor;
            }
          }

          // Connect the chain: input -> dry + (input -> reverb -> wet) -> mixer
          current.connect(effect.dryGain);
          current.connect(effect.inputGain);
          effect.outputGain.connect(effect.wetGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'delay') {
          // Create delay nodes if they don't exist
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
          } else {
            // Update parameters with clamping to prevent runaway feedback
            effect.delayNode.delayTime.value = effect.time || 0.2;
            // Clamp feedback to safe range (0.0 to 0.6) to prevent runaway
            const safeFeedback = Math.max(0, Math.min(0.6, effect.feedback || 0.15));
            effect.feedbackGain.gain.value = safeFeedback;
            effect.filterNode.frequency.value = effect.damping || 5000;
          }

          // Update mix
          effect.dryGain.gain.value = 1 - (effect.mix || 0.3);
          effect.wetGain.gain.value = effect.mix || 0.3;

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
              lfoOsc.frequency.value = effect.rate || 0.3;
              lfoGain.gain.value = (effect.depth || 0.005) * (i + 1) * 0.5; // Different depths for each line
              lfoOsc.connect(lfoGain);
              lfoGain.connect(delay.delayTime);

              // Set base delay time with slight variation
              delay.delayTime.value = (effect.delay || 0.01) + i * 0.002;
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
            const baseDelay = effect.delay || 0.01;
            const rate = effect.rate || 0.3;
            const depth = effect.depth || 0.005;
            effect.delays.forEach((delay, i) => {
              delay.delayTime.value = baseDelay + i * 0.002;
              effect.lfoOscs[i].frequency.value = rate;
              effect.lfoGains[i].gain.value = depth * (i + 1) * 0.5;
            });
          }

          // Update mix
          effect.dryGain.gain.value = 1 - (effect.mix || 0.5);
          effect.wetGain.gain.value = effect.mix || 0.5;

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
            effect.lfoOsc.frequency.value = effect.rate || 0.5;
            effect.lfoGain.gain.value = effect.depth || 0.5;
            effect.lfoOsc.connect(effect.lfoGain);

            // Create 4-6 all-pass filters for phaser
            const numFilters = 6;
            for (let i = 0; i < numFilters; i++) {
              const filter = acquireNode('biquadFilter');
              filter.type = 'allpass';
              filter.frequency.value = 1000; // Base frequency
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
            effect.lfoOsc.frequency.value = effect.rate || 0.5;
            effect.lfoGain.gain.value = effect.depth || 0.5;

            // Update base frequency for all filters
            const baseFreq = effect.frequency || 1000;
            effect.filters.forEach((filter, i) => {
              filter.frequency.value = baseFreq + i * 500; // Spread frequencies
            });
          }

          // Update mix
          effect.dryGain.gain.value = 1 - (effect.mix || 0.5);
          effect.wetGain.gain.value = effect.mix || 0.5;

          // Connect the chain: input -> dry + (input -> filters -> wet) -> mixer
          current.connect(effect.dryGain);
          current.connect(effect.filters[0]);
          effect.filters[effect.filters.length - 1].connect(effect.wetGain);
          effect.dryGain.connect(effect.finalMixer);
          effect.wetGain.connect(effect.finalMixer);

          current = effect.finalMixer;
        } else if (effect.type === 'eq') {
          // Create EQ nodes if they don't exist
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
          } else {
            // Update parameters
            effect.lowFilter.gain.value = effect.lowGain || 0;
            effect.midFilter.gain.value = effect.midGain || 0;
            effect.highFilter.gain.value = effect.highGain || 0;
          }

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
      // Connect panNode to masterGain
      this.panNode.connect(getMasterGain());
    }
  });

  const PluginClass = pluginTypes[pluginType];
  track.plugin = new PluginClass(track);
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
  track.plugin = new PluginClass(track);
  track.pluginType = newPluginType;
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

  // Release effect nodes
  for (let effect of track.effects) {
    if (effect.node) {
      releaseNode('gain', effect.node);
      effect.node = null;
    }
    // Release flanger nodes
    if (effect.type === 'flanger') {
      if (effect.delayNode) releaseNode('delay', effect.delayNode);
      if (effect.feedbackGain) releaseNode('gain', effect.feedbackGain);
      if (effect.lfoOsc) {
        effect.lfoOsc.stop();
        // Oscillators can't be released back to pool
      }
      if (effect.lfoGain) releaseNode('gain', effect.lfoGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release reverb nodes
    if (effect.type === 'reverb') {
      if (effect.preDelayNode) releaseNode('delay', effect.preDelayNode);
      if (effect.inputGain) releaseNode('gain', effect.inputGain);
      if (effect.outputGain) releaseNode('gain', effect.outputGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
      // Release delay lines
      if (effect.delays) {
        effect.delays.forEach(delay => releaseNode('delay', delay));
      }
      if (effect.delayGains) {
        effect.delayGains.forEach(gain => releaseNode('gain', gain));
      }
      if (effect.filters) {
        effect.filters.forEach(filter => releaseNode('biquadFilter', filter));
      }
    }
    // Release delay nodes
    if (effect.type === 'delay') {
      if (effect.delayNode) releaseNode('delay', effect.delayNode);
      if (effect.feedbackGain) releaseNode('gain', effect.feedbackGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
      if (effect.filterNode) releaseNode('biquadFilter', effect.filterNode);
    }
    // Release distortion nodes
    if (effect.type === 'distortion') {
      if (effect.waveShaper) releaseNode('waveShaper', effect.waveShaper);
      if (effect.inputGain) releaseNode('gain', effect.inputGain);
      if (effect.outputGain) releaseNode('gain', effect.outputGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release chorus nodes
    if (effect.type === 'chorus') {
      if (effect.delays) {
        effect.delays.forEach(delay => releaseNode('delay', delay));
      }
      if (effect.delayGains) {
        effect.delayGains.forEach(gain => releaseNode('gain', gain));
      }
      if (effect.lfoOscs) {
        effect.lfoOscs.forEach(osc => osc.stop()); // Can't release oscillators
      }
      if (effect.lfoGains) {
        effect.lfoGains.forEach(gain => releaseNode('gain', gain));
      }
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release phaser nodes
    if (effect.type === 'phaser') {
      if (effect.filters) {
        effect.filters.forEach(filter => releaseNode('biquadFilter', filter));
      }
      if (effect.phaseDelays) {
        effect.phaseDelays.forEach(delay => releaseNode('delay', delay));
      }
      if (effect.lfoOsc) {
        effect.lfoOsc.stop(); // Can't release oscillators
      }
      if (effect.lfoGain) releaseNode('gain', effect.lfoGain);
      if (effect.dryGain) releaseNode('gain', effect.dryGain);
      if (effect.wetGain) releaseNode('gain', effect.wetGain);
      if (effect.finalMixer) releaseNode('gain', effect.finalMixer);
    }
    // Release EQ nodes
    if (effect.type === 'eq') {
      if (effect.lowFilter) releaseNode('biquadFilter', effect.lowFilter);
      if (effect.midFilter) releaseNode('biquadFilter', effect.midFilter);
      if (effect.highFilter) releaseNode('biquadFilter', effect.highFilter);
    }
  }

  // Remove from tracks array
  const index = tracks.indexOf(track);
  if (index > -1) {
    tracks.splice(index, 1);
  }
}

export function updateVolume(track) {
  track.ensureAudioNodes();
  const ctx = track.audioCtx;
  const now = ctx.currentTime;
  const param = track.gainNode.gain;
  const current = param.value;
  const target = typeof track.volume === 'number' ? track.volume : current;
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.linearRampToValueAtTime(target, now + 0.01);
}

export function updatePan(track) {
  track.ensureAudioNodes();
  const ctx = track.audioCtx;
  const now = ctx.currentTime;
  const param = track.panNode.pan;
  const current = param.value;
  const target = typeof track.pan === 'number' ? track.pan : current;
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.linearRampToValueAtTime(target, now + 0.01);
}

export function toggleStep(track, index) {
  track.steps[index] = !track.steps[index];
}