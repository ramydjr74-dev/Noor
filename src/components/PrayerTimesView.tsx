import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  MapPin, 
  Compass, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Compass as CompassIcon,
  Sparkles,
  Navigation,
  CheckCircle,
  Radio
} from 'lucide-react';
import { calculatePrayerTimes, CalculationMethodKey } from '../utils/prayerTimes';
import { calculateQiblaDirection } from '../utils/qibla';
import { CITIES_LIST } from '../data/citiesData';
import { PrayerTimesResult, CityLocation } from '../types';
import { playAdhan, stopAdhan, requestNotificationPermission, triggerPrayerNotification } from '../utils/audioAlert';
import { loadSettings, saveSettings } from '../utils/storage';
import { getHijriDate } from '../utils/hijriCalendar';

export const PrayerTimesView: React.FC = () => {
  const [settings, setSettings] = useState(() => loadSettings());
  const [selectedCityName, setSelectedCityName] = useState<string>(settings.selectedCity || 'مكة المكرمة');
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethodKey>(
    (settings.calculationMethod as CalculationMethodKey) || 'Makkah'
  );
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);
  const [isPlayingTestAdhan, setIsPlayingTestAdhan] = useState<boolean>(false);

  // Time state for live ticking
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Hijri Date
  const hijriInfo = useMemo(() => getHijriDate(currentTime), [currentTime]);

  // Tick clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current active city
  const activeCity: CityLocation = useMemo(() => {
    return CITIES_LIST.find(c => c.name === selectedCityName) || CITIES_LIST[0];
  }, [selectedCityName]);

  const activeLat = customCoords ? customCoords.lat : activeCity.latitude;
  const activeLng = customCoords ? customCoords.lng : activeCity.longitude;

  // Calculate prayer times
  const prayerResult: PrayerTimesResult = useMemo(() => {
    return calculatePrayerTimes(activeLat, activeLng, currentTime, calculationMethod);
  }, [activeLat, activeLng, currentTime, calculationMethod]);

  // Calculate Qibla bearing
  const qiblaAngle = useMemo(() => {
    return calculateQiblaDirection(activeLat, activeLng);
  }, [activeLat, activeLng]);

  // Check notification status on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationEnabled(true);
    }
  }, []);

  const handleCityChange = (cityName: string) => {
    setSelectedCityName(cityName);
    setCustomCoords(null);
    const s = loadSettings();
    saveSettings({ ...s, selectedCity: cityName });
  };

  const handleMethodChange = (method: CalculationMethodKey) => {
    setCalculationMethod(method);
    const s = loadSettings();
    saveSettings({ ...s, calculationMethod: method });
  };

  const handleGPSDetect = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setSelectedCityName('موقعي الحالي (GPS)');
        },
        (err) => {
          alert('تعذر تحديد الموقع الجغرافي تلقائياً. يمكنك اختيار مدينتك من القائمة.');
        }
      );
    }
  };

  const toggleNotifications = async () => {
    if (!notificationEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationEnabled(true);
        triggerPrayerNotification(prayerResult.nextPrayerName);
      } else {
        alert('يرجى تفعيل إذن الإشعارات في متصفحك للحصول على تنبيهات الأذان.');
      }
    } else {
      setNotificationEnabled(false);
    }
  };

  const toggleTestAdhan = () => {
    if (isPlayingTestAdhan) {
      stopAdhan();
      setIsPlayingTestAdhan(false);
    } else {
      setIsPlayingTestAdhan(true);
      playAdhan(settings.adhanType || 'makkah')
        .finally(() => {
          // Can stop when user clicks again
        });
    }
  };

  // Format seconds countdown
  const hoursRemaining = Math.floor(prayerResult.timeRemainingSeconds / 3600);
  const minutesRemaining = Math.floor((prayerResult.timeRemainingSeconds % 3600) / 60);
  const secondsRemaining = prayerResult.timeRemainingSeconds % 60;

  const prayersList = [
    { id: 'fajr', name: 'الفجر', time: prayerResult.fajr, icon: '🌙' },
    { id: 'sunrise', name: 'الشروق', time: prayerResult.sunrise, icon: '🌅' },
    { id: 'dhuhr', name: 'الظهر', time: prayerResult.dhuhr, icon: '☀️' },
    { id: 'asr', name: 'العصر', time: prayerResult.asr, icon: '🌤️' },
    { id: 'maghrib', name: 'المغرب', time: prayerResult.maghrib, icon: '🌇' },
    { id: 'isha', name: 'العشاء', time: prayerResult.isha, icon: '🌌' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-28">
      {/* Hero Prayer Countdown Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#07281c] via-[#0b3827] to-[#041a11] border border-[#1b583e] p-6 sm:p-8 mb-6 shadow-2xl text-center overflow-hidden">
        {/* Subtle decorative dome background element */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#d4af37]/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 pb-4 border-b border-[#14422e]">
          {/* City & GPS indicator */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#d4af37]" />
            <span className="font-bold text-base text-[#f5e7b5]">
              {selectedCityName}
            </span>
            <button
              onClick={handleGPSDetect}
              className="text-[11px] text-[#93bba8] hover:text-[#d4af37] bg-[#051a12] px-2 py-0.5 rounded-md border border-[#16422f] cursor-pointer"
              title="تحديد الموقع عبر GPS"
            >
              تحديد تلقائي
            </button>
          </div>

          {/* Hijri & Gregorian Date */}
          <div className="text-xs text-[#a9dbc0] font-amiri font-bold">
            {hijriInfo.formatted} • {currentTime.toLocaleDateString('ar-EG', { weekday: 'long' })}
          </div>
        </div>

        {/* Next Prayer Highlight */}
        <div className="mb-4">
          <span className="text-xs font-semibold text-[#86a798] uppercase tracking-wider block mb-1">
            الصلاة القادمة
          </span>
          <h2 className="text-3xl sm:text-4xl font-amiri font-bold text-gold-gradient mb-2">
            صلاة {prayerResult.nextPrayerName}
          </h2>
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#051a12]/80 border border-[#d4af37]/40 text-[#fff2b2] text-sm font-bold font-mono">
            موعد الأذان: {prayerResult.nextPrayerTime}
          </div>
        </div>

        {/* Countdown Digits */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 my-6">
          <div className="bg-[#051c13] border border-[#184e36] px-4 py-3 rounded-2xl min-w-18 shadow-inner">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#f5e7b5]">
              {String(hoursRemaining).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[#86a798] block mt-1">ساعة</span>
          </div>
          <span className="text-xl font-bold text-[#d4af37] animate-pulse">:</span>
          <div className="bg-[#051c13] border border-[#184e36] px-4 py-3 rounded-2xl min-w-18 shadow-inner">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#f5e7b5]">
              {String(minutesRemaining).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[#86a798] block mt-1">دقيقة</span>
          </div>
          <span className="text-xl font-bold text-[#d4af37] animate-pulse">:</span>
          <div className="bg-[#051c13] border border-[#184e36] px-4 py-3 rounded-2xl min-w-18 shadow-inner">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#d4af37]">
              {String(secondsRemaining).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[#86a798] block mt-1">ثانية</span>
          </div>
        </div>

        {/* Adhan & Notification Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {/* Test Adhan sound */}
          <button
            onClick={toggleTestAdhan}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isPlayingTestAdhan
                ? 'bg-rose-900/60 text-rose-200 border-rose-700'
                : 'bg-[#051c13] hover:bg-[#0c3122] text-[#f5e7b5] border-[#1b553c]'
            }`}
          >
            {isPlayingTestAdhan ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>إيقاف صوت الأذان</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-[#d4af37]" />
                <span>تجربة صوت الأذان</span>
              </>
            )}
          </button>

          {/* Windows Notification Toggle */}
          <button
            onClick={toggleNotifications}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              notificationEnabled
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                : 'bg-[#051c13] hover:bg-[#0c3122] text-[#86a798] border-[#1b553c]'
            }`}
          >
            {notificationEnabled ? (
              <>
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>تنبيهات الويندوز مفعلة</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 text-gray-400" />
                <span>تفعيل تنبيهات الأذان للويندوز</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of 6 Prayer Times */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {prayersList.map(p => {
          const isNext = prayerResult.nextPrayerName === p.name;
          return (
            <div
              key={p.id}
              className={`rounded-2xl p-4 text-center transition border ${
                isNext
                  ? 'bg-gradient-to-b from-[#0c3f2b] to-[#072418] border-[#d4af37] shadow-lg shadow-[#d4af37]/15 ring-1 ring-[#d4af37]/40'
                  : 'bg-[#072117] border-[#133c2a] hover:bg-[#09281d]'
              }`}
            >
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className="font-amiri font-bold text-base text-[#f5e7b5] mb-1">
                {p.name}
              </div>
              <div className={`font-mono text-lg font-extrabold ${isNext ? 'text-[#d4af37]' : 'text-[#cce2d6]'}`}>
                {p.time}
              </div>
              {isNext && (
                <span className="inline-block mt-1 text-[10px] bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded-full font-bold">
                  القادمة
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings & Qibla Compass Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City and Calculation Method Preferences */}
        <div className="bg-[#082419] rounded-2xl border border-[#164933] p-5 shadow-lg">
          <h3 className="font-bold text-base text-[#f5e7b5] mb-4 font-amiri flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#d4af37]" />
            <span>إعدادات الموقع والحساب الفلكي</span>
          </h3>

          {/* City Selection Dropdown */}
          <div className="mb-4">
            <label className="text-xs text-[#86a798] block mb-1.5 font-bold">
              المدينة المحددة (بدون إنترنت):
            </label>
            <select
              value={selectedCityName}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full bg-[#051a12] border border-[#184e36] text-[#e3ece6] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#d4af37] cursor-pointer"
            >
              {CITIES_LIST.map(city => (
                <option key={city.name} value={city.name} className="bg-[#062419]">
                  {city.name} ({city.country})
                </option>
              ))}
            </select>
          </div>

          {/* Calculation Method Dropdown */}
          <div className="mb-4">
            <label className="text-xs text-[#86a798] block mb-1.5 font-bold">
              طريقة الحساب الفلكي:
            </label>
            <select
              value={calculationMethod}
              onChange={(e) => handleMethodChange(e.target.value as CalculationMethodKey)}
              className="w-full bg-[#051a12] border border-[#184e36] text-[#e3ece6] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#d4af37] cursor-pointer"
            >
              <option value="Makkah" className="bg-[#062419]">تقويم أم القرى (مكة المكرمة)</option>
              <option value="Egypt" className="bg-[#062419]">الهيئة المصرية العامة للمساحة</option>
              <option value="MWL" className="bg-[#062419]">رابطة العالم الإسلامي</option>
              <option value="Karachi" className="bg-[#062419]">جامعة العلوم الإسلامية بكراتشي</option>
              <option value="ISNA" className="bg-[#062419]">الاتحاد الإسلامي لأمريكا الشمالية (ISNA)</option>
            </select>
          </div>

          {/* Adhan Sound preference */}
          <div>
            <label className="text-xs text-[#86a798] block mb-1.5 font-bold">
              صوت الأذان المفضل:
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'makkah', label: 'أذان مكة' },
                { id: 'madinah', label: 'أذان المدينة' },
                { id: 'chime', label: 'نغمة تنبيه هادئة' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const s = loadSettings();
                    saveSettings({ ...s, adhanType: opt.id as any });
                    setSettings({ ...s, adhanType: opt.id as any });
                  }}
                  className={`flex-1 py-2 text-xs rounded-xl border transition cursor-pointer font-bold ${
                    settings.adhanType === opt.id
                      ? 'bg-[#0e4730] border-[#d4af37] text-[#fff6d6]'
                      : 'bg-[#051a12] border-[#16422f] text-[#86a798] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Qibla Compass Card */}
        <div className="bg-[#082419] rounded-2xl border border-[#164933] p-5 shadow-lg flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-3">
            <CompassIcon className="w-5 h-5 text-[#d4af37]" />
            <h3 className="font-bold text-base text-[#f5e7b5] font-amiri">
              بوصلة القبلة المشرفة
            </h3>
          </div>

          <p className="text-xs text-[#86a798] mb-4">
            اتجاه الكعبة المشرفة من {selectedCityName}: <strong className="text-[#d4af37] font-mono text-sm">{qiblaAngle}°</strong> من الشمال الحقيقي
          </p>

          {/* Visual Compass Dial */}
          <div className="relative w-44 h-44 rounded-full border-4 border-[#184d36] bg-[#051a12] flex items-center justify-center shadow-inner">
            {/* North Indicator */}
            <span className="absolute top-2 font-bold text-xs text-rose-500">N (الشمال)</span>
            <span className="absolute bottom-2 font-bold text-xs text-gray-500">S</span>
            <span className="absolute right-2 font-bold text-xs text-gray-500">E (الشرق)</span>
            <span className="absolute left-2 font-bold text-xs text-gray-500">W (الغرب)</span>

            {/* Rotating Qibla Needle */}
            <div 
              className="absolute w-full h-full flex items-center justify-center transition-transform duration-700"
              style={{ transform: `rotate(${qiblaAngle}deg)` }}
            >
              {/* Pointer to Kaaba */}
              <div className="flex flex-col items-center -translate-y-9">
                <div className="w-3 h-3 bg-[#d4af37] rotate-45 mb-1 shadow-md shadow-[#d4af37]/40" />
                <span className="text-[10px] font-bold text-[#f5e7b5] bg-[#0c3f2b] px-1.5 py-0.5 rounded border border-[#d4af37]/50 whitespace-nowrap">
                  الكعبة 🕋
                </span>
                <div className="w-0.5 h-10 bg-gradient-to-t from-[#d4af37] to-transparent mt-1" />
              </div>
            </div>

            {/* Center Pivot */}
            <div className="w-5 h-5 rounded-full bg-[#d4af37] border-2 border-[#051a12] z-10 shadow" />
          </div>

          <div className="text-[11px] text-[#789d8d] mt-3">
            حساب فلكي دقيق 100% دون الحاجة للاتصال بالإنترنت
          </div>
        </div>
      </div>
    </div>
  );
};
