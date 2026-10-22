/**
 * Audio Alerts and Windows Desktop Notifications
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Generate a pleasant spiritual chime using Web Audio API (100% offline, 0 bytes)
 */
export function playChimeSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonic pentatonic frequencies (A minor / Hijaz tone)
    const notes = [440, 523.25, 659.25, 880];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);

      gain.gain.setValueAtTime(0, now + idx * 0.18);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.18 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 1.3);
    });
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

// Public stable adhan audio endpoints
const ADHAN_URLS = {
  makkah: 'https://cdn.aladhan.com/audio/adhans/makkah.mp3',
  madinah: 'https://cdn.aladhan.com/audio/adhans/madina.mp3',
};

let currentAdhanAudio: HTMLAudioElement | null = null;

export function stopAdhan(): void {
  if (currentAdhanAudio) {
    currentAdhanAudio.pause();
    currentAdhanAudio.currentTime = 0;
    currentAdhanAudio = null;
  }
}

export function playAdhan(type: 'makkah' | 'madinah' | 'chime' = 'makkah'): Promise<void> {
  stopAdhan();

  if (type === 'chime') {
    playChimeSound();
    return Promise.resolve();
  }

  const url = ADHAN_URLS[type] || ADHAN_URLS.makkah;
  currentAdhanAudio = new Audio(url);
  currentAdhanAudio.volume = 0.85;

  return currentAdhanAudio.play().catch(err => {
    console.warn('Network Adhan playback failed, falling back to Web Audio chime:', err);
    playChimeSound();
  });
}

/**
 * Request notification permission for Windows prayer alerts
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Trigger Windows Desktop Notification
 */
export function triggerPrayerNotification(prayerName: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('حان الآن موعد الأذان', {
      body: `حان الآن موعد أذان صلاة ${prayerName}. تقبل الله منا ومنكم صالح الأعمال.`,
      icon: '/pwa-192x192.png',
      dir: 'rtl',
      lang: 'ar',
      silent: false,
    });
  }
}
