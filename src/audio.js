class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.step = 0;
  }

  unlock() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, dur, type = 'sine', g = 0.14, slide = null) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, now + dur);
    gain.gain.setValueAtTime(g, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  _noiseBurst(dur, filterFreq, gainVal) {
    if (this.muted || !this.ctx) return;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  startBGM(isFastFn) {
    this.stopBGM();
    // Giai điệu Ngũ Cung Tết (C-D-E-G-A) + Bassline EDM ấm áp
    const melody = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 880.0, 783.99];
    const bass = [130.81, 130.81, 164.81, 164.81, 196.0, 196.0, 146.83, 196.0];
    const loop = () => {
      if (this.ctx && !this.muted) {
        const idx = this.step % melody.length;
        this._tone(melody[idx], 0.16, 'triangle', 0.045);
        this._tone(bass[this.step % bass.length], 0.18, 'sine', 0.06);
        if (idx % 2 === 0) this._tone(92, 0.08, 'sine', 0.08, 42);
        if (idx % 4 === 2) this._noiseBurst(0.04, 5200, 0.03); // Hi-hat phách
        this.step += 1;
      }
      this.bgmTimer = setTimeout(loop, isFastFn() ? 170 : 230);
    };
    loop();
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  playLionDrum() {
    this._tone(110, 0.14, 'sine', 0.25, 55);
    setTimeout(() => this._tone(720, 0.08, 'square', 0.12), 110);
    setTimeout(() => this._tone(115, 0.16, 'sine', 0.25, 55), 220);
    setTimeout(() => this._noiseBurst(0.18, 3500, 0.16), 310);
  }

  playBell() {
    this._tone(1318.5, 0.16, 'sine', 0.15);
    setTimeout(() => this._tone(1567.98, 0.22, 'sine', 0.15), 85);
  }

  playPickup() {
    this._tone(523.25, 0.1, 'sine', 0.15);
    setTimeout(() => this._tone(659.25, 0.14, 'sine', 0.15), 80);
  }

  playDeliver(combo = 1) {
    const b = 523.25 * Math.min(1 + (combo - 1) * 0.08, 1.5);
    this._tone(b, 0.1, 'triangle', 0.18);
    setTimeout(() => this._tone(b * 1.25, 0.12, 'triangle', 0.18), 80);
    setTimeout(() => this._tone(b * 1.5, 0.22, 'triangle', 0.2), 160);
  }

  playHit() {
    this._tone(160, 0.22, 'sawtooth', 0.22, 55);
  }

  playFirework() {
    // Tiếng rít bay lên -> Tiếng nổ "ĐÙNG!" + Tiếng lách tách pháo hoa thật
    this._tone(320, 0.28, 'sine', 0.08, 1100);
    this._noiseBurst(0.24, 2400, 0.05);
    setTimeout(() => {
      this._tone(95, 0.35, 'sine', 0.28, 35);
      this._noiseBurst(0.45, 900, 0.22);
    }, 260);
    setTimeout(() => this._noiseBurst(0.25, 4200, 0.09), 420);
  }
}

export const sfx = new SoundFX();
