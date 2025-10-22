// Base plugin class for DAW tracks
export class TrackPlugin {
  constructor(track) {
    this.track = track;
    this.audioCtx = track.audioCtx;
  }

  // Create the UI elements for this track type
  createControls(container) {
    // Override in subclasses
  }

  // Play the sound at the given time
  play(when, duration) {
    // Override in subclasses
  }

  // Play in offline context for export
  playOffline(offlineCtx, when, duration) {
    // Override in subclasses - default to regular play
    return this.play(when, duration);
  }

  // Get display name
  getName() {
    return 'Base Plugin';
  }

  // Cleanup resources
  destroy() {
    // Override if needed
  }
}

export class FileLoaderPlugin extends TrackPlugin {
  static name = 'File Loader';

  constructor(track) {
    super(track);
    this.buffer = null;
  }

  getName() {
    return FileLoaderPlugin.name;
  }

  createControls(container) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.loadFile(file);
      }
    };
    container.appendChild(fileInput);
  }

  async loadFile(file) {
    try {
      const arr = await file.arrayBuffer();
      this.buffer = await this.audioCtx.decodeAudioData(arr.slice(0));
      alert(`${this.track.name} — Sample loaded (${Math.round(this.buffer.duration * 1000) / 1000}s)`);
    } catch (error) {
      alert('Error loading file: ' + error.message);
    }
  }

  play(when, duration) {
    if (!this.buffer) return;

    this.track.ensureAudioNodes();

    const src = this.audioCtx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.track.gainNode);

    src.start(when);
    if (duration) {
      src.stop(when + duration);
    }
  }

  playOffline(offlineCtx, when, duration) {
    if (!this.buffer) return;

    const src = offlineCtx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(offlineCtx.destination);

    src.start(when);
    if (duration) {
      src.stop(when + duration);
    }
  }
}

export class KickGeneratorPlugin extends TrackPlugin {
  static name = 'Kick Generator';

  constructor(track) {
    super(track);
    this.frequency = 60; // Starting frequency for kick
    this.decay = 0.3; // Decay time in seconds
    this.pitchBend = 0.1; // How much the pitch changes
  }

  getName() {
    return KickGeneratorPlugin.name;
  }

  createControls(container) {
    // Frequency control
    const freqLabel = document.createElement('label');
    freqLabel.textContent = 'Freq: ';
    freqLabel.style.fontSize = '12px';
    freqLabel.style.marginRight = '4px';

    const freqInput = document.createElement('input');
    freqInput.type = 'number';
    freqInput.value = this.frequency;
    freqInput.min = 30;
    freqInput.max = 150;
    freqInput.step = 1;
    freqInput.style.width = '50px';
    freqInput.style.marginRight = '8px';
    freqInput.onchange = (e) => {
      this.frequency = parseFloat(e.target.value) || 60;
    };

    // Decay control
    const decayLabel = document.createElement('label');
    decayLabel.textContent = 'Decay: ';
    decayLabel.style.fontSize = '12px';
    decayLabel.style.marginRight = '4px';

    const decayInput = document.createElement('input');
    decayInput.type = 'number';
    decayInput.value = this.decay;
    decayInput.min = 0.05;
    decayInput.max = 1;
    decayInput.step = 0.01;
    decayInput.style.width = '50px';
    decayInput.style.marginRight = '8px';
    decayInput.onchange = (e) => {
      this.decay = parseFloat(e.target.value) || 0.3;
    };

    // Pitch bend control
    const bendLabel = document.createElement('label');
    bendLabel.textContent = 'Bend: ';
    bendLabel.style.fontSize = '12px';
    bendLabel.style.marginRight = '4px';

    const bendInput = document.createElement('input');
    bendInput.type = 'number';
    bendInput.value = this.pitchBend;
    bendInput.min = 0;
    bendInput.max = 0.5;
    bendInput.step = 0.01;
    bendInput.style.width = '50px';
    bendInput.onchange = (e) => {
      this.pitchBend = parseFloat(e.target.value) || 0.1;
    };

    container.appendChild(freqLabel);
    container.appendChild(freqInput);
    container.appendChild(decayLabel);
    container.appendChild(decayInput);
    container.appendChild(bendLabel);
    container.appendChild(bendInput);
  }

