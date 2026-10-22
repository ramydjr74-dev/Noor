import React, { useState } from 'react';
import { 
  HeartHandshake, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Sun, 
  Moon, 
  Clock, 
  Bed,
  CheckCircle2
} from 'lucide-react';
import { AZKAR_CATEGORIES, AzkarCategory } from '../data/azkarData';
import { playChimeSound } from '../utils/audioAlert';

export const AzkarView: React.FC = () => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('morning');
  const [counters, setCounters] = useState<Record<string, number>>({});

  const activeCategory: AzkarCategory = AZKAR_CATEGORIES.find(c => c.id === activeCategoryId) || AZKAR_CATEGORIES[0];

  const handleIncrement = (itemId: string, targetCount: number) => {
    const current = counters[itemId] || 0;
    if (current < targetCount) {
      const next = current + 1;
      setCounters(prev => ({ ...prev, [itemId]: next }));
      if (next === targetCount) {
        // Soft chime tone on completion
        playChimeSound();
      }
    }
  };

  const handleResetCategory = () => {
    const nextCounters = { ...counters };
    activeCategory.items.forEach(item => {
      delete nextCounters[item.id];
    });
    setCounters(nextCounters);
  };

  const categoryIcons: Record<string, any> = {
    morning: Sun,
    evening: Moon,
    post_prayer: Clock,
    sleep: Bed,
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-28">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
        {AZKAR_CATEGORIES.map(cat => {
          const Icon = categoryIcons[cat.id] || Sparkles;
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
                isActive
                  ? 'bg-gradient-to-r from-[#0d452f] to-[#125a3d] text-[#fff6d6] border-[#d4af37]/60 shadow-lg'
                  : 'bg-[#072117] hover:bg-[#0a2e20] text-[#86a798] border-[#133c2a]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#d4af37]' : 'text-[#6c8f7f]'}`} />
              <span>{cat.title}</span>
            </button>
          );
        })}
      </div>

      {/* Category Banner & Reset */}
      <div className="bg-[#082419] rounded-2xl border border-[#164933] p-4 mb-6 shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-xl font-amiri font-bold text-[#f5e7b5]">
            {activeCategory.title}
          </h2>
          <p className="text-xs text-[#86a798]">
            {activeCategory.subtitle}
          </p>
        </div>

        <button
          onClick={handleResetCategory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#051a12] hover:bg-[#0c3123] text-[#86a798] hover:text-[#e3ece6] text-xs font-semibold border border-[#16422f] cursor-pointer transition"
          title="تصفير العدادات في هذا القسم"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>تصفير العدادات</span>
        </button>
      </div>

      {/* Azkar Items List */}
      <div className="space-y-4">
        {activeCategory.items.map((item, index) => {
          const currentCount = counters[item.id] || 0;
          const isDone = currentCount >= item.count;
          const progressPct = Math.min(100, (currentCount / item.count) * 100);

          return (
            <div
              key={item.id}
              className={`rounded-2xl p-5 border transition-all ${
                isDone
                  ? 'bg-[#08281b]/70 border-emerald-700/50 shadow-sm'
                  : 'bg-[#072117] hover:bg-[#09291d] border-[#133d2b]'
              }`}
            >
              {/* Header: Number and Source */}
              <div className="flex items-center justify-between text-xs text-[#86a798] mb-3">
                <span className="font-bold text-[#d4af37]">
                  ذكر #{index + 1}
                </span>
                <span className="bg-[#051a12] px-2.5 py-0.5 rounded-full border border-[#16422f]">
                  {item.source}
                </span>
              </div>

              {/* Zikr Arabic Text */}
              <p className="font-quran text-xl sm:text-2xl text-[#f1f6f3] leading-loose text-right mb-4">
                {item.text}
              </p>

              {/* Reward / Virtue */}
              {item.reward && (
                <div className="p-3 rounded-xl bg-[#051a12] border border-[#143e2b] text-xs text-[#a3c9b7] mb-4 text-right">
                  <strong className="text-[#d4af37] ml-1">الفضل:</strong>
                  {item.reward}
                </div>
              )}

              {/* Progress & Bead Button */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#123928]">
                {/* Visual Progress Bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-[#86a798] mb-1">
                    <span>التقدم:</span>
                    <span className="font-mono font-bold text-[#d4af37]">
                      {currentCount} / {item.count}
                    </span>
                  </div>
                  <div className="w-full bg-[#051a12] h-2 rounded-full overflow-hidden border border-[#16422f]">
                    <div 
                      className="bg-gradient-to-r from-[#d4af37] to-emerald-400 h-full transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Big Tap Button */}
                <button
                  onClick={() => handleIncrement(item.id, item.count)}
                  disabled={isDone}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition active:scale-95 cursor-pointer shadow-md ${
                    isDone
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 cursor-default'
                      : 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5c048] hover:to-[#bd8723] text-[#051a12]'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>اكتمل الذكر</span>
                    </>
                  ) : (
                    <>
                      <span>سبّح ({item.count - currentCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
