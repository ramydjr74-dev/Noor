export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
  page: number;
}

export interface Ayah {
  number: number; // Number in all Quran (1-6236)
  numberInSurah: number;
  text: string;
  audioUrl?: string;
  juz?: number;
  page?: number;
  tafseer?: string;
}

export interface Reciter {
  id: string;
  name: string;
  subfolder: string; // EveryAyah folder name
  bitrate: string;
}

export interface PrayerTimesResult {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  nextPrayerName: string;
  nextPrayerTime: string;
  timeRemainingSeconds: number;
}

export interface CityLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: number; // UTC offset in hours
}

export interface MemorizationRecord {
  surahNumber: number;
  status: 'not_started' | 'memorizing' | 'memorized' | 'needs_revision';
  lastPracticedDate?: string;
  nextReviewDate?: string;
  accuracyScore?: number;
  memorizedAyahs: number[]; // array of ayah numbers in surah
  totalAyahs: number;
}

export interface RecitationWordDiff {
  expected: string;
  spoken?: string;
  status: 'correct' | 'wrong' | 'missing' | 'extra';
}

export interface RecitationResult {
  accuracy: number;
  diffs: RecitationWordDiff[];
  correctCount: number;
  totalExpected: number;
  spokenText: string;
  expectedText: string;
}

export interface ZikrItem {
  id: string;
  text: string;
  count: number;
  currentCount?: number;
  source: string;
  reward?: string;
}

export interface AppSettings {
  reciterId: string;
  fontSize: number;
  fontFamily: 'amiri-quran' | 'amiri' | 'cairo';
  selectedCity: string;
  calculationMethod: 'MWL' | 'ISNA' | 'Egypt' | 'Makkah' | 'Karachi';
  adhanAudioEnabled: boolean;
  adhanType: 'makkah' | 'madinah' | 'chime';
  lowMemoryMode: boolean;
  autoPlayNextAyah: boolean;
  lastReadSurah: number;
  lastReadAyah: number;
}
