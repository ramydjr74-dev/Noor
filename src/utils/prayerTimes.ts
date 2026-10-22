import { PrayerTimesResult } from '../types';

/**
 * Astronomical Prayer Times Calculator (PrayTimes math in pure TypeScript)
 * Operates completely offline with 0 network calls.
 */

// Math helpers in degrees
const dsin = (d: number) => Math.sin((d * Math.PI) / 180);
const dcos = (d: number) => Math.cos((d * Math.PI) / 180);
const dtan = (d: number) => Math.tan((d * Math.PI) / 180);
const darcsin = (x: number) => (Math.asin(x) * 180) / Math.PI;
const darccos = (x: number) => (Math.acos(x) * 180) / Math.PI;
const darctan = (x: number) => (Math.atan(x) * 180) / Math.PI;
const darctan2 = (y: number, x: number) => (Math.atan2(y, x) * 180) / Math.PI;
const fixAngle = (a: number) => a - 360 * Math.floor(a / 360);
const fixHour = (a: number) => a - 24 * Math.floor(a / 24);

export type CalculationMethodKey = 'MWL' | 'ISNA' | 'Egypt' | 'Makkah' | 'Karachi';

interface MethodParams {
  fajrAngle: number;
  ishaAngle?: number;
  ishaIntervalMinutes?: number; // for Makkah (90 mins after Maghrib)
  name: string;
}

const METHODS: Record<CalculationMethodKey, MethodParams> = {
  Makkah: { fajrAngle: 18.5, ishaIntervalMinutes: 90, name: 'أم القرى (مكة المكرمة)' },
  Egypt: { fajrAngle: 19.5, ishaAngle: 17.5, name: 'الهيئة المصرية العامة للمساحة' },
  MWL: { fajrAngle: 18.0, ishaAngle: 17.0, name: 'رابطة العالم الإسلامي' },
  ISNA: { fajrAngle: 15.0, ishaAngle: 15.0, name: 'الاتحاد الإسلامي لأمريكا الشمالية' },
  Karachi: { fajrAngle: 18.0, ishaAngle: 18.0, name: 'جامعة العلوم الإسلامية بكراتشي' },
};

/**
 * Julian Date calculation
 */
function julianDate(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

/**
 * Sun position: declination & equation of time
 */
function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g));
  const e = 23.439 - 0.00000036 * D;

  const d = darcsin(dsin(e) * dsin(L));
  let RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
  RA = fixHour(RA);

  const EqT = q / 15 - RA;
  return { declination: d, equationOfTime: EqT };
}

/**
 * Calculate prayer times for given coordinates and date
 */
export function calculatePrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
  methodKey: CalculationMethodKey = 'Makkah'
): PrayerTimesResult {
  const method = METHODS[methodKey] || METHODS.Makkah;
  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const sun = sunPosition(jd);

  // Timezone in hours
  const timezone = -date.getTimezoneOffset() / 60;

  // Midday (Dhuhr)
  const dhuhrTime = fixHour(12 + timezone - lng / 15 - sun.equationOfTime);

  // Helper for sun angle time
  const sunAngleTime = (angle: number, direction: 'ccw' | 'cw') => {
    const val = (-dsin(angle) - dsin(lat) * dsin(sun.declination)) / (dcos(lat) * dcos(sun.declination));
    if (val > 1 || val < -1) return dhuhrTime; // Polar regions fallback
    const t = darccos(val) / 15;
    return fixHour(dhuhrTime + (direction === 'ccw' ? -t : t));
  };

  // Asr time (Shafi'i: shadow length = 1)
  const asrTimeCalc = () => {
    const val = darctan(1 + dtan(Math.abs(lat - sun.declination)));
    const t = darccos((-dsin(val) - dsin(lat) * dsin(sun.declination)) / (dcos(lat) * dcos(sun.declination))) / 15;
    return fixHour(dhuhrTime + t);
  };

  const fajrTime = sunAngleTime(method.fajrAngle, 'ccw');
  const sunriseTime = sunAngleTime(0.833, 'ccw');
  const asrTime = asrTimeCalc();
  const maghribTime = sunAngleTime(0.833, 'cw');

  let ishaTime: number;
  if (method.ishaIntervalMinutes) {
    ishaTime = fixHour(maghribTime + method.ishaIntervalMinutes / 60);
  } else {
    ishaTime = sunAngleTime(method.ishaAngle || 17.5, 'cw');
  }

  const formatTime = (time: number): string => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    const h = hours < 10 ? `0${hours}` : `${hours}`;
    const m = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${h}:${m}`;
  };

  const fajrStr = formatTime(fajrTime);
  const sunriseStr = formatTime(sunriseTime);
  const dhuhrStr = formatTime(dhuhrTime);
  const asrStr = formatTime(asrTime);
  const maghribStr = formatTime(maghribTime);
  const ishaStr = formatTime(ishaTime);

  // Next prayer detection
  const nowHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

  const prayers = [
    { name: 'الفجر', time: fajrTime, str: fajrStr },
    { name: 'الشروق', time: sunriseTime, str: sunriseStr },
    { name: 'الظهر', time: dhuhrTime, str: dhuhrStr },
    { name: 'العصر', time: asrTime, str: asrStr },
    { name: 'المغرب', time: maghribTime, str: maghribStr },
    { name: 'العشاء', time: ishaTime, str: ishaStr },
  ];

  let nextPrayer = prayers.find(p => p.time > nowHours);
  let timeRemainingHours = 0;

  if (!nextPrayer) {
    // Next prayer is Fajr tomorrow
    nextPrayer = prayers[0];
    timeRemainingHours = (24 - nowHours) + fajrTime;
  } else {
    timeRemainingHours = nextPrayer.time - nowHours;
  }

  const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingHours * 3600));

  return {
    fajr: fajrStr,
    sunrise: sunriseStr,
    dhuhr: dhuhrStr,
    asr: asrStr,
    maghrib: maghribStr,
    isha: ishaStr,
    nextPrayerName: nextPrayer.name,
    nextPrayerTime: nextPrayer.str,
    timeRemainingSeconds,
  };
}
