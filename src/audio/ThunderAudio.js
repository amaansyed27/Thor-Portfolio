export class ThunderAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = false;
  }

  async setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      if (this.master && this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
      return;
    }
    this.context ||= new AudioContext();
    this.master ||= this.context.createGain();
    this.master.connect(this.context.destination);
    this.master.gain.value = 0.7;
    await this.context.resume();
  }

  strike(intensity = 1) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const duration = 2.5 + intensity * 1.2;
    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * duration), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let accumulator = 0;
    for (let i = 0; i < data.length; i += 1) {
      accumulator = accumulator * 0.985 + (Math.random() * 2 - 1) * 0.045;
      const envelope = Math.exp((-i / data.length) * (4.2 - intensity * 0.5));
      data[i] = accumulator * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(180 + intensity * 80, now);
    lowpass.frequency.exponentialRampToValueAtTime(55, now + duration);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.42 * intensity, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(lowpass).connect(gain).connect(this.master);
    source.start(now + 0.04);

    const crack = this.context.createOscillator();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(55, now);
    crack.frequency.exponentialRampToValueAtTime(22, now + 0.5);
    const crackGain = this.context.createGain();
    crackGain.gain.setValueAtTime(0.18 * intensity, now);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    crack.connect(crackGain).connect(this.master);
    crack.start(now);
    crack.stop(now + 0.7);
  }
}