  play(when, duration) {
    this.track.ensureAudioNodes();

    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.frequency, when);

    // Create pitch bend effect
    if (this.pitchBend > 0) {
      const endFreq = this.frequency * (1 - this.pitchBend);
      osc.frequency.exponentialRampToValueAtTime(endFreq, when + this.decay);
    }

    // Create gain envelope for decay
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(1, when);
    gainNode.gain.exponentialRampToValueAtTime(0.001, when + this.decay);

    osc.connect(gainNode);
    gainNode.connect(this.track.gainNode);

    const playDuration = duration || this.decay;
    osc.start(when);
    osc.stop(when + playDuration);
  }

  playOffline(offlineCtx, when, duration) {
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.frequency, when);

    if (this.pitchBend > 0) {
      const endFreq = this.frequency * (1 - this.pitchBend);
      osc.frequency.exponentialRampToValueAtTime(endFreq, when + this.decay);
    }

    const gainNode = offlineCtx.createGain();
    gainNode.gain.setValueAtTime(1, when);
    gainNode.gain.exponentialRampToValueAtTime(0.001, when + this.decay);

    osc.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    const playDuration = duration || this.decay;
    osc.start(when);
    osc.stop(when + playDuration);
  }
}

export class ToneGeneratorPlugin extends TrackPlugin {
  static name = 'Tone Generator';

  constructor(track) {
    super(track);
    this.frequency = 440; // A4
    this.waveform = 'sine';
    this.duration = 0.1; // seconds
  }

  getName() {
    return ToneGeneratorPlugin.name;
  }

  createControls(container) {
    // Frequency control
    const freqLabel = document.createElement('label');
    freqLabel.textContent = 'Freq: ';
    freqLabel.style.fontSize = '12px';
    freqLabel.style.marginRight = '4px';

    const freqInput = document.createElement('input');
    freqInput.type = 'number';
    freqInput.value = this.frequency;
    freqInput.min = 20;
    freqInput.max = 2000;
    freqInput.step = 1;
    freqInput.style.width = '60px';
    freqInput.style.marginRight = '8px';
    freqInput.onchange = (e) => {
      this.frequency = parseFloat(e.target.value) || 440;
    };

    // Waveform selector
    const waveLabel = document.createElement('label');
    waveLabel.textContent = 'Wave: ';
    waveLabel.style.fontSize = '12px';
    waveLabel.style.marginRight = '4px';

    const waveSelect = document.createElement('select');
    waveSelect.style.marginRight = '8px';
    ['sine', 'square', 'sawtooth', 'triangle'].forEach(wave => {
      const option = document.createElement('option');
      option.value = wave;
      option.textContent = wave;
      waveSelect.appendChild(option);
    });
    waveSelect.value = this.waveform;
    waveSelect.onchange = (e) => {
      this.waveform = e.target.value;
    };

    // Duration control
    const durLabel = document.createElement('label');
    durLabel.textContent = 'Dur: ';
    durLabel.style.fontSize = '12px';
    durLabel.style.marginRight = '4px';

    const durInput = document.createElement('input');
    durInput.type = 'number';
    durInput.value = this.duration;
    durInput.min = 0.01;
    durInput.max = 2;
    durInput.step = 0.01;
    durInput.style.width = '50px';
    durInput.onchange = (e) => {
      this.duration = parseFloat(e.target.value) || 0.1;
    };

    container.appendChild(freqLabel);
    container.appendChild(freqInput);
    container.appendChild(waveLabel);
    container.appendChild(waveSelect);
    container.appendChild(durLabel);
    container.appendChild(durInput);
  }

  play(when, duration) {
    this.track.ensureAudioNodes();

    const osc = this.audioCtx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.value = this.frequency;

    osc.connect(this.track.gainNode);

    const playDuration = duration || this.duration;
    osc.start(when);
    osc.stop(when + playDuration);
  }

  playOffline(offlineCtx, when, duration) {
    const osc = offlineCtx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.value = this.frequency;

    osc.connect(offlineCtx.destination);

    const playDuration = duration || this.duration;
    osc.start(when);
    osc.stop(when + playDuration);
  }
}