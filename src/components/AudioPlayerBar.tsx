import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Volume2, 
  VolumeX, 
  X, 
  Wifi, 
  Gauge,
  Headphones
} from 'lucide-react';
import { RECITERS_LIST } from '../data/quranMetadata';
import { getAyahAudioUrl } from '../utils/quranApi';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface AudioPlayerBarProps {
  surahNumber: number;
  surahName: string;
  totalAyahs: number;
  currentAyahNumber: number;
  reciterId: string;
  autoPlayNext: boolean;
  onAyahChange: (ayahNumber: number) => void;
  onReciterChange: (reciterId: string) => void;
  onClose: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  surahNumber,
  surahName,
  totalAyahs,
  currentAyahNumber,
  reciterId,
  autoPlayNext,
  onAyahChange,
  onReciterChange,
  onClose,
}) => {
  const isOnline = useOnlineStatus();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const currentReciter = RECITERS_LIST.find(r => r.id === reciterId) || RECITERS_LIST[0];

  const audioUrl = getAyahAudioUrl(surahNumber, currentAyahNumber, currentReciter.subfolder);

  // Load and play when audioUrl changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    setIsLoading(true);
    setAudioError(null);
    audioRef.current.src = audioUrl;
    audioRef.current.playbackRate = playbackSpeed;
    audioRef.current.muted = isMuted;

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(err => {
          console.warn('Audio auto-play error:', err);
          setIsPlaying(false);
          setIsLoading(false);
          if (!isOnline) {
            setAudioError('تتطلب التلاوة الصوتية اتصالاً بالإنترنت');
          }
        });
    }
  }, [audioUrl]);

  // Handle Play/Pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
        })
        .catch(err => {
          console.warn('Playback error:', err);
          setAudioError('تعذر تشغيل الصوت. تحقق من اتصال الإنترنت.');
        });
    }
  };

  const handleEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (autoPlayNext && currentAyahNumber < totalAyahs) {
      onAyahChange(currentAyahNumber + 1);
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#062419] border-t border-[#174834] shadow-2xl px-3 py-2 sm:py-2.5">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
          setAudioError('تعذر جلب التلاوة. يرجى التحقق من اتصال الإنترنت.');
        }}
      />

      {/* Progress Bar */}
      <div className="w-full bg-[#0a3524] h-1 rounded-full mb-2 overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (!audioRef.current || !audioRef.current.duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = clickX / rect.width;
          audioRef.current.currentTime = pct * audioRef.current.duration;
        }}
      >
        <div 
          className="bg-gradient-to-r from-[#d4af37] to-[#f5d77f] h-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Ayah & Reciter Details */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#0a3524] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#f5e7b5] font-amiri">
                  سورة {surahName}
                </span>
                <span className="text-xs text-[#a9dbc0] bg-[#0c442e] px-2 py-0.5 rounded-full border border-[#1b553c]">
                  آية {currentAyahNumber} من {totalAyahs}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#86a798]">
                {/* Reciter dropdown */}
                <select
                  value={reciterId}
                  onChange={(e) => onReciterChange(e.target.value)}
                  className="bg-transparent border-none text-[#d4af37] hover:underline cursor-pointer focus:outline-none"
                >
                  {RECITERS_LIST.map(r => (
                    <option key={r.id} value={r.id} className="bg-[#062419] text-[#e3ece6]">
                      {r.name}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">•</span>
                <span className="text-[10px] text-amber-300/80 flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" />
                  بث مباشر
                </span>
              </div>
            </div>
          </div>

          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="sm:hidden text-gray-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-3">
          {/* Previous Ayah */}
          <button
            onClick={() => onAyahChange(Math.max(1, currentAyahNumber - 1))}
            disabled={currentAyahNumber <= 1}
            className="p-1.5 rounded-lg text-[#a9dbc0] hover:text-[#fff] hover:bg-[#0d3b2a] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="الآية السابقة"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e2be4a] hover:to-[#bd8723] text-[#051a12] flex items-center justify-center font-bold shadow-md shadow-[#d4af37]/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-[#051a12] border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current mr-0.5" />
            )}
          </button>

          {/* Next Ayah */}
          <button
            onClick={() => onAyahChange(Math.min(totalAyahs, currentAyahNumber + 1))}
            disabled={currentAyahNumber >= totalAyahs}
            className="p-1.5 rounded-lg text-[#a9dbc0] hover:text-[#fff] hover:bg-[#0d3b2a] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="الآية التالية"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Repeat Ayah toggle */}
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              isRepeat 
                ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50' 
                : 'text-[#82a494] hover:text-white hover:bg-[#0d3b2a]'
            }`}
            title={isRepeat ? 'إلغاء التكرار' : 'تكرار هذه الآية للحفظ'}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Speed cycle button */}
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-0.5 px-2 py-1 rounded bg-[#0d3b2a] hover:bg-[#144d37] text-[11px] font-bold text-[#c7dfd3] border border-[#1b553c] cursor-pointer"
            title="سرعة القراءة"
          >
            <Gauge className="w-3 h-3 text-[#d4af37]" />
            <span>{playbackSpeed}x</span>
          </button>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-[#82a494] hover:text-white hover:bg-[#0d3b2a] cursor-pointer"
            title={isMuted ? 'إلغاء الكتم' : 'كتم'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Close button for desktop */}
          <button 
            onClick={onClose}
            className="hidden sm:block text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#0d3b2a] cursor-pointer"
            title="إغلاق المشغل"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {audioError && (
        <div className="text-[11px] text-amber-300 text-center mt-1">
          {audioError}
        </div>
      )}
    </div>
  );
};
