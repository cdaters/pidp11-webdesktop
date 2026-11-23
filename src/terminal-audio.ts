/** Optional modern approximation of a terminal buzzer. No audio is created by
 * output, timers or reconnection: unlock requires a deliberate UI gesture.
 * One context is shared by mounted terminals and closed when the last disposes.
 * Background/unfocused bells are counted by the view but never queued for later. */
let context: AudioContext | undefined;
let users = 0;
let globalMuted = true;
let lastBell = -Infinity;
const listeners = new Set<() => void>();

export class TerminalBell {
  muted = true;
  volume = 0.15;
  private unlocked = false;
  private disposed = false;
  private voices = new Set<OscillatorNode>();
  private notify: () => void;

  constructor(notify: () => void) {
    this.notify = notify;
    users++;
    listeners.add(notify);
  }
  get globalMuted(): boolean { return globalMuted; }
  setGlobalMute(muted: boolean): void {
    globalMuted = muted;
    for (const notify of listeners) notify();
  }
  async enableFromGesture(): Promise<boolean> {
    if (this.disposed) return false;
    try {
      context ??= new AudioContext();
      await context.resume();
      if (this.disposed) return false;
      this.unlocked = context.state === "running";
      this.muted = !this.unlocked;
      return this.unlocked;
    } catch { return false; }
  }
  ring(focused: boolean): boolean {
    const now = performance.now();
    if (this.disposed || !this.unlocked || this.muted || globalMuted || !focused ||
        document.hidden || !context || context.state !== "running" || now - lastBell < 200) return false;
    lastBell = now;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 800;
      gain.gain.setValueAtTime(Math.max(0, Math.min(0.3, this.volume)), context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
      oscillator.connect(gain).connect(context.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
      return true;
    } catch { return false; } // Sound failure must not interrupt guest output/credit.
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    listeners.delete(this.notify);
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    if (--users === 0) {
      const old = context;
      context = undefined;
      globalMuted = true;
      lastBell = -Infinity;
      void old?.close().catch(() => {});
    }
  }
}
