import React from 'react';
import { Monitor, X, CheckCircle, Download, Laptop, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#072418] border-2 border-[#d4af37]/50 rounded-3xl shadow-2xl p-6 relative text-right">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#0c3524] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0c402c] to-[#041a11] border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37] shadow-lg">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-amiri text-[#f5e7b5]">
              تثبيت تطبيق نور على جهاز Windows
            </h3>
            <span className="text-xs text-[#a9dbc0]">
              برنامج خفيف، سريع، ويعمل بدون إنترنت
            </span>
          </div>
        </div>

        {/* Benefits list */}
        <div className="space-y-2.5 my-5 text-xs sm:text-sm text-[#d4e5dc] leading-relaxed">
          <div className="flex items-start gap-2 bg-[#051a12] p-3 rounded-xl border border-[#14422e]">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <strong>نافذة مستقلة:</strong> يفتح كتطبيق منفصل عن المتصفح بدون شريط الروابط، تماماً مثل أي برنامج كمبيوتر رسمي.
            </span>
          </div>
          <div className="flex items-start gap-2 bg-[#051a12] p-3 rounded-xl border border-[#14422e]">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <strong>وصول مباشر:</strong> أيقونة في قائمة ابدأ (Start Menu) وسطح المكتب وشريط المهام.
            </span>
          </div>
          <div className="flex items-start gap-2 bg-[#051a12] p-3 rounded-xl border border-[#14422e]">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <strong>أداء 2GB RAM:</strong> استهلاك ذاكرة فائق الضآلة، تشغيل سريع، وبدون أي ثقل على نظام التشغيل.
            </span>
          </div>
        </div>

        {/* Action Button */}
        {isInstallable ? (
          <button
            onClick={async () => {
              const res = await install();
              if (res) onClose();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5c048] hover:to-[#bd8723] text-[#051a12] font-bold text-sm shadow-xl transition cursor-pointer mb-3 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>تثبيت البرنامج على نظام Windows الآن</span>
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-[#051c13] border border-[#184e36] text-xs text-[#a3c9b7] mb-3 text-center">
            <p className="mb-2">
              💡 للتثبيت اليدوي في <strong>Microsoft Edge</strong> أو <strong>Google Chrome</strong>:
            </p>
            <p className="font-semibold text-[#f5e7b5]">
              اضغط على رمز <span className="text-[#d4af37]">«التثبيت» 📥</span> الموجود في أقصى يمين شريط العنوان بالمتصفح، أو من قائمة المتصفح (⋮) اختر <em>«تطبيقات » ← «تثبيت هذا الموقع كتطبيق»</em>.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-xs text-[#86a798] hover:text-white cursor-pointer"
        >
          إغلاق والمتابعة في المتصفح
        </button>
      </div>
    </div>
  );
};
