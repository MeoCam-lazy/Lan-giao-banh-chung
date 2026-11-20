class SoundFX {
  constructor() { this.ctx = null; this.muted = false; this.bgmTimer = null; this.step = 0; }
  unlock() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  toggleMute() { this.muted = !this.muted; return this.muted; }
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
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + dur);
  }
  startBGM(isFastFn) {
    this.stopBGM();
    // Ngũ cung Tết (C-D-E-G-A) remix nhịp EDM
    const melody = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33];
    const loop = () => {
      if (this.ctx && !this.muted) {
        const idx = this.step % melody.length;
        this._tone(melody[idx], 0.14, 'triangle', 0.04);
        if (idx % 2 === 0) this._tone(95, 0.09, 'sine', 0.09, 45); // Kick EDM
        this.step += 1;
      }
      this.bgmTimer = setTimeout(loop, isFastFn() ? 175 : 240);
    };
    loop();
  }
  stopBGM() { if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; } }
  playLionDrum() {
    // Tiếng trống Múa Lân "Tùng Cắc Tùng Xèng!"
    this._tone(110, 0.14, 'sine', 0.25, 55);
    setTimeout(() => this._tone(720, 0.08, 'square', 0.12), 110);
    setTimeout(() => this._tone(115, 0.16, 'sine', 0.25, 55), 220);
    setTimeout(() => this._tone(1400, 0.18, 'triangle', 0.12, 900), 330);
  }
  playBell() {
    this._tone(1318.5, 0.16, 'sine', 0.15);
    setTimeout(() => this._tone(1567.98, 0.22, 'sine', 0.15), 85);
  }
  playPickup() { this._tone(523.25, 0.1, 'sine', 0.15); setTimeout(() => this._tone(659.25, 0.14, 'sine', 0.15), 80); }
  playDeliver(combo = 1) {
    const b = 523.25 * Math.min(1 + (combo - 1) * 0.08, 1.5);
    this._tone(b, 0.1, 'triangle', 0.18);
    setTimeout(() => this._tone(b * 1.25, 0.12, 'triangle', 0.18), 80);
    setTimeout(() => this._tone(b * 1.5, 0.22, 'triangle', 0.2), 160);
  }
  playHit() { this._tone(160, 0.22, 'sawtooth', 0.22, 55); }
  playFirework() {
    this._tone(240, 0.25, 'sine', 0.12, 720);
    setTimeout(() => {
      this._tone(120, 0.3, 'sawtooth', 0.18, 45);
      this._tone(980, 0.18, 'triangle', 0.1, 420);
    }, 240);
  }
}
export const sfx = new SoundFX();
