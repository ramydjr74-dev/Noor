import React, { useState } from 'react';
import { 
  Settings, 
  Cpu, 
  Download, 
  Upload, 
  Trash2, 
  Monitor, 
  FileCode, 
  Check, 
  Copy, 
  Sparkles, 
  ShieldCheck, 
  HardDrive,
  ExternalLink,
  Info
} from 'lucide-react';
import { RECITERS_LIST } from '../data/quranMetadata';
import { AppSettings } from '../types';
import { loadSettings, saveSettings, exportAppData, importAppData } from '../utils/storage';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsViewProps {
  onSettingsChange?: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    if (onSettingsChange) {
      onSettingsChange(updated);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importAppData(content);
        if (ok) {
          setSettings(loadSettings());
          setImportStatus('تم استيراد البيانات والتقدم بنجاح!');
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus('خطأ: الملف غير صالح أو تالف.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    if (confirm('هل أنت متأكد من مسح الذاكرة المؤقتة للآيات والسور المحفوظة؟ (لن يتم مسح إعداداتك أو تقدم الحفظ)')) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('noor_surah_v1_')) {
          localStorage.removeItem(key);
        }
      }
      alert('تم إفراغ الذاكرة المؤقتة بنجاح.');
    }
  };

  const windowsPackagerScript = `# كود توليد حزمة ويندوز تنفيذية مستقلة (.exe) لتطبيق نور NOOR
# المتطلبات: Node.js مثبت على جهاز الويندوز

# الخطوة 1: تثبيت أداة الحزم الخفيفة Nativefier
npm install -g nativefier

# الخطوة 2: إنشاء البرنامج التنفيذي لويندوز بنقرة واحدة
nativefier --name "NOOR" ^
  --icon "public/icon.svg" ^
  --width 1100 ^
  --height 750 ^
  --single-instance ^
  --tray ^
  "https://ais-pre-uhb25bx7x4gymidu7mwmiz-333391202538.europe-west2.run.app"

# ستحصل على مجلد يحتوي على NOOR.exe جاهز للتوزيع على أي كمبيوتر يعمل بنظام Windows!`;

  const copyPackagingScript = () => {
    navigator.clipboard.writeText(windowsPackagerScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-28">
      {/* Page Title */}
      <div className="rounded-2xl bg-gradient-to-r from-[#072418] to-[#0c3a27] border border-[#1a553c] p-5 mb-6 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-amiri text-gold-gradient mb-1">
            الإعدادات وحزم الويندوز
          </h2>
          <p className="text-xs sm:text-sm text-[#a9dbc0]">
            تخصيص القارئ، تحسين استهلاك الذاكرة (2GB RAM)، وحفظ البيانات أو تصديرها كبرنامج لويندوز.
          </p>
        </div>
        <Settings className="w-8 h-8 text-[#d4af37]" />
      </div>

      <div className="space-y-6">
        {/* Section 1: Low Memory Optimization for 2GB RAM PCs */}
        <div className="bg-[#082419] rounded-2xl border border-[#164933] p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-[#f5e7b5] font-amiri">
              وضع الأداء الفائق وتوفير الذاكرة (لأجهزة 2GB RAM)
            </h3>
          </div>
          <p className="text-xs text-[#86a798] mb-4">
            تم تصميم تطبيق نور ليكون فائق الخفة (يستهلك أقل من 35MB من الذاكرة). عند تفعيل هذا الوضع، يتم إيقاف المؤثرات البصرية وتظليل النوافذ لضمان عمل سلس وسريع 100% حتى على أجهزة الكمبيوتر القديمة.
          </p>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#051a12] border border-[#16422f] cursor-pointer">
            <div>
              <span className="text-sm font-bold text-[#e3ece6] block">
                تفعيل وضع توفير الذاكرة الخفيف
              </span>
              <span className="text-[11px] text-[#739886]">
                إلغاء شفافية الخلفية والظلال للحد الأقصى من سرعة الاستجابة
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.lowMemoryMode}
              onChange={(e) => updateSetting('lowMemoryMode', e.target.checked)}
              className="w-5 h-5 accent-[#d4af37] cursor-pointer"
            />
          </label>
        </div>

        {/* Section 2: Reciter & Audio Preferences */}
        <div className="bg-[#082419] rounded-2xl border border-[#164933] p-5 shadow-lg">
          <h3 className="font-bold text-base text-[#f5e7b5] mb-4 font-amiri">
            إعدادات التلاوة والصوتيات
          </h3>

          <div className="space-y-4">
            {/* Preferred Reciter */}
            <div>
              <label className="text-xs text-[#86a798] block mb-1.5 font-bold">
                القارئ الافتراضي:
              </label>
              <select
                value={settings.reciterId}
                onChange={(e) => updateSetting('reciterId', e.target.value)}
                className="w-full bg-[#051a12] border border-[#184e36] text-[#e3ece6] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#d4af37] cursor-pointer"
              >
                {RECITERS_LIST.map(r => (
                  <option key={r.id} value={r.id} className="bg-[#062419]">
                    {r.name} ({r.bitrate})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto play next verse */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#051a12] border border-[#16422f] cursor-pointer">
              <span className="text-xs sm:text-sm text-[#e3ece6]">
                تشغيل الآية التالية تلقائياً عند انتهاء تلاوة الآية الحالية
              </span>
              <input
                type="checkbox"
                checked={settings.autoPlayNextAyah}
                onChange={(e) => updateSetting('autoPlayNextAyah', e.target.checked)}
                className="w-4 h-4 accent-[#d4af37] cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Data Backup, Export & Import */}
        <div className="bg-[#082419] rounded-2xl border border-[#164933] p-5 shadow-lg">
          <h3 className="font-bold text-base text-[#f5e7b5] mb-3 font-amiri">
            النسخ الاحتياطي وحفظ البيانات محلياً
          </h3>
          <p className="text-xs text-[#86a798] mb-4">
            تُحفظ جميع إعداداتك وعلاماتك المرجعية وسجل حفظك للقرآن الكريم داخل جهازك مباشرة ولا تُرسل لأي خادم خارجي.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {/* Export JSON button */}
            <button
              onClick={exportAppData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c3826] hover:bg-[#124d35] text-[#f5e7b5] text-xs font-bold border border-[#1b553c] cursor-pointer transition"
            >
              <Download className="w-4 h-4 text-[#d4af37]" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </button>

            {/* Import JSON button */}
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c3826] hover:bg-[#124d35] text-[#f5e7b5] text-xs font-bold border border-[#1b553c] cursor-pointer transition">
              <Upload className="w-4 h-4 text-[#d4af37]" />
              <span>استيراد نسخة سابقة</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>

            {/* Clear cache */}
            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold border border-rose-800/50 cursor-pointer transition mr-auto"
            >
              <Trash2 className="w-4 h-4" />
              <span>تفريغ كاش الآيات</span>
            </button>
          </div>

          {importStatus && (
            <div className="mt-3 p-3 rounded-xl bg-[#051a12] border border-[#1a553c] text-xs text-emerald-300 text-center font-bold">
              {importStatus}
            </div>
          )}
        </div>

        {/* Section 4: Windows Desktop PWA & Packaging Guide */}
        <div className="bg-[#082419] rounded-2xl border border-[#164933] p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-5 h-5 text-[#d4af37]" />
            <h3 className="font-bold text-base text-[#f5e7b5] font-amiri">
              تثبيت تطبيق نور على نظام Windows وتوزيعه
            </h3>
          </div>

          <div className="space-y-4 text-xs text-[#a3c2b3] leading-relaxed">
            {/* Method A: PWA One-click */}
            <div className="p-4 rounded-xl bg-[#051a12] border border-[#164430]">
              <h4 className="font-bold text-sm text-[#f5e7b5] mb-2 flex items-center justify-between">
                <span>الطريقة 1: التثبيت الفوري كتطبيق سطح مكتب (Windows PWA)</span>
                {isInstalled ? (
                  <span className="text-emerald-400 text-xs">✓ مثبت لديك</span>
                ) : isInstallable ? (
                  <button
                    onClick={install}
                    className="px-3 py-1 rounded-lg bg-[#d4af37] text-[#051a12] font-bold text-xs cursor-pointer hover:bg-[#e4be45]"
                  >
                    تثبيت الآن
                  </button>
                ) : null}
              </h4>
              <p className="mb-2">
                1. في متصفح Microsoft Edge أو Google Chrome على جهاز الكمبيوتر، اضغط على أيقونة التثبيت بجوار شريط العنوان أو زر <strong>"تثبيت على Windows"</strong> في أعلى التطبيق.
              </p>
              <p>
                2. سيعمل التطبيق في نافذة مستقلة دون أشرطة المتصفح، مع أيقونة رسمية في قائمة ابدأ (Start Menu) وشريط المهام (Taskbar) وبدء تشغيل فوري دون إنترنت!
              </p>
            </div>

            {/* Method B: Nativefier / Packager Script */}
            <div className="p-4 rounded-xl bg-[#051a12] border border-[#164430]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-[#f5e7b5]">
                  الطريقة 2: تحويل المشروع إلى ملف تثبيت تنفيذي مستقل (.exe) للتوزيع
                </h4>
                <button
                  onClick={copyPackagingScript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0c3927] hover:bg-[#124d35] text-[#d4af37] text-[11px] font-bold border border-[#1b553c] cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'تم النسخ!' : 'نسخ أمر التوليد'}</span>
                </button>
              </div>
              <p className="mb-3 text-[#86a798]">
                إذا أردت توزيع برنامج "نور" على أقاربك وأصدقائك كملف تنفيذي Windows EXE عادي بدون الحاجة لفتح المتصفح، يمكنك استخدام الأداة الرسمية التالية في موجه الأوامر (CMD / PowerShell):
              </p>
              <pre className="p-3 rounded-lg bg-[#03140d] border border-[#113827] text-amber-200/90 font-mono text-[11px] overflow-x-auto whitespace-pre text-left dir-ltr">
                {windowsPackagerScript}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
