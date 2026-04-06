export type SoundOption = {
  id: string;
  label: string;
};

export const SOUND_OPTIONS: SoundOption[] = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "ding", label: "Ding" },
  { id: "pop", label: "Pop" },
  { id: "alert", label: "Alert" },
];

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playNotificationSound(soundId: string, volume: number) {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.value = volume / 100;

  const now = ctx.currentTime;

  switch (soundId) {
    case "chime": {
      // Two-tone chime
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
      // Bell-like tone with harmonics
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
      // Quick high ding
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
      // Short pop sound
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
      // Urgent two-tone alert
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
