import { Ayah } from '../types';
import { BUNDLED_SURAHS } from '../data/bundledSurahs';
import { normalizeArabicForComparison } from './arabicNormalizer';

const CACHE_PREFIX = 'noor_surah_v1_';

export async function fetchSurahAyahs(surahNumber: number): Promise<Ayah[]> {
  // 1. Check bundled offline surahs
  if (BUNDLED_SURAHS[surahNumber]) {
    return BUNDLED_SURAHS[surahNumber];
  }

  // 2. Check local storage cache
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${surahNumber}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  // 3. Fetch from AlQuran Cloud API (Uthmani text + Al-Muyassar Tafseer)
  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,ar.muyassar`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code === 200 && Array.isArray(data.data) && data.data.length >= 2) {
      const uthmaniEdition = data.data[0];
      const tafseerEdition = data.data[1];

      const ayahs: Ayah[] = uthmaniEdition.ayahs.map((ayahObj: any, index: number) => {
        let text = ayahObj.text;
        // Strip duplicate Bismillah from beginning of surahs other than Al-Fatihah (1) and At-Tawbah (9)
        if (surahNumber !== 1 && surahNumber !== 9 && ayahObj.numberInSurah === 1) {
          text = text.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '');
          text = text.replace(/^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/, '');
        }

        const tafseerText = tafseerEdition?.ayahs?.[index]?.text || '';

        return {
          number: ayahObj.number,
          numberInSurah: ayahObj.numberInSurah,
          text: text.trim(),
          juz: ayahObj.juz,
          page: ayahObj.page,
          tafseer: tafseerText,
        };
      });

      // Cache locally for offline use
      try {
        localStorage.setItem(`${CACHE_PREFIX}${surahNumber}`, JSON.stringify(ayahs));
      } catch (err) {
        console.warn('Storage quota exceeded, cannot cache surah:', err);
      }

      return ayahs;
    }
  } catch (error) {
    console.error('Failed to fetch surah online:', error);
  }

  throw new Error('تعذر تحميل السورة. يرجى التأكد من اتصالك بالإنترنت عند فتح هذه السورة لأول مرة.');
}

/**
 * Generate standard EveryAyah audio URL
 */
export function getAyahAudioUrl(surahNumber: number, ayahInSurah: number, reciterSubfolder: string): string {
  const sStr = String(surahNumber).padStart(3, '0');
  const aStr = String(ayahInSurah).padStart(3, '0');
  return `https://everyayah.com/data/${reciterSubfolder}/${sStr}${aStr}.mp3`;
}

/**
 * Search inside cached and bundled verses
 */
export function searchInVerses(query: string): { surahNumber: number; ayahNumber: number; text: string }[] {
  const normalizedQuery = normalizeArabicForComparison(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  const results: { surahNumber: number; ayahNumber: number; text: string }[] = [];

  // Search bundled surahs
  for (const [sNumStr, ayahs] of Object.entries(BUNDLED_SURAHS)) {
    const sNum = parseInt(sNumStr, 10);
    for (const a of ayahs) {
      if (normalizeArabicForComparison(a.text).includes(normalizedQuery)) {
        results.push({
          surahNumber: sNum,
          ayahNumber: a.numberInSurah,
          text: a.text,
        });
        if (results.length >= 30) return results;
      }
    }
  }

  // Search cached surahs in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        const sNum = parseInt(key.replace(CACHE_PREFIX, ''), 10);
        if (BUNDLED_SURAHS[sNum]) continue; // already searched
        const val = localStorage.getItem(key);
        if (val) {
          const ayahs: Ayah[] = JSON.parse(val);
          for (const a of ayahs) {
            if (normalizeArabicForComparison(a.text).includes(normalizedQuery)) {
              results.push({
                surahNumber: sNum,
                ayahNumber: a.numberInSurah,
                text: a.text,
              });
              if (results.length >= 30) return results;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Search error in localStorage:', e);
  }

  return results;
}
