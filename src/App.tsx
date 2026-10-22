/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { QuranReader } from './components/QuranReader';
import { MemorizationReview } from './components/MemorizationReview';
import { PrayerTimesView } from './components/PrayerTimesView';
import { AzkarView } from './components/AzkarView';
import { SettingsView } from './components/SettingsView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { InstallPromptModal } from './components/InstallPromptModal';
import { loadSettings } from './utils/storage';
import { AppSettings } from './types';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('quran');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const isOnline = useOnlineStatus();

  // Audio Playback State
  const [audioState, setAudioState] = useState<{
    isPlaying: boolean;
    surahNumber: number;
    ayahNumber: number;
    surahName: string;
    totalAyahs: number;
  } | null>(null);

  // Memorization target states for navigation from reader
  const [memorizeSurah, setMemorizeSurah] = useState<number>(1);
  const [memorizeAyah, setMemorizeAyah] = useState<number>(1);

  // Handle playing an ayah from QuranReader
  const handlePlayAyah = (surahNumber: number, ayahNumber: number, surahName: string, totalAyahs: number) => {
    setAudioState({
      isPlaying: true,
      surahNumber,
      ayahNumber,
      surahName,
      totalAyahs,
    });
  };

  // Handle navigating from QuranReader to MemorizationReview with specific Ayah
  const handleTestAyahInMemorize = (surahNumber: number, ayahNumber: number) => {
    setMemorizeSurah(surahNumber);
    setMemorizeAyah(ayahNumber);
    setActiveTab('memorize');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen bg-[#051a12] text-[#e3ece6] flex flex-col font-cairo selection:bg-[#d4af37]/30 selection:text-[#fff2b2] ${
      settings.lowMemoryMode ? 'low-memory-mode' : ''
    }`}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Content Sections */}
      <main className="flex-1 w-full">
        {activeTab === 'quran' && (
          <QuranReader
            initialSurah={settings.lastReadSurah || 1}
            initialAyah={settings.lastReadAyah || 1}
            onPlayAyah={handlePlayAyah}
            activePlayingSurah={audioState?.surahNumber || null}
            activePlayingAyah={audioState?.ayahNumber || null}
            onTestAyahInMemorize={handleTestAyahInMemorize}
          />
        )}

        {activeTab === 'memorize' && (
          <MemorizationReview
            initialSurah={memorizeSurah}
            initialAyah={memorizeAyah}
            onPlayRecitationAudio={handlePlayAyah}
          />
        )}

        {activeTab === 'prayers' && (
          <PrayerTimesView />
        )}

        {activeTab === 'azkar' && (
          <AzkarView />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onSettingsChange={(newSettings) => setSettings(newSettings)}
          />
        )}
      </main>

      {/* Audio Player Bar (Sticky at bottom when audio is active) */}
      {audioState && (
        <AudioPlayerBar
          surahNumber={audioState.surahNumber}
          surahName={audioState.surahName}
          totalAyahs={audioState.totalAyahs}
          currentAyahNumber={audioState.ayahNumber}
          reciterId={settings.reciterId}
          autoPlayNext={settings.autoPlayNextAyah}
          onAyahChange={(nextAyahNum) => {
            setAudioState({
              ...audioState,
              ayahNumber: nextAyahNum,
            });
          }}
          onReciterChange={(newReciterId) => {
            setSettings(prev => ({ ...prev, reciterId: newReciterId }));
          }}
          onClose={() => setAudioState(null)}
        />
      )}

      {/* Offline Toast Notification when disconnected */}
      {!isOnline && (
        <div className="fixed bottom-16 sm:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-950/90 border border-amber-800 text-amber-200 px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur-md">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>وضع عدم الاتصال: الميزات المحفوظة والأذكار ومواقيت الصلاة تعمل محلياً 100%.</span>
        </div>
      )}

      {/* Windows Install Guidance Modal */}
      <InstallPromptModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}
