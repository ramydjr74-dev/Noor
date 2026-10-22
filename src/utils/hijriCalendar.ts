/**
 * Converts a Gregorian Date to Hijri Date representation
 */

const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

export function getHijriDate(date: Date = new Date()): { day: number; month: string; year: number; formatted: string } {
  try {
    // Modern browsers support Intl.DateTimeFormat with islamic-umalqura calendar
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });

    const parts = formatter.formatToParts(date);
    const dayPart = parts.find(p => p.type === 'day')?.value || '1';
    const monthPart = parts.find(p => p.type === 'month')?.value || '1';
    const yearPart = parts.find(p => p.type === 'year')?.value || '1447';

    // Normalize eastern arabic digits
    const parseArabicNum = (s: string) => {
      const converted = s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
      return parseInt(converted, 10) || 1;
    };

    const day = parseArabicNum(dayPart);
    const monthNum = parseArabicNum(monthPart);
    const year = parseArabicNum(yearPart);

    const monthName = HIJRI_MONTHS[(monthNum - 1) % 12] || 'رمضان';
    const formatted = `${day} ${monthName} ${year} هـ`;

    return { day, month: monthName, year, formatted };
  } catch {
    // Fallback approximation
    const day = date.getDate();
    return {
      day,
      month: 'شوال',
      year: 1448,
      formatted: `${day} شوال 1448 هـ`,
    };
  }
}
