import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  MicOff, 
  Keyboard, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw, 
  Play, 
  Volume2, 
  Award, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';
import { ALL_SURAHS, RECITERS_LIST } from '../data/quranMetadata';
import { fetchSurahAyahs, getAyahAudioUrl } from '../utils/quranApi';
import { evaluateRecitation, removeTashkeel } from '../utils/arabicNormalizer';
import { RecitationResult, Ayah, MemorizationRecord } from '../types';
import { loadMemorizationRecords, saveMemorizationRecord, loadSettings } from '../utils/storage';

interface MemorizationReviewProps {
  initialSurah?: number;
  initialAyah?: number;
  onPlayRecitationAudio: (surahNumber: number, ayahNumber: number, surahName: string, totalAyahs: number) => void;
}

export const MemorizationReview: React.FC<MemorizationReviewProps> = ({
  initialSurah = 1,
  initialAyah = 1,
  onPlayRecitationAudio,
}) => {
  // Selection
  const [selectedSurahNum, setSelectedSurahNum] = useState<number>(initialSurah);
  const [selectedAyahNum, setSelectedAyahNum] = useState<number>(initialAyah);
  const [surahAyahs, setSurahAyahs] = useState<Ayah[]>([]);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState<boolean>(true);

  // Recitation Mode: 'voice' | 'type' | 'reveal'
  const [recitationMode, setRecitationMode] = useState<'voice' | 'type' | 'reveal'>('voice');

  // Input states
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [typedInput, setTypedInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  // Evaluation Output
  const [evaluation, setEvaluation] = useState<RecitationResult | null>(null);
  const [isEvaluated, setIsEvaluated] = useState<boolean>(false);

  // Hide / Reveal self-testing state
  const [isAyahMasked, setIsAyahMasked] = useState<boolean>(true);
  const [revealedWordIndices, setRevealedWordIndices] = useState<number[]>([]);

  // Memorization Records
  const [records, setRecords] = useState<Record<number, MemorizationRecord>>(() => loadMemorizationRecords());

  // Web Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  const currentSurahMeta = useMemo(() => {
    return ALL_SURAHS.find(s => s.number === selectedSurahNum) || ALL_SURAHS[0];
  }, [selectedSurahNum]);

  const currentAyah = useMemo(() => {
    return surahAyahs.find(a => a.numberInSurah === selectedAyahNum) || surahAyahs[0];
  }, [surahAyahs, selectedAyahNum]);

  // Load Ayahs when surah changes
  useEffect(() => {
    let active = true;
    setIsLoadingAyahs(true);
    fetchSurahAyahs(selectedSurahNum)
      .then(loaded => {
        if (active) {
          setSurahAyahs(loaded);
          setIsLoadingAyahs(false);
          // Reset test states
          resetRecitationState();
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setIsLoadingAyahs(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedSurahNum]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechError('التعرف الصوتي غير مدعوم في هذا المتصفح. يمكنك استخدام التسميع الكتابي أو فتح التطبيق في Google Chrome أو Microsoft Edge.');
      setRecitationMode('type');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA'; // Standard Arabic recognition

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setSpokenTranscript(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('تم رفض إذن الميكروفون. يرجى السماح للتطبيق باستخدام الميكروفون أو استخدم التسميع الكتابي.');
        } else if (event.error === 'network') {
          setSpeechError('خدمة التعرف الصوتي تتطلب اتصالاً بالإنترنت في هذا المتصفح.');
        } else {
          setSpeechError(`حدث خطأ أثناء التعرف الصوتي (${event.error}).`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech setup error:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const resetRecitationState = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setSpokenTranscript('');
    setTypedInput('');
    setEvaluation(null);
    setIsEvaluated(false);
    setSpeechError(null);
    setIsAyahMasked(true);
    setRevealedWordIndices([]);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    setSpeechError(null);

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      // Auto analyze if spoken
      if (spokenTranscript.trim() && currentAyah) {
        analyzeText(spokenTranscript);
      }
    } else {
      setSpokenTranscript('');
      setEvaluation(null);
      setIsEvaluated(false);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
        setIsListening(false);
      }
    }
  };

  const analyzeText = (textToTest: string) => {
    if (!currentAyah || !textToTest.trim()) return;
    const result = evaluateRecitation(currentAyah.text, textToTest);
    setEvaluation(result);
    setIsEvaluated(true);
  };

  // Next Ayah handler
  const handleNextAyah = () => {
    if (selectedAyahNum < currentSurahMeta.numberOfAyahs) {
      setSelectedAyahNum(selectedAyahNum + 1);
      resetRecitationState();
    }
  };

  const handlePrevAyah = () => {
    if (selectedAyahNum > 1) {
      setSelectedAyahNum(selectedAyahNum - 1);
      resetRecitationState();
    }
  };

  // Memorization status saving
  const handleSaveStatus = (status: 'memorized' | 'needs_revision' | 'memorizing') => {
    const currentRec = records[selectedSurahNum] || {
      surahNumber: selectedSurahNum,
      status: 'memorizing',
      memorizedAyahs: [],
      totalAyahs: currentSurahMeta.numberOfAyahs,
    };

    let updatedAyahs = [...(currentRec.memorizedAyahs || [])];
    if (status === 'memorized' && !updatedAyahs.includes(selectedAyahNum)) {
      updatedAyahs.push(selectedAyahNum);
    }

    const newRecord: MemorizationRecord = {
      ...currentRec,
      status,
      lastPracticedDate: new Date().toISOString(),
      accuracyScore: evaluation?.accuracy || currentRec.accuracyScore || 100,
      memorizedAyahs: updatedAyahs,
      totalAyahs: currentSurahMeta.numberOfAyahs,
    };

    saveMemorizationRecord(newRecord);
    setRecords(loadMemorizationRecords());
  };

  // Split ayah into words for the hide/reveal mode
  const ayahWords = useMemo(() => {
    if (!currentAyah) return [];
    return currentAyah.text.trim().split(/\s+/);
  }, [currentAyah]);

  const toggleWordReveal = (index: number) => {
    if (revealedWordIndices.includes(index)) {
      setRevealedWordIndices(revealedWordIndices.filter(i => i !== index));
    } else {
      setRevealedWordIndices([...revealedWordIndices, index]);
    }
  };

  const currentRecord = records[selectedSurahNum];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-28">
      {/* Title & Introduction Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#072418] to-[#0c3a27] border border-[#1a553c] p-5 mb-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-amiri text-gold-gradient">
              نظام حفظ ومراجعة القرآن الكريم
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#a9dbc0] leading-relaxed">
            اختبر حفظك بالتسميع الصوتي أو الكتابي مع كشف تلقائي للأخطاء، السقطات، والكلمات المبدلة وفق الرسم القرآني.
          </p>
        </div>

        {/* Quick Memorization Status Badge */}
        {currentRecord && (
          <div className="bg-[#051a12]/80 px-4 py-2.5 rounded-xl border border-[#1b553c] text-center min-w-36">
            <div className="text-[11px] text-[#86a798]">حالة سورة {currentSurahMeta.name}:</div>
            <div className="text-sm font-bold mt-0.5 font-amiri">
              {currentRecord.status === 'memorized' && (
                <span className="text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  تم الحفظ
                </span>
              )}
              {currentRecord.status === 'needs_revision' && (
                <span className="text-amber-400 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  بحاجة لمراجعة
                </span>
              )}
              {currentRecord.status === 'memorizing' && (
                <span className="text-blue-400 flex items-center justify-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  قيد الحفظ ({currentRecord.memorizedAyahs.length}/{currentSurahMeta.numberOfAyahs})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Surah & Ayah Selector Bar */}
      <div className="bg-[#082419] rounded-2xl border border-[#154631] p-4 mb-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Choose Surah */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#86a798] font-bold">السورة:</label>
          <select
            value={selectedSurahNum}
            onChange={(e) => {
              setSelectedSurahNum(parseInt(e.target.value, 10));
              setSelectedAyahNum(1);
            }}
            className="bg-[#051a12] border border-[#184e36] text-[#f5e7b5] text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] font-amiri font-bold cursor-pointer"
          >
            {ALL_SURAHS.map(s => (
              <option key={s.number} value={s.number} className="bg-[#062419]">
                {s.number}. سورة {s.name} ({s.numberOfAyahs} آيات)
              </option>
            ))}
          </select>
        </div>

        {/* Choose Ayah */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#86a798] font-bold">الآية:</label>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevAyah}
              disabled={selectedAyahNum <= 1}
              className="p-1.5 rounded-lg bg-[#051a12] hover:bg-[#0c3123] text-[#a9dbc0] disabled:opacity-30 border border-[#15422e] cursor-pointer"
              title="الآية السابقة"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <select
              value={selectedAyahNum}
              onChange={(e) => {
                setSelectedAyahNum(parseInt(e.target.value, 10));
                resetRecitationState();
              }}
              className="bg-[#051a12] border border-[#184e36] text-[#d4af37] text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] font-bold cursor-pointer"
            >
              {Array.from({ length: currentSurahMeta.numberOfAyahs }, (_, i) => i + 1).map(num => (
                <option key={num} value={num} className="bg-[#062419]">
                  الآية {num}
                </option>
              ))}
            </select>
            <button
              onClick={handleNextAyah}
              disabled={selectedAyahNum >= currentSurahMeta.numberOfAyahs}
              className="p-1.5 rounded-lg bg-[#051a12] hover:bg-[#0c3123] text-[#a9dbc0] disabled:opacity-30 border border-[#15422e] cursor-pointer"
              title="الآية التالية"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recitation Modes Switcher */}
        <div className="flex items-center rounded-xl bg-[#051a12] p-1 border border-[#16422f] text-xs">
          <button
            onClick={() => setRecitationMode('voice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
              recitationMode === 'voice' ? 'bg-[#0f442f] text-[#f5e7b5] border border-[#d4af37]/40' : 'text-[#86a798] hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>تسميع صوتي</span>
          </button>
          <button
            onClick={() => setRecitationMode('type')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
              recitationMode === 'type' ? 'bg-[#0f442f] text-[#f5e7b5] border border-[#d4af37]/40' : 'text-[#86a798] hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-blue-400" />
            <span>تسميع كتابي</span>
          </button>
          <button
            onClick={() => setRecitationMode('reveal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
              recitationMode === 'reveal' ? 'bg-[#0f442f] text-[#f5e7b5] border border-[#d4af37]/40' : 'text-[#86a798] hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>إخفاء الكلمات</span>
          </button>
        </div>
      </div>

      {/* Target Ayah Preview & Reference Card */}
      {currentAyah && (
        <div className="bg-[#062116] rounded-2xl border border-[#164933] p-5 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-3 text-xs text-[#86a798]">
            <span className="font-bold text-[#d4af37]">
              سورة {currentSurahMeta.name} • الآية {selectedAyahNum} من {currentSurahMeta.numberOfAyahs}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAyahMasked(!isAyahMasked)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#051a12] border border-[#16422f] text-[#a9dbc0] hover:text-white cursor-pointer"
                title="إخفاء أو إظهار نص الآية لاختبار الحفظ"
              >
                {isAyahMasked ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>كشف النص</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                    <span>إخفاء النص للغيب</span>
                  </>
                )}
              </button>

              {/* Listen to correct pronunciation button */}
              <button
                onClick={() => onPlayRecitationAudio(selectedSurahNum, selectedAyahNum, currentSurahMeta.name, currentSurahMeta.numberOfAyahs)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0d3b2a] border border-[#1d593f] text-[#f5e7b5] hover:bg-[#134e38] cursor-pointer"
                title="الاستماع للتلاوة الصحيحة بصوت الشيخ"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>استماع للشيخ</span>
              </button>
            </div>
          </div>

          {/* Ayah display (masked or unmasked) */}
          <div className="py-2 text-center">
            {isAyahMasked ? (
              <div className="p-6 rounded-xl bg-[#041910] border border-dashed border-[#1a553c] text-center">
                <p className="text-sm text-[#82a494] mb-2">
                  🔒 تم إخفاء نص الآية. اقرأ الآية من حفظك بصوتك أو اكتبها في المربع أدناه.
                </p>
                <button
                  onClick={() => setIsAyahMasked(false)}
                  className="text-xs text-[#d4af37] underline hover:text-[#fff2b2] cursor-pointer"
                >
                  اضغط هنا لإظهار الآية
                </button>
              </div>
            ) : (
              <p className="font-quran text-2xl sm:text-3xl text-[#fff9df] leading-loose text-center">
                {currentAyah.text}
                <span className="ayah-symbol">{currentAyah.numberInSurah}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mode 1: Voice Recitation */}
      {recitationMode === 'voice' && (
        <div className="bg-[#072418] rounded-2xl border border-[#184d35] p-6 mb-6 shadow-xl text-center">
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-base text-[#f5e7b5] mb-2 font-amiri">
              التسميع الصوتي المباشر
            </h3>
            <p className="text-xs text-[#8cb0a0] mb-6">
              اضغط على زر الميكروفون ثم رتّل الآية بوضوح وتأنٍ، وسيتعرف النظام على كلماتك ويقارنها فوراً بنص الآية.
            </p>

            {/* Big Microphone Button */}
            <div className="relative inline-block mb-6">
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              )}
              <button
                onClick={toggleListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer ${
                  isListening
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-red-900/40 ring-4 ring-red-500/30'
                    : 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5c048] hover:to-[#bd8723] text-[#051a12] shadow-[#d4af37]/25'
                }`}
                title={isListening ? 'اضغط للإيقاف وتحليل التسميع' : 'اضغط للبدء بالتسميع الصوتي'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            <div className="text-xs font-semibold mb-4">
              {isListening ? (
                <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  جاري الاستماع لتلاوتك الآن... اضغط مجدداً عند الانتهاء
                </span>
              ) : (
                <span className="text-[#86a798]">
                  {spokenTranscript ? 'اضغط "فحص التسميع" أو اضغط الميكروفون لإعادة المحاولة' : 'جاهز للاستماع'}
                </span>
              )}
            </div>

            {/* Real-time transcript box */}
            {spokenTranscript && (
              <div className="p-4 rounded-xl bg-[#041910] border border-[#164430] text-right mb-4">
                <span className="text-[11px] text-[#86a798] block mb-1">ما تم التقاطه من صوتك:</span>
                <p className="font-amiri text-lg text-[#d9efe4] leading-relaxed">
                  {spokenTranscript}
                </p>
              </div>
            )}

            {/* Error or Speech Recognition Notice */}
            {speechError && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200 mb-4">
                {speechError}
              </div>
            )}

            {/* Analyze Button */}
            {spokenTranscript && !isListening && (
              <button
                onClick={() => analyzeText(spokenTranscript)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                فحص واكتشاف الأخطاء
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Typed Recitation */}
      {recitationMode === 'type' && (
        <div className="bg-[#072418] rounded-2xl border border-[#184d35] p-6 mb-6 shadow-xl">
          <h3 className="font-bold text-base text-[#f5e7b5] mb-2 font-amiri text-right">
            التسميع الكتابي من الذاكرة
          </h3>
          <p className="text-xs text-[#8cb0a0] mb-4 text-right">
            اكتب نص الآية كما تحفظها (يمكنك الكتابة بدون تشكيل):
          </p>

          <textarea
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="اكتب الآية هنا من حفظك..."
            rows={4}
            className="w-full p-4 rounded-xl bg-[#051a12] border border-[#184e36] text-[#e3ece6] text-lg font-amiri leading-relaxed focus:outline-none focus:border-[#d4af37] resize-none text-right mb-3"
          />

          {/* Quick Arabic character assistants */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#86a798]">إدراج سريع:</span>
              {['أ', 'إ', 'آ', 'ء', 'ة', 'ى', 'ئ', 'ؤ'].map(char => (
                <button
                  key={char}
                  onClick={() => setTypedInput(prev => prev + char)}
                  className="w-7 h-7 rounded bg-[#092b1e] hover:bg-[#0f442f] text-[#d4af37] border border-[#1b553c] font-bold cursor-pointer"
                >
                  {char}
                </button>
              ))}
            </div>

            <button
              onClick={() => setTypedInput('')}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              مسح
            </button>
          </div>

          <button
            onClick={() => analyzeText(typedInput)}
            disabled={!typedInput.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-40 text-white font-bold text-sm shadow-md transition cursor-pointer"
          >
            فحص التسميع واكتشاف الأخطاء
          </button>
        </div>
      )}

      {/* Mode 3: Hide / Reveal Word by Word Self-Test */}
      {recitationMode === 'reveal' && (
        <div className="bg-[#072418] rounded-2xl border border-[#184d35] p-6 mb-6 shadow-xl text-right">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base text-[#f5e7b5] font-amiri">
              اختبار إخفاء الكلمات (استحضار الحفظ الذاتي)
            </h3>
            <button
              onClick={() => {
                if (revealedWordIndices.length === ayahWords.length) {
                  setRevealedWordIndices([]);
                } else {
                  setRevealedWordIndices(ayahWords.map((_, i) => i));
                }
              }}
              className="text-xs text-[#d4af37] underline hover:text-[#fff2b2] cursor-pointer"
            >
              {revealedWordIndices.length === ayahWords.length ? 'إخفاء الكل مجدداً' : 'كشف كل الكلمات'}
            </button>
          </div>
          <p className="text-xs text-[#8cb0a0] mb-5">
            الكلمات محجوبة لتختبر تسلسل حفظك. انطق الكلمة بلسانك ثم اضغط عليها للتحقق من صحتها:
          </p>

          <div className="p-6 rounded-2xl bg-[#041910] border border-[#164430] flex flex-wrap gap-2.5 justify-center leading-loose">
            {ayahWords.map((word, idx) => {
              const isRevealed = revealedWordIndices.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleWordReveal(idx)}
                  className={`px-3 py-1.5 rounded-xl font-quran text-xl sm:text-2xl transition cursor-pointer border ${
                    isRevealed
                      ? 'bg-[#0a3524] text-[#fff9df] border-[#d4af37]/50 shadow-sm'
                      : 'bg-[#09291c] text-transparent hover:text-gray-400 select-none border-[#184e36] min-w-16 blur-[2px] hover:blur-none'
                  }`}
                  title={isRevealed ? 'إخفاء الكلمة' : 'اضغط لكشف الكلمة'}
                >
                  {word}
                </button>
              );
            })}
            <span className="ayah-symbol self-center">{selectedAyahNum}</span>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs text-[#86a798]">
              تم كشف {revealedWordIndices.length} من {ayahWords.length} كلمة
            </span>
          </div>
        </div>
      )}

      {/* Recitation Error Analysis Results Card */}
      {isEvaluated && evaluation && (
        <div className="bg-[#08281b] rounded-2xl border-2 border-[#d4af37]/60 p-6 mb-6 shadow-2xl">
          {/* Accuracy Gauge & Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-[#164933] mb-5">
            <div className="text-right">
              <span className="text-xs text-[#86a798] font-bold block mb-1">
                نتيجة فحص التسميع:
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-extrabold ${
                  evaluation.accuracy >= 90 ? 'text-emerald-400' :
                  evaluation.accuracy >= 75 ? 'text-yellow-400' : 'text-amber-500'
                }`}>
                  {evaluation.accuracy}%
                </span>
                <span className="font-amiri font-bold text-lg text-[#f5e7b5]">
                  {evaluation.accuracy >= 95 ? 'ما شاء الله! تلاوة متقنة وممتازة' :
                   evaluation.accuracy >= 80 ? 'جيد جداً، تفقد الكلمات الملونة أدناه' :
                   'تحتاج إلى تثبيت ومراجعة هذه الآية'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                {evaluation.correctCount} / {evaluation.totalExpected} كلمة صحيحة
              </span>
            </div>
          </div>

          {/* Color Key Guide */}
          <div className="flex items-center flex-wrap gap-3 text-xs mb-4 text-[#86a798] bg-[#051a12] p-2.5 rounded-xl border border-[#14422e]">
            <span className="font-bold text-[#d4af37]">دليل الألوان:</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              صحيحة
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              خطأ / تبديل
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              سقطت / منسية
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              كلمة زائدة
            </span>
          </div>

          {/* Word-by-Word Colored Diff Breakdown */}
          <div className="p-5 rounded-xl bg-[#051a12] border border-[#16422f] mb-5 text-right">
            <h4 className="text-xs font-bold text-[#d4af37] mb-3">تحليل الآية كلمة بكلمة:</h4>
            <div className="flex flex-wrap gap-2 items-center leading-loose">
              {evaluation.diffs.map((d, index) => {
                if (d.status === 'correct') {
                  return (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-amiri text-lg font-bold"
                    >
                      {d.expected}
                    </span>
                  );
                } else if (d.status === 'wrong') {
                  return (
                    <span
                      key={index}
                      className="group relative px-2.5 py-1 rounded-lg bg-red-950/80 text-red-300 border border-red-700 font-amiri text-lg font-bold cursor-help"
                    >
                      <span className="line-through opacity-70 ml-1">{d.spoken}</span>
                      <span className="underline decoration-red-400">{d.expected}</span>
                      {/* Tooltip */}
                      <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-black/95 text-white text-[11px] p-2 rounded-lg whitespace-nowrap shadow-xl border border-red-500/50 z-20">
                        الصواب: {d.expected} | ما قيل: {d.spoken || 'بدون'}
                      </span>
                    </span>
                  );
                } else if (d.status === 'missing') {
                  return (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-dashed border-amber-600 font-amiri text-lg font-bold"
                      title="هذه الكلمة سقطت أثناء التسميع"
                    >
                      (ناقصة: {d.expected})
                    </span>
                  );
                } else {
                  return (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-600 font-amiri text-lg font-bold"
                      title="كلمة زائدة غير موجودة في نص الآية"
                    >
                      (زائدة: {d.spoken})
                    </span>
                  );
                }
              })}
              <span className="ayah-symbol">{selectedAyahNum}</span>
            </div>
          </div>

          {/* Action Row: Update Progress & Advance */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#86a798]">تحديث الحالة:</span>
              <button
                onClick={() => handleSaveStatus('memorized')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/60 text-xs font-semibold cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>تم الحفظ بنجاح</span>
              </button>
              <button
                onClick={() => handleSaveStatus('needs_revision')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-300 border border-amber-700/60 text-xs font-semibold cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>تحتاج مراجعة</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetRecitationState}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#051a12] hover:bg-[#0c3123] text-[#a9dbc0] border border-[#16422f] text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>

              {selectedAyahNum < currentSurahMeta.numberOfAyahs && (
                <button
                  onClick={handleNextAyah}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5c048] hover:to-[#be8722] text-[#051a12] text-xs font-bold shadow-md cursor-pointer"
                >
                  <span>الانتقال للآية التالية</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
