import { RecitationResult, RecitationWordDiff } from '../types';

/**
 * Remove all Arabic diacritical marks (Tashkeel / Harakat / Quranic annotation marks)
 */
export function removeTashkeel(text: string): string {
  if (!text) return '';
  return text
    // Strip standard tashkeel
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Strip Quranic pause signs and special marks
    .replace(/[\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    // Strip tatweel (kashida)
    .replace(/\u0640/g, '')
    // Strip brackets, numbers, and punctuation
    .replace(/[٠-٩0-9\(\)\[\]\{\}«»\-–—،؛؟\.\:\,\;]/g, ' ')
    .trim();
}

/**
 * Normalize Arabic characters for flexible speech/typing comparison:
 * - Unifies alefs (أ إ آ ٱ -> ا)
 * - Normalizes Taa Marbutah (ة -> ه)
 * - Normalizes Alef Maqsura (ى -> ي)
 * - Normalizes Hamza on waw/yaa (ؤ, ئ -> ء / generic)
 */
export function normalizeArabicForComparison(text: string): string {
  if (!text) return '';
  return removeTashkeel(text)
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Remove extra whitespaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean spoken text from speech recognition before comparing
 */
export function cleanSpokenArabic(text: string): string {
  return normalizeArabicForComparison(text)
    // Remove common verbal fillers if any
    .replace(/\b(يعني|اممم|اه)\b/g, '')
    .trim();
}

/**
 * Compute simple Levenshtein distance between two Arabic words
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix: number[][] = [];
  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[m][n];
}

/**
 * Check if two normalized Arabic words are considered a match (allowing 1 typo / phonetic similarity on longer words)
 */
export function isWordMatch(expected: string, spoken: string): boolean {
  if (expected === spoken) return true;
  if (expected.length >= 4 && spoken.length >= 4) {
    const dist = levenshteinDistance(expected, spoken);
    if (dist <= 1) return true;
  }
  return false;
}

/**
 * Compare spoken recitation with expected Quran text word by word.
 * Generates an accurate diff with 'correct', 'wrong', 'missing', or 'extra'.
 */
export function evaluateRecitation(expectedAyahText: string, userRecitedText: string): RecitationResult {
  const rawExpectedWords = expectedAyahText.trim().split(/\s+/).filter(Boolean);
  const normalizedExpected = rawExpectedWords.map(w => normalizeArabicForComparison(w));
  
  const rawSpokenWords = userRecitedText.trim().split(/\s+/).filter(Boolean);
  const normalizedSpoken = rawSpokenWords.map(w => normalizeArabicForComparison(w));

  const diffs: RecitationWordDiff[] = [];
  let expIdx = 0;
  let spkIdx = 0;
  let correctCount = 0;

  while (expIdx < normalizedExpected.length || spkIdx < normalizedSpoken.length) {
    const expWord = normalizedExpected[expIdx];
    const rawExpWord = rawExpectedWords[expIdx];
    const spkWord = normalizedSpoken[spkIdx];
    const rawSpkWord = rawSpokenWords[spkIdx];

    if (expIdx < normalizedExpected.length && spkIdx < normalizedSpoken.length) {
      if (isWordMatch(expWord, spkWord)) {
        diffs.push({
          expected: rawExpWord,
          spoken: rawSpkWord,
          status: 'correct',
        });
        correctCount++;
        expIdx++;
        spkIdx++;
      } else {
        // Look ahead to see if the user skipped this expected word or recited an extra word
        const nextExpMatch = normalizedExpected.slice(expIdx + 1, expIdx + 4).findIndex(w => isWordMatch(w, spkWord));
        const nextSpkMatch = normalizedSpoken.slice(spkIdx + 1, spkIdx + 4).findIndex(w => isWordMatch(expWord, w));

        if (nextExpMatch !== -1 && (nextSpkMatch === -1 || nextExpMatch <= nextSpkMatch)) {
          // Expected word was skipped by user
          diffs.push({
            expected: rawExpWord,
            status: 'missing',
          });
          expIdx++;
        } else if (nextSpkMatch !== -1) {
          // User spoke an extra word not in text
          diffs.push({
            expected: '',
            spoken: rawSpkWord,
            status: 'extra',
          });
          spkIdx++;
        } else {
          // Substituted / wrong word
          diffs.push({
            expected: rawExpWord,
            spoken: rawSpkWord,
            status: 'wrong',
          });
          expIdx++;
          spkIdx++;
        }
      }
    } else if (expIdx < normalizedExpected.length) {
      // Remaining expected words were omitted
      diffs.push({
        expected: rawExpWord,
        status: 'missing',
      });
      expIdx++;
    } else {
      // User spoke extra words at the end
      diffs.push({
        expected: '',
        spoken: rawSpkWord,
        status: 'extra',
      });
      spkIdx++;
    }
  }

  const totalExpected = rawExpectedWords.length;
  const accuracy = totalExpected > 0 ? Math.round((correctCount / totalExpected) * 100) : 0;

  return {
    accuracy: Math.min(100, Math.max(0, accuracy)),
    diffs,
    correctCount,
    totalExpected,
    spokenText: userRecitedText,
    expectedText: expectedAyahText,
  };
}
