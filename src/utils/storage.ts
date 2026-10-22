import { AppSettings, MemorizationRecord } from '../types';

const SETTINGS_KEY = 'noor_settings_v1';
const MEMORIZATION_KEY = 'noor_memorization_v1';
const BOOKMARKS_KEY = 'noor_bookmarks_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  reciterId: 'mishary',
  fontSize: 28,
  fontFamily: 'amiri-quran',
  selectedCity: 'مكة المكرمة',
  calculationMethod: 'Makkah',
  adhanAudioEnabled: true,
  adhanType: 'makkah',
  lowMemoryMode: false,
  autoPlayNextAyah: true,
  lastReadSurah: 1,
  lastReadAyah: 1,
};

export function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

export function loadMemorizationRecords(): Record<number, MemorizationRecord> {
  try {
    const data = localStorage.getItem(MEMORIZATION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load memorization records:', e);
  }
  return {};
}

export function saveMemorizationRecord(record: MemorizationRecord): void {
  try {
    const current = loadMemorizationRecords();
    current[record.surahNumber] = record;
    localStorage.setItem(MEMORIZATION_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save memorization record:', e);
  }
}

export function loadBookmarks(): { surahNumber: number; ayahNumber: number; surahName: string; timestamp: number }[] {
  try {
    const data = localStorage.getItem(BOOKMARKS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load bookmarks:', e);
  }
  return [];
}

export function toggleBookmark(surahNumber: number, ayahNumber: number, surahName: string): boolean {
  try {
    const bookmarks = loadBookmarks();
    const index = bookmarks.findIndex(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);
    if (index >= 0) {
      bookmarks.splice(index, 1);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return false; // Removed
    } else {
      bookmarks.unshift({
        surahNumber,
        ayahNumber,
        surahName,
        timestamp: Date.now(),
      });
      // Keep max 50 bookmarks
      if (bookmarks.length > 50) bookmarks.pop();
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return true; // Added
    }
  } catch (e) {
    console.warn('Failed to toggle bookmark:', e);
    return false;
  }
}

/**
 * Export all application data as a JSON file download for Windows users
 */
export function exportAppData(): void {
  const exportPayload = {
    appName: 'NOOR',
    exportDate: new Date().toISOString(),
    settings: loadSettings(),
    memorization: loadMemorizationRecords(),
    bookmarks: loadBookmarks(),
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `noor_quran_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Import application data from JSON
 */
export function importAppData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }
    if (parsed.memorization) {
      localStorage.setItem(MEMORIZATION_KEY, JSON.stringify(parsed.memorization));
    }
    if (parsed.bookmarks) {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(parsed.bookmarks));
    }
    return true;
  } catch (e) {
    console.error('Failed to parse import data:', e);
    return false;
  }
}
