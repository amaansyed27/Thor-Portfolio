import './refinements.css';

export class StormAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.connected = false;
  }

  async toggle() {
    this.context ||= new AudioContext();
    await this.context.resume();
    this.master ||= this.context.createGain();
    if (!this.connected) {
      this.master.connect(this.context.destination);
      this.connected = true;
    }
    this.enabled = !this.enabled;
    this.master.gain.setTargetAtTime(this.enabled ? 0.58 : 0, this.context.currentTime, 0.15);
    return this.enabled;
  }

  async thunder(intensity = 1) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    const duration = 2.4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let envelope = 0;
    for (let i = 0; i < data.length; i += 1) {
      const t = i / ctx.sampleRate;
      envelope = Math.max(envelope * 0.99993, Math.random() > 0.997 ? Math.random() : 0);
      data[i] = (Math.random() * 2 - 1) * envelope * Math.exp(-t * 1.75);
    }
    const source = ctx.createBufferSource();
    const low = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    low.type = 'lowpass';
    low.frequency.value = 190;
    low.Q.value = 0.9;
    gain.gain.value = Math.min(1, 0.55 * intensity);
    source.connect(low).connect(gain).connect(this.master);
    source.start(ctx.currentTime + 0.08);
  }
}
