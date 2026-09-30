// Web Audio API procedural soundscape synthesizer for Foundry VTT ambience
// Zero external file dependencies, plays immediately in any browser without CORS or network limits

class FoundryAudioEngine {
  private ctx: AudioContext | null = null;
  private currentTrack: string = "none";
  private volume: number = 0.5;
  private isPlaying: boolean = false;
  private activeNodes: {
    gainNode?: GainNode;
    sources?: AudioNode[];
    intervals?: number[];
  } = {};

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.activeNodes.gainNode && this.ctx) {
      this.activeNodes.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public stop() {
    if (this.activeNodes.intervals) {
      this.activeNodes.intervals.forEach((id) => clearInterval(id));
      this.activeNodes.intervals = [];
    }
    if (this.activeNodes.sources) {
      this.activeNodes.sources.forEach((node) => {
        try {
          if ("stop" in node && typeof (node as any).stop === "function") {
            (node as any).stop();
          }
          node.disconnect();
        } catch (_) {}
      });
      this.activeNodes.sources = [];
    }
    if (this.activeNodes.gainNode) {
      try {
        this.activeNodes.gainNode.disconnect();
      } catch (_) {}
      this.activeNodes.gainNode = undefined;
    }
    this.isPlaying = false;
    this.currentTrack = "none";
  }

  public play(track: string, volume: number = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    if (track === "none" || !track) {
      this.stop();
      return;
    }

    // If already playing the same track, just update volume
    if (this.isPlaying && this.currentTrack === track) {
      this.setVolume(volume);
      return;
    }

    this.stop();
    this.currentTrack = track;
    this.volume = volume;
    this.isPlaying = true;

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    masterGain.connect(this.ctx.destination);
    this.activeNodes.gainNode = masterGain;
    this.activeNodes.sources = [];
    this.activeNodes.intervals = [];

    switch (track) {
      case "rain":
        this.createRainSound(masterGain);
        break;
      case "storm":
        this.createStormSound(masterGain);
        break;
      case "wind":
        this.createWindSound(masterGain);
        break;
      case "campfire":
        this.createCampfireSound(masterGain);
        break;
      case "forest":
        this.createForestSound(masterGain);
        break;
      case "ocean":
        this.createOceanSound(masterGain);
        break;
      case "cave":
        this.createCaveSound(masterGain);
        break;
      default:
        break;
    }
  }

  // --- PROCEDURAL GENERATORS ---

  private createPinkNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx!.sampleRate * 2;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private createBrownNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx!.sampleRate * 2;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    return buffer;
  }

  // 1. RAIN
  private createRainSound(target: GainNode) {
    if (!this.ctx) return;
    const pinkNoise = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = pinkNoise;
    noiseSource.loop = true;

    // Filter to simulate soft rainfall hiss
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1200, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(0.8, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    noiseSource.connect(bandpass);
    bandpass.connect(rainGain);
    rainGain.connect(target);
    noiseSource.start();
    this.activeNodes.sources?.push(noiseSource);

    // Random droplet pops
    const interval = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying) return;
      const osc = this.ctx.createOscillator();
      const dropGain = this.ctx.createGain();
      const freq = 1200 + Math.random() * 1800;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, this.ctx.currentTime + 0.04);
      dropGain.gain.setValueAtTime(0.04 * Math.random(), this.ctx.currentTime);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
      osc.connect(dropGain);
      dropGain.connect(target);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }, 120);
    this.activeNodes.intervals?.push(interval);
  }

  // 2. STORM WITH THUNDER
  private createStormSound(target: GainNode) {
    if (!this.ctx) return;
    this.createRainSound(target);

    // Deep howling wind
    const brownNoise = this.createBrownNoiseBuffer();
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = brownNoise;
    windSource.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(target);
    windSource.start();
    this.activeNodes.sources?.push(windSource);

    // Periodic thunder rumbles
    const triggerThunder = () => {
      if (!this.ctx || !this.isPlaying) return;
      const thunderSource = this.ctx.createBufferSource();
      thunderSource.buffer = brownNoise;
      const thunderFilter = this.ctx.createBiquadFilter();
      thunderFilter.type = "lowpass";
      thunderFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
      thunderFilter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 3.0);
      const thunderGain = this.ctx.createGain();
      thunderGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      thunderGain.gain.linearRampToValueAtTime(0.9, this.ctx.currentTime + 0.25);
      thunderGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.8);
      thunderSource.connect(thunderFilter);
      thunderFilter.connect(thunderGain);
      thunderGain.connect(target);
      thunderSource.start();
      thunderSource.stop(this.ctx.currentTime + 4.0);
    };

    triggerThunder();
    const thunderInterval = window.setInterval(() => {
      if (Math.random() > 0.4) triggerThunder();
    }, 7000);
    this.activeNodes.intervals?.push(thunderInterval);
  }

  // 3. HOWLING WIND
  private createWindSound(target: GainNode) {
    if (!this.ctx) return;
    const brownNoise = this.createBrownNoiseBuffer();
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = brownNoise;
    windSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // LFO to oscillate wind frequency for howling effect
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    windSource.connect(filter);
    filter.connect(windGain);
    windGain.connect(target);
    windSource.start();
    lfo.start();
    this.activeNodes.sources?.push(windSource, lfo);
  }

  // 4. CAMPFIRE & CRACKLING EMBERS
  private createCampfireSound(target: GainNode) {
    if (!this.ctx) return;
    // Low warm rumble
    const brownNoise = this.createBrownNoiseBuffer();
    const fireBase = this.ctx.createBufferSource();
    fireBase.buffer = brownNoise;
    fireBase.loop = true;
    const fireFilter = this.ctx.createBiquadFilter();
    fireFilter.type = "lowpass";
    fireFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
    const baseGain = this.ctx.createGain();
    baseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    fireBase.connect(fireFilter);
    fireFilter.connect(baseGain);
    baseGain.connect(target);
    fireBase.start();
    this.activeNodes.sources?.push(fireBase);

    // Crackle pops
    const interval = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying) return;
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const osc = this.ctx.createOscillator();
        const crackleGain = this.ctx.createGain();
        const freq = 600 + Math.random() * 2400;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.type = "triangle";
        crackleGain.gain.setValueAtTime(0.08 * Math.random(), this.ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.02);
        osc.connect(crackleGain);
        crackleGain.connect(target);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.025);
      }
    }, 90);
    this.activeNodes.intervals?.push(interval);
  }

  // 5. NIGHT FOREST & CRICKETS
  private createForestSound(target: GainNode) {
    if (!this.ctx) return;
    // Soft nocturnal wind
    const brownNoise = this.createBrownNoiseBuffer();
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = brownNoise;
    windSource.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.setValueAtTime(160, this.ctx.currentTime);
    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(target);
    windSource.start();
    this.activeNodes.sources?.push(windSource);

    // Cricket chirps
    const interval = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying) return;
      if (Math.random() > 0.35) {
        const baseFreq = 4200 + Math.random() * 400;
        for (let burst = 0; burst < 3; burst++) {
          const osc = this.ctx.createOscillator();
          const chirpGain = this.ctx.createGain();
          const startTime = this.ctx.currentTime + burst * 0.06;
          osc.frequency.setValueAtTime(baseFreq, startTime);
          chirpGain.gain.setValueAtTime(0.001, startTime);
          chirpGain.gain.linearRampToValueAtTime(0.03, startTime + 0.02);
          chirpGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.045);
          osc.connect(chirpGain);
          chirpGain.connect(target);
          osc.start(startTime);
          osc.stop(startTime + 0.05);
        }
      }
    }, 450);
    this.activeNodes.intervals?.push(interval);
  }

  // 6. OCEAN WAVES
  private createOceanSound(target: GainNode) {
    if (!this.ctx) return;
    const pinkNoise = this.createPinkNoiseBuffer();
    const surfSource = this.ctx.createBufferSource();
    surfSource.buffer = pinkNoise;
    surfSource.loop = true;

    const surfFilter = this.ctx.createBiquadFilter();
    surfFilter.type = "lowpass";
    surfFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    // Slow swell LFO
    const swellLfo = this.ctx.createOscillator();
    swellLfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8s wave period
    const swellGain = this.ctx.createGain();
    swellGain.gain.setValueAtTime(320, this.ctx.currentTime);
    swellLfo.connect(swellGain);
    swellGain.connect(surfFilter.frequency);

    const masterSurfGain = this.ctx.createGain();
    masterSurfGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    surfSource.connect(surfFilter);
    surfFilter.connect(masterSurfGain);
    masterSurfGain.connect(target);
    surfSource.start();
    swellLfo.start();
    this.activeNodes.sources?.push(surfSource, swellLfo);
  }

  // 7. CAVE DRIPS & ECHO
  private createCaveSound(target: GainNode) {
    if (!this.ctx) return;
    // Low subterranean drone
    const brownNoise = this.createBrownNoiseBuffer();
    const drone = this.ctx.createBufferSource();
    drone.buffer = brownNoise;
    drone.loop = true;
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.setValueAtTime(90, this.ctx.currentTime);
    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(target);
    drone.start();
    this.activeNodes.sources?.push(drone);

    // Resonant water droplets with cavern echo
    const interval = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying) return;
      if (Math.random() > 0.4) {
        const dropFreq = 700 + Math.random() * 1200;
        const osc = this.ctx.createOscillator();
        const dropGain = this.ctx.createGain();
        osc.frequency.setValueAtTime(dropFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(dropFreq * 1.5, this.ctx.currentTime + 0.08);
        dropGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);
        osc.connect(dropGain);
        dropGain.connect(target);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
      }
    }, 850);
    this.activeNodes.intervals?.push(interval);
  }
}

export const foundryAudio = new FoundryAudioEngine();
