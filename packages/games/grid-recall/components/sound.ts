/**
 * Optional sounds (PLAN.md → "Sound", off by default): a soft tick when a ball
 * blinks and a click on answer. Tiny Web Audio tones, so no audio files.
 */
let ctx: AudioContext | null = null;

function tone(freq: number, ms: number, gain: number) {
  if (typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch {
    // Audio unavailable (autoplay policy, old browser): play silently.
  }
}

export const sounds = {
  tick: () => tone(880, 90, 0.05),
  click: () => tone(440, 60, 0.04),
};
