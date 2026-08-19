/**
 * Multimodal feedback (SKILL §13) — causality + harmony + utility.
 *
 * Haptics (Vibration API) and micro-sound (WebAudio) fire on the SAME frame
 * as the visual they accompany. Both are gated on `prefers-reduced-motion`
 * and can be muted per-user via localStorage. Keep it scarce: commit /
 * success / error only — never ambient noise.
 */

const SOUND_KEY = "zapsters:feedback-sound";
const HAPTICS_KEY = "zapsters:feedback-haptics";

interface FeedbackTone {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function muted(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "off";
}

function playTone({ freq, duration, type, gain }: FeedbackTone) {
  if (reducedMotion() || muted(SOUND_KEY)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  oscillator.connect(amp);
  amp.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration + 0.02);
}

function playHaptics(pattern: number | number[]) {
  if (reducedMotion() || muted(HAPTICS_KEY)) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(pattern);
}

export const feedback = {
  /** Meaningful completion — cell passed, XP awarded, order placed. */
  success() {
    playHaptics(12);
    playTone({ freq: 660, duration: 0.06, type: "sine", gain: 0.04 });
  },
  /** Failure — compile/verification failed, payment declined. */
  error() {
    playHaptics([40, 60, 40]);
    playTone({ freq: 180, duration: 0.12, type: "square", gain: 0.028 });
  },
  /** Commit / snap — sheet settled, toggle flipped, item added to cart. */
  commit() {
    playHaptics(8);
    playTone({ freq: 520, duration: 0.024, type: "sine", gain: 0.03 });
  },
  /** User preference toggles (persisted in localStorage). */
  setSound(enabled: boolean) {
    if (typeof window === "undefined") return;
    if (enabled) window.localStorage.removeItem(SOUND_KEY);
    else window.localStorage.setItem(SOUND_KEY, "off");
  },
  setHaptics(enabled: boolean) {
    if (typeof window === "undefined") return;
    if (enabled) window.localStorage.removeItem(HAPTICS_KEY);
    else window.localStorage.setItem(HAPTICS_KEY, "off");
  },
};