export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  muted = false;
  private voices = 0;

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        try {
          this.ctx = new Ctx({ latencyHint: "interactive" });
        } catch {
          this.ctx = new Ctx();
        }
        this.master = this.ctx.createGain();
        this.sfx = this.ctx.createGain();
        this.sfx.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applyMute();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* Web Audio unavailable */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMute();
  }

  private applyMute(): void {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.02);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.08,
    slide = 0,
  ): void {
    if (!this.ctx || !this.sfx || this.muted || this.voices > 18) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(40, freq), t);
      if (slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + Math.max(0.01, dur));
      }
      g.gain.setValueAtTime(Math.max(0.0001, gain), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, dur));
      osc.connect(g);
      g.connect(this.sfx);
      this.voices++;
      osc.onended = () => {
        this.voices = Math.max(0, this.voices - 1);
        try {
          osc.disconnect();
          g.disconnect();
        } catch {
          /* already disconnected */
        }
      };
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      /* iOS AudioContext can reject ramps / nodes under load */
    }
  }

  private noise(dur: number, cutoff: number, gain = 0.1): void {
    if (!this.ctx || !this.sfx || this.muted || this.voices > 18) return;
    try {
      const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      g.gain.setValueAtTime(Math.max(0.0001, gain), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, dur));
      src.connect(filter);
      filter.connect(g);
      g.connect(this.sfx);
      this.voices++;
      src.onended = () => {
        this.voices = Math.max(0, this.voices - 1);
        try {
          src.disconnect();
          filter.disconnect();
          g.disconnect();
        } catch {
          /* already disconnected */
        }
      };
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch {
      /* iOS AudioContext can reject buffers under load */
    }
  }

  shoot(): void {
    const r = 0.94 + Math.random() * 0.12;
    this.tone(920 * r, 0.045, "square", 0.035, 0.45);
    this.noise(0.03, 2400, 0.04);
  }

  hit(): void {
    this.noise(0.05, 1800, 0.08);
    this.tone(240, 0.06, "triangle", 0.04, 0.5);
  }

  explode(): void {
    this.noise(0.28, 700, 0.16);
    this.tone(160, 0.22, "sawtooth", 0.05, 0.3);
  }

  pickup(): void {
    this.tone(523, 0.07, "sine", 0.07);
    this.tone(784, 0.1, "sine", 0.06);
  }

  dead(): void {
    this.noise(0.4, 500, 0.18);
    this.tone(220, 0.45, "sawtooth", 0.07, 0.25);
  }

  wave(): void {
    this.tone(392, 0.12, "triangle", 0.05);
    this.tone(523, 0.16, "triangle", 0.05);
  }

  ui(): void {
    this.tone(660, 0.05, "sine", 0.04);
  }

  extraLife(): void {
    this.tone(523, 0.08, "sine", 0.06);
    this.tone(659, 0.1, "sine", 0.06);
    this.tone(784, 0.14, "sine", 0.07);
  }

  nuke(): void {
    this.noise(0.55, 420, 0.28);
    this.noise(0.22, 1800, 0.12);
    this.tone(90, 0.55, "sawtooth", 0.12, 0.22);
    this.tone(180, 0.28, "triangle", 0.07, 0.35);
    this.tone(520, 0.12, "sine", 0.05, 2.2);
  }
}
