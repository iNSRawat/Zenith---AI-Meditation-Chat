// Utility functions for audio encoding, decoding, Live streaming, and ambient synthesis

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function pcmFloat32ToBase64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uint8 = new Uint8Array(int16Array.buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

// Convert base64 PCM (24000Hz) from Gemini TTS to a playable WAV Blob URL
export async function createAudioUrlFromBase64(base64Audio: string): Promise<string> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass({ sampleRate: 24000 });
  const rawBytes = decodeBase64(base64Audio);
  
  const dataInt16 = new Int16Array(rawBytes.buffer);
  const frameCount = dataInt16.length;
  const audioBuffer = audioContext.createBuffer(1, frameCount, 24000);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }

  const wavBlob = bufferToWave(audioBuffer, audioBuffer.length);
  return URL.createObjectURL(wavBlob);
}

function bufferToWave(abuffer: AudioBuffer, len: number): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i));
    }
  }

  writeString('RIFF');
  view.setUint32(pos, length - 8, true); pos += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(pos, 16, true); pos += 4;
  view.setUint16(pos, 1, true); pos += 2; // PCM
  view.setUint16(pos, numOfChan, true); pos += 2;
  view.setUint32(pos, abuffer.sampleRate, true); pos += 4;
  view.setUint32(pos, abuffer.sampleRate * 2 * numOfChan, true); pos += 4;
  view.setUint16(pos, numOfChan * 2, true); pos += 2;
  view.setUint16(pos, 16, true); pos += 2; // 16-bit
  writeString('data');
  view.setUint32(pos, length - pos - 4, true); pos += 4;

  const channel = abuffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, channel[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Gapless PCM Audio Player for Gemini Live API (24kHz)
export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  public isPlaying: boolean = false;

  constructor() {
    // Initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000 });
      this.nextStartTime = this.ctx.currentTime;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public enqueueChunk(base64Pcm: string) {
    this.initCtx();
    if (!this.ctx) return;

    const rawBytes = decodeBase64(base64Pcm);
    const dataInt16 = new Int16Array(rawBytes.buffer);
    const frameCount = dataInt16.length;
    if (frameCount === 0) return;

    const buffer = this.ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    const currentTime = this.ctx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.05; // 50ms buffer for jitter
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.isPlaying = true;
    this.activeSources.push(source);

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.isPlaying = false;
      }
    };
  }

  public stopAll() {
    for (const s of this.activeSources) {
      try {
        s.stop();
        s.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeSources = [];
    if (this.ctx) {
      this.nextStartTime = this.ctx.currentTime;
    }
    this.isPlaying = false;
  }

  public close() {
    this.stopAll();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }
}

// Procedural Ambient Sound Generator using Web Audio API
export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nodes: (AudioNode | number)[] = [];
  private currentType: string = 'none';

  public start(type: 'lyria-ambient' | 'binaural-drone' | 'singing-bowl' | 'gentle-rain' | 'ocean-drift' | 'none', volume: number = 0.3) {
    this.stop();
    if (type === 'none') return;
    this.currentType = type;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    if (type === 'lyria-ambient') {
      // Ethereal lush ambient chords: 432Hz root, fifth, ninth, and deep sub
      const freqs = [108, 216, 324, 432, 486];
      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, this.ctx!.currentTime);
        // Subtle detune for wide lush shimmer
        osc.detune.setValueAtTime((idx - 2) * 4, this.ctx!.currentTime);
        g.gain.setValueAtTime(0.25 / freqs.length, this.ctx!.currentTime);
        osc.connect(g);
        g.connect(this.gainNode!);
        osc.start();
        this.nodes.push(osc, g);
      });
    } else if (type === 'binaural-drone') {
      // 432 Hz warm healing tone + 438 Hz (6 Hz theta wave beat)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(216, this.ctx.currentTime); // root A
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(222, this.ctx.currentTime); // +6Hz theta wave
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(108, this.ctx.currentTime); // gentle warm sub

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      sub.connect(subGain);
      subGain.connect(this.gainNode);

      osc1.connect(this.gainNode);
      osc2.connect(this.gainNode);

      osc1.start();
      osc2.start();
      sub.start();
      this.nodes.push(osc1, osc2, sub, subGain);

    } else if (type === 'singing-bowl') {
      // Harmonic resonance with subtle periodic modulation
      const fundamental = 280; // F# bowl
      const freqs = [fundamental, fundamental * 1.5, fundamental * 2.76, fundamental * 4.2];
      const gains = [0.6, 0.3, 0.15, 0.08];

      freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, this.ctx!.currentTime);
        g.gain.setValueAtTime(gains[i], this.ctx!.currentTime);
        osc.connect(g);
        g.connect(this.gainNode!);
        osc.start();
        this.nodes.push(osc, g);
      });

    } else if (type === 'gentle-rain' || type === 'ocean-drift') {
      // Filtered white noise with LFO for oceanic rhythm or steady soft rain
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(type === 'ocean-drift' ? 400 : 800, this.ctx.currentTime);
      filter.Q.setValueAtTime(type === 'ocean-drift' ? 1.2 : 0.8, this.ctx.currentTime);

      if (type === 'ocean-drift') {
        // LFO for wave rolling swells
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 sec wave period
        lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        this.nodes.push(lfo, lfoGain);
      }

      whiteNoise.connect(filter);
      filter.connect(this.gainNode);
      whiteNoise.start();
      this.nodes.push(whiteNoise, filter);
    }
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public stop() {
    for (const node of this.nodes) {
      if (typeof node === 'object' && 'stop' in node && typeof (node as any).stop === 'function') {
        try {
          (node as any).stop();
        } catch (e) {
          // ignore
        }
      }
      if (typeof node === 'object' && 'disconnect' in node) {
        try {
          (node as any).disconnect();
        } catch (e) {
          // ignore
        }
      }
    }
    this.nodes = [];
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch (e) {
        // ignore
      }
    }
    this.ctx = null;
    this.gainNode = null;
    this.currentType = 'none';
  }
}
