import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Mic, 
  Clock, 
  HeartHandshake, 
  Settings, 
  Download, 
  Wifi, 
  WifiOff, 
  Monitor,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getHijriDate } from '../utils/hijriCalendar';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenInstallModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenInstallModal }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [hijriDateStr, setHijriDateStr] = useState<string>('');

  useEffect(() => {
    const { formatted } = getHijriDate();
    setHijriDateStr(formatted);
  }, []);

  const navItems = [
    { id: 'quran', label: 'القرآن الكريم', icon: BookOpen },
    { id: 'memorize', label: 'التسميع والمراجعة', icon: Mic },
    { id: 'prayers', label: 'مواقيت الصلاة', icon: Clock },
    { id: 'azkar', label: 'الأذكار والتسبيح', icon: HeartHandshake },
    { id: 'settings', label: 'الإعدادات والويندوز', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#062419]/95 backdrop-blur-md border-b border-[#154631] shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('quran')}
              className="flex items-center gap-2.5 text-right cursor-pointer group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0c442e] to-[#041a11] border border-[#d4af37]/40 flex items-center justify-center shadow-md shadow-black/20 group-hover:border-[#d4af37] transition-colors">
                <img src="/favicon.png" alt="Noor" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg sm:text-xl text-[#f5e7b5] tracking-wide font-amiri">
                    نُور
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 tracking-wider">
                    NOOR
                  </span>
                </div>
                <span className="text-[11px] text-[#9bb0a5] hidden sm:block">
                  تطبيق إسلامي خفيف للويندوز
                </span>
              </div>
            </button>
          </div>

          {/* Hijri Date & Status Info */}
          <div className="hidden md:flex items-center gap-3">
            {hijriDateStr && (
              <div className="flex items-center gap-1.5 text-xs text-[#c5dacd] bg-[#093323] px-3 py-1.5 rounded-full border border-[#1b533b]">
                <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="font-amiri font-bold">{hijriDateStr}</span>
              </div>
            )}

            {/* Online / Offline status indicator */}
            <div 
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                isOnline 
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
                  : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
              }`}
              title={isOnline ? 'متصل بالإنترنت' : 'يعمل دون إنترنت من الذاكرة المحلية'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>متصل</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>دون إنترنت</span>
                </>
              )}
            </div>
          </div>

          {/* Windows / PWA Install Button */}
          <div className="flex items-center gap-2">
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5c048] hover:to-[#be8722] text-[#062015] font-bold text-xs sm:text-sm shadow-md shadow-[#d4af37]/15 transition cursor-pointer active:scale-95"
                title="تثبيت التطبيق على جهاز الكمبيوتر والويندوز"
              >
                <Monitor className="w-4 h-4 text-[#062015]" />
                <span>تثبيت على Windows</span>
              </button>
            )}

            {!isInstalled && !isInstallable && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0d3b2a] hover:bg-[#144f38] text-[#e3ece6] text-xs font-medium border border-[#216146] transition cursor-pointer"
                title="دليل تثبيت نور كتطبيق ويندوز دائم"
              >
                <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="hidden sm:inline">تثبيت كبرنامج</span>
              </button>
            )}

            {isInstalled && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0a3524] text-[#a9dbc0] text-xs border border-[#1b553c]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>مثبت على الويندوز</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 -mx-2 px-2 scrollbar-none border-t border-[#113827]">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0e4730] to-[#12583c] text-[#fbf7dc] border border-[#d4af37]/50 shadow-sm'
                    : 'text-[#9ab1a5] hover:text-[#d3e3db] hover:bg-[#092d1f]/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#d4af37]' : 'text-[#739283]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
