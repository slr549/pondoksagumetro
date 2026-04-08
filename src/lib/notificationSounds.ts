export type SoundOption = {
  id: string;
  label: string;
  isCustom?: boolean;
  url?: string;
};

export const BUILT_IN_SOUNDS: SoundOption[] = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "ding", label: "Ding" },
  { id: "pop", label: "Pop" },
  { id: "alert", label: "Alert" },
];

// Merged list used by UI — built-in + custom
export let SOUND_OPTIONS: SoundOption[] = [...BUILT_IN_SOUNDS];

export function setSoundOptions(custom: SoundOption[]) {
  SOUND_OPTIONS = [...BUILT_IN_SOUNDS, ...custom];
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playNotificationSound(soundId: string, volume: number) {
  // Check if it's a custom sound
  const opt = SOUND_OPTIONS.find(s => s.id === soundId);
  if (opt?.isCustom && opt.url) {
    const audio = new Audio(opt.url);
    audio.volume = volume / 100;
    audio.play().catch(() => {});
    return;
  }

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  switch (soundId) {
    case "chime": {
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(volume / 100, now + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.4);
      });
      break;
    }
    case "bell": {
      [880, 1760, 2640].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        const amp = (volume / 100) / (i + 1);
        g.gain.setValueAtTime(amp, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(g).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      });
      break;
    }
    case "ding": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume / 100, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }
    case "pop": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume / 100, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }
    case "alert": {
      [0, 0.2].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = i === 0 ? 800 : 1000;
        const g = ctx.createGain();
        g.gain.setValueAtTime((volume / 100) * 0.3, now + offset);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
      break;
    }
    default:
      playNotificationSound("chime", volume);
  }
}
