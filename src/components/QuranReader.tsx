import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Play, 
  Bookmark, 
  BookmarkCheck, 
  BookOpen, 
  Mic, 
  Copy, 
  Check, 
  Type, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  Sparkles,
  Info
} from 'lucide-react';
import { ALL_SURAHS } from '../data/quranMetadata';
import { SurahMeta, Ayah } from '../types';
import { fetchSurahAyahs, searchInVerses } from '../utils/quranApi';
import { toggleBookmark, loadBookmarks, saveSettings, loadSettings } from '../utils/storage';
import { normalizeArabicForComparison } from '../utils/arabicNormalizer';

interface QuranReaderProps {
  initialSurah?: number;
  initialAyah?: number;
  onPlayAyah: (surahNumber: number, ayahNumber: number, surahName: string, totalAyahs: number) => void;
  activePlayingAyah: number | null;
  activePlayingSurah: number | null;
  onTestAyahInMemorize: (surahNumber: number, ayahNumber: number) => void;
}

export const QuranReader: React.FC<QuranReaderProps> = ({
  initialSurah = 1,
  initialAyah = 1,
  onPlayAyah,
  activePlayingAyah,
  activePlayingSurah,
  onTestAyahInMemorize,
}) => {
  const [currentSurahNumber, setCurrentSurahNumber] = useState<number>(initialSurah);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filters
  const [surahSearchQuery, setSurahSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'Meccan' | 'Medinan'>('all');
  const [isSurahDrawerOpen, setIsSurahDrawerOpen] = useState<boolean>(false);

  // Settings
  const [fontSize, setFontSize] = useState<number>(() => loadSettings().fontSize || 28);
  const [fontFamily, setFontFamily] = useState<'amiri-quran' | 'amiri' | 'cairo'>(() => loadSettings().fontFamily || 'amiri-quran');

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState(() => loadBookmarks());

  // Tafseer modal state
  const [activeTafseerAyah, setActiveTafseerAyah] = useState<Ayah | null>(null);

  // Copied feedback
  const [copiedAyahNum, setCopiedAyahNum] = useState<number | null>(null);

  // Current surah metadata
  const currentSurahMeta: SurahMeta = useMemo(() => {
    return ALL_SURAHS.find(s => s.number === currentSurahNumber) || ALL_SURAHS[0];
  }, [currentSurahNumber]);

  // Load Ayahs for current Surah
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    fetchSurahAyahs(currentSurahNumber)
      .then(loadedAyahs => {
        if (isMounted) {
          setAyahs(loadedAyahs);
          setIsLoading(false);
          // Update last read setting
          const s = loadSettings();
          saveSettings({ ...s, lastReadSurah: currentSurahNumber });
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error(err);
          setFetchError(err.message || 'تعذر تحميل السورة. تأكد من اتصال الإنترنت.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentSurahNumber]);

  // Filter surahs in drawer
  const filteredSurahs = useMemo(() => {
    const q = normalizeArabicForComparison(surahSearchQuery);
    return ALL_SURAHS.filter(s => {
      const matchType = selectedTypeFilter === 'all' || s.revelationType === selectedTypeFilter;
      if (!matchType) return false;
      if (!q) return true;
      const matchArabic = normalizeArabicForComparison(s.name).includes(q);
      const matchEnglish = s.englishName.toLowerCase().includes(surahSearchQuery.toLowerCase());
      const matchNum = String(s.number) === surahSearchQuery.trim();
      return matchArabic || matchEnglish || matchNum;
    });
  }, [surahSearchQuery, selectedTypeFilter]);

  // Check if an ayah is bookmarked
  const isBookmarked = (ayahNum: number) => {
    return bookmarks.some(b => b.surahNumber === currentSurahNumber && b.ayahNumber === ayahNum);
  };

  const handleToggleBookmark = (ayahNum: number) => {
    toggleBookmark(currentSurahNumber, ayahNum, currentSurahMeta.name);
    setBookmarks(loadBookmarks());
  };

  const handleCopyAyah = (ayah: Ayah) => {
    const textToCopy = `${ayah.text} [سورة ${currentSurahMeta.name}: ${ayah.numberInSurah}]`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedAyahNum(ayah.numberInSurah);
    setTimeout(() => setCopiedAyahNum(null), 2000);
  };

  const updateFontSize = (delta: number) => {
    const newSize = Math.max(18, Math.min(48, fontSize + delta));
    setFontSize(newSize);
    const s = loadSettings();
    saveSettings({ ...s, fontSize: newSize });
  };

  const updateFontFamily = (f: 'amiri-quran' | 'amiri' | 'cairo') => {
    setFontFamily(f);
    const s = loadSettings();
    saveSettings({ ...s, fontFamily: f });
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-28">
      {/* Top Controls Bar: Surah Picker & Reader Settings */}
      <div className="bg-[#082419] rounded-2xl border border-[#164933] p-3 sm:p-4 mb-6 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Surah Selector Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSurahDrawerOpen(true)}
            className="flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#0c3f2b] to-[#114f36] hover:from-[#114f36] hover:to-[#176243] text-[#fff6d6] border border-[#d4af37]/40 shadow-sm cursor-pointer transition font-bold"
          >
            <BookOpen className="w-4 h-4 text-[#d4af37]" />
            <span className="font-amiri text-base sm:text-lg">
              سورة {currentSurahMeta.name}
            </span>
            <span className="text-xs text-[#d4af37] bg-[#051a12]/60 px-2 py-0.5 rounded-md border border-[#d4af37]/20">
              {currentSurahMeta.number}
            </span>
          </button>

          {/* Quick Prev / Next Surah */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentSurahNumber(Math.max(1, currentSurahNumber - 1))}
              disabled={currentSurahNumber <= 1}
              className="p-2 rounded-lg bg-[#061d14] hover:bg-[#0c3123] text-[#a9dbc0] disabled:opacity-30 disabled:hover:bg-[#061d14] border border-[#16422f] cursor-pointer"
              title="السورة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentSurahNumber(Math.min(114, currentSurahNumber + 1))}
              disabled={currentSurahNumber >= 114}
              className="p-2 rounded-lg bg-[#061d14] hover:bg-[#0c3123] text-[#a9dbc0] disabled:opacity-30 disabled:hover:bg-[#061d14] border border-[#16422f] cursor-pointer"
              title="السورة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Font Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Font Family selector */}
          <div className="flex items-center rounded-lg bg-[#051a12] p-0.5 border border-[#16422f] text-xs">
            <button
              onClick={() => updateFontFamily('amiri-quran')}
              className={`px-2 py-1 rounded cursor-pointer ${
                fontFamily === 'amiri-quran' ? 'bg-[#0f442f] text-[#f5e7b5] font-bold' : 'text-[#84a395]'
              }`}
            >
              مصحف
            </button>
            <button
              onClick={() => updateFontFamily('amiri')}
              className={`px-2 py-1 rounded cursor-pointer ${
                fontFamily === 'amiri' ? 'bg-[#0f442f] text-[#f5e7b5] font-bold' : 'text-[#84a395]'
              }`}
            >
              أميري
            </button>
            <button
              onClick={() => updateFontFamily('cairo')}
              className={`px-2 py-1 rounded cursor-pointer ${
                fontFamily === 'cairo' ? 'bg-[#0f442f] text-[#f5e7b5] font-bold' : 'text-[#84a395]'
              }`}
            >
              حديث
            </button>
          </div>

          {/* Font Size (+ / -) */}
          <div className="flex items-center gap-1 bg-[#051a12] px-2 py-1 rounded-lg border border-[#16422f]">
            <Type className="w-3.5 h-3.5 text-[#d4af37]" />
            <button
              onClick={() => updateFontSize(-2)}
              className="px-1.5 py-0.5 text-xs text-[#a9dbc0] hover:text-white cursor-pointer font-bold"
              title="تصغير الخط"
            >
              -
            </button>
            <span className="text-xs text-[#d4af37] font-mono min-w-5 text-center">
              {fontSize}
            </span>
            <button
              onClick={() => updateFontSize(2)}
              className="px-1.5 py-0.5 text-xs text-[#a9dbc0] hover:text-white cursor-pointer font-bold"
              title="تكبير الخط"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Surah Details Banner */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#092b1e] to-[#061d14] border border-[#1a553c] p-6 mb-6 text-center shadow-lg overflow-hidden">
        {/* Subtle decorative corners */}
        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#d4af37]/40 rounded-tr-lg pointer-events-none" />
        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#d4af37]/40 rounded-tl-lg pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#d4af37]/40 rounded-br-lg pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#d4af37]/40 rounded-bl-lg pointer-events-none" />

        <div className="inline-block px-3 py-1 rounded-full bg-[#0d3b2a] border border-[#216548] text-xs text-[#d4af37] font-semibold mb-2">
          {currentSurahMeta.revelationType === 'Meccan' ? 'سورة مكية' : 'سورة مدنية'} • {currentSurahMeta.numberOfAyahs} آيات • الصفحة {currentSurahMeta.page}
        </div>

        <h1 className="text-3xl sm:text-4xl font-amiri font-bold text-gold-gradient mb-3">
          سُورَةُ {currentSurahMeta.name}
        </h1>

        {/* Listen to full surah button */}
        <button
          onClick={() => onPlayAyah(currentSurahNumber, 1, currentSurahMeta.name, currentSurahMeta.numberOfAyahs)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5c048] hover:to-[#bd8723] text-[#062015] font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>استماع للسورة من البداية</span>
        </button>
      </div>

      {/* Bismillah Header (Except Surah At-Tawbah 9, and included in text for Fatihah 1) */}
      {currentSurahNumber !== 1 && currentSurahNumber !== 9 && (
        <div className="text-center py-4 mb-4">
          <p className="font-quran text-2xl sm:text-3xl text-[#ecd78e]">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-3 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#9bb0a5]">جاري تحميل آيات سورة {currentSurahMeta.name}...</p>
        </div>
      )}

      {fetchError && !isLoading && (
        <div className="rounded-xl bg-amber-950/40 border border-amber-800/60 p-6 text-center my-8">
          <Info className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-amber-200 font-semibold mb-3">{fetchError}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              setFetchError(null);
              fetchSurahAyahs(currentSurahNumber).then(a => {
                setAyahs(a);
                setIsLoading(false);
              }).catch(e => {
                setFetchError(e.message);
                setIsLoading(false);
              });
            }}
            className="px-4 py-2 rounded-lg bg-[#d4af37] text-[#051a12] font-bold text-xs cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Ayahs Display */}
      {!isLoading && !fetchError && (
        <div className="space-y-4">
          {ayahs.map(ayah => {
            const isPlayingThisAyah = activePlayingSurah === currentSurahNumber && activePlayingAyah === ayah.numberInSurah;
            const bookmarked = isBookmarked(ayah.numberInSurah);

            const fontClass = 
              fontFamily === 'amiri-quran' ? 'font-quran' :
              fontFamily === 'amiri' ? 'font-amiri' : 'font-cairo';

            return (
              <div
                key={ayah.numberInSurah}
                className={`relative rounded-2xl p-4 sm:p-5 transition-all border ${
                  isPlayingThisAyah
                    ? 'bg-[#0b3323] border-[#d4af37] shadow-lg shadow-[#d4af37]/10'
                    : 'bg-[#072117] hover:bg-[#09291d] border-[#133d2b]'
                }`}
              >
                {/* Ayah Text */}
                <div 
                  className={`text-right leading-loose mb-4 ${fontClass} ${
                    isPlayingThisAyah ? 'text-[#fff9df]' : 'text-[#eef5f1]'
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <span>{ayah.text}</span>
                  <span className="ayah-symbol">
                    {ayah.numberInSurah}
                  </span>
                </div>

                {/* Ayah Action Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-[#123928] text-xs text-[#89ab9b]">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Play Audio */}
                    <button
                      onClick={() => onPlayAyah(currentSurahNumber, ayah.numberInSurah, currentSurahMeta.name, currentSurahMeta.numberOfAyahs)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                        isPlayingThisAyah
                          ? 'bg-[#d4af37] text-[#051a12] font-bold'
                          : 'bg-[#051a12] hover:bg-[#0c3123] text-[#a9dbc0] border border-[#16422f]'
                      }`}
                      title="استماع لهذه الآية"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="text-[11px]">تلاوة</span>
                    </button>

                    {/* Tafseer */}
                    <button
                      onClick={() => setActiveTafseerAyah(ayah)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#051a12] hover:bg-[#0c3123] text-[#a9dbc0] border border-[#16422f] transition cursor-pointer"
                      title="عرض تفسير الآية الميسر"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span className="text-[11px]">التفسير</span>
                    </button>

                    {/* Test in Memorization module */}
                    <button
                      onClick={() => onTestAyahInMemorize(currentSurahNumber, ayah.numberInSurah)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#051a12] hover:bg-[#0c3123] text-[#a9dbc0] border border-[#16422f] transition cursor-pointer"
                      title="تسميع هذه الآية واكتشاف الأخطاء"
                    >
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px]">تسميع</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Bookmark Toggle */}
                    <button
                      onClick={() => handleToggleBookmark(ayah.numberInSurah)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        bookmarked 
                          ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]' 
                          : 'bg-[#051a12] border-[#16422f] text-[#89ab9b] hover:text-white'
                      }`}
                      title={bookmarked ? 'محفوظة في العلامات المرجعية' : 'حفظ كعلامة للقراءة'}
                    >
                      {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>

                    {/* Copy Text */}
                    <button
                      onClick={() => handleCopyAyah(ayah)}
                      className="p-1.5 rounded-lg bg-[#051a12] border border-[#16422f] text-[#89ab9b] hover:text-white transition cursor-pointer"
                      title="نسخ الآية"
                    >
                      {copiedAyahNum === ayah.numberInSurah ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Surah Selector Drawer / Modal */}
      {isSurahDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
          <div className="w-full max-w-2xl bg-[#072418] border border-[#1c553c] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#14422e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#d4af37]" />
                <h3 className="font-bold text-lg text-[#f5e7b5]">فهرس سور القرآن الكريم</h3>
                <span className="text-xs bg-[#0b3323] px-2 py-0.5 rounded text-[#a9dbc0]">
                  114 سورة
                </span>
              </div>
              <button
                onClick={() => setIsSurahDrawerOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#0c3123] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input & Filters */}
            <div className="p-3 bg-[#051d13] border-b border-[#123928] space-y-2">
              <div className="relative">
                <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم السورة أو رقمها..."
                  value={surahSearchQuery}
                  onChange={(e) => setSurahSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-[#09291c] border border-[#1a4f36] rounded-xl text-sm text-[#e3ece6] placeholder-[#6f8e7f] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              {/* Revelation Type Filter buttons */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setSelectedTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${
                    selectedTypeFilter === 'all'
                      ? 'bg-[#d4af37] text-[#051a12] font-bold'
                      : 'bg-[#09291c] text-[#86a798] hover:text-white'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSelectedTypeFilter('Meccan')}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${
                    selectedTypeFilter === 'Meccan'
                      ? 'bg-[#d4af37] text-[#051a12] font-bold'
                      : 'bg-[#09291c] text-[#86a798] hover:text-white'
                  }`}
                >
                  مكية
                </button>
                <button
                  onClick={() => setSelectedTypeFilter('Medinan')}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${
                    selectedTypeFilter === 'Medinan'
                      ? 'bg-[#d4af37] text-[#051a12] font-bold'
                      : 'bg-[#09291c] text-[#86a798] hover:text-white'
                  }`}
                >
                  مدنية
                </button>
              </div>
            </div>

            {/* Surah Grid List */}
            <div className="p-3 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredSurahs.map(s => (
                <button
                  key={s.number}
                  onClick={() => {
                    setCurrentSurahNumber(s.number);
                    setIsSurahDrawerOpen(false);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition cursor-pointer ${
                    s.number === currentSurahNumber
                      ? 'bg-[#0c402c] border-[#d4af37] text-[#fff6d6]'
                      : 'bg-[#061e14] hover:bg-[#0a2e20] border-[#133c2a] text-[#d6e5dd]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#051a12] border border-[#1b4e38] flex items-center justify-center text-xs font-bold text-[#d4af37]">
                      {s.number}
                    </span>
                    <div>
                      <div className="font-amiri font-bold text-base text-[#f5e7b5]">
                        سورة {s.name}
                      </div>
                      <div className="text-[11px] text-[#7d9f8f]">
                        {s.englishName} • {s.numberOfAyahs} آيات
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#93b8a6] bg-[#051a12] px-2 py-0.5 rounded border border-[#15422e]">
                    {s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tafseer Drawer / Modal */}
      {activeTafseerAyah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#072418] border border-[#1f5e43] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#14422e] mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#d4af37]" />
                <h3 className="font-bold text-lg text-[#f5e7b5]">
                  التفسير الميسر • سورة {currentSurahMeta.name} (آية {activeTafseerAyah.numberInSurah})
                </h3>
              </div>
              <button
                onClick={() => setActiveTafseerAyah(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#051a12] border border-[#15442f] mb-4">
              <p className="font-quran text-lg text-[#ecd78e] leading-relaxed text-right mb-1">
                {activeTafseerAyah.text}
              </p>
            </div>

            <div className="text-right">
              <h4 className="text-xs font-bold text-[#d4af37] mb-1">بيان المعنى:</h4>
              <p className="text-sm text-[#d4e5dc] leading-relaxed">
                {activeTafseerAyah.tafseer || 'التفسير الميسر لهذه الآية المباركة.'}
              </p>
            </div>

            <button
              onClick={() => setActiveTafseerAyah(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#0c3826] hover:bg-[#124b33] text-[#f5e7b5] font-semibold text-sm border border-[#1b553c] cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
