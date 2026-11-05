// Web Audio API Synthesizer for MailGuard AI Security Alerts
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch (err) {
    console.warn('AudioContext initialization warning:', err);
    return null;
  }
}

// Unlock audio context on initial user interaction (addresses browser autoplay policies)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true, once: false });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: false });
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: false });
}

export type SoundAlertType = 
  | 'POLICE_SIREN' 
  | 'SECURITY_PING' 
  | 'DIGITAL_BEEP'
  | 'CRITICAL_THREAT'
  | 'HIGH_THREAT'
  | 'ACTION_SUCCESS'
  | 'ACTION_SAFE'
  | 'ACTION_ERROR'
  | 'TEST_CHIME';

export function playThreatAlertSound(
  type: SoundAlertType = 'SECURITY_PING',
  volumePercent: number = 80
) {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Ensure context is running
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const baseVol = Math.max(0.01, Math.min(1.0, (volumePercent / 100) * 0.25));
    const now = ctx.currentTime;

    if (type === 'ACTION_SUCCESS') {
      // Crisp double chime for successful actions (e.g. Move to Spam)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(baseVol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      gain.connect(ctx.destination);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.1); // A5
      osc1.connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.3);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.1); // D6
      osc2.connect(gain);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.3);

    } else if (type === 'ACTION_SAFE') {
      // Warm harmonious chime for Mark Safe
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(baseVol * 0.9, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.35);

    } else if (type === 'ACTION_ERROR') {
      // Low buzz tone for failure/error
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(baseVol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.setValueAtTime(180, now + 0.12);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.3);

    } else if (type === 'CRITICAL_THREAT' || type === 'POLICE_SIREN') {
      // Urgent dual-sweep alert siren for Critical threats
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(baseVol, now + 0.02);
      gain.gain.setValueAtTime(baseVol, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.18);
      osc.frequency.linearRampToValueAtTime(700, now + 0.36);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.45);

    } else if (type === 'HIGH_THREAT') {
      // Urgent two-beep warning for High threats
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(baseVol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      gain.gain.linearRampToValueAtTime(baseVol, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.setValueAtTime(1250, now + 0.15);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.3);

    } else if (type === 'TEST_CHIME') {
      // Short preview beep when clicking unmute
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(baseVol * 0.7, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.2);

    } else {
      // Default SECURITY_PING / DIGITAL_BEEP
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(baseVol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      gain.connect(ctx.destination);

      osc.type = type === 'DIGITAL_BEEP' ? 'square' : 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.warn('Audio alert sound play error:', err);
  }
}

