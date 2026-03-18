'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently — only show once every 3 days
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < threeDays) return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    if (iOS) {
      // Show iOS guide after 3 seconds
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also detect if app was installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (isInstalled) return null;

  return (
    <>
      {/* ---- MAIN INSTALL BANNER ---- */}
      <AnimatePresence>
        {showPrompt && !showIOSGuide && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
          >
            <div className="bg-dark-800 border border-brand-500/40 rounded-2xl p-4 shadow-2xl shadow-black/50">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    💪
                  </div>
                  <div>
                    <p className="font-display font-bold text-dark-50">Install FitTrack</p>
                    <p className="text-xs text-dark-400">Add to your home screen</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-dark-500 hover:text-dark-300 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Benefits */}
              <div className="space-y-1.5 mb-4">
                {[
                  '⚡ Works offline — track workouts anywhere',
                  '🔔 Get notified when your group is active',
                  '📱 Full-screen app experience',
                ].map((benefit) => (
                  <p key={benefit} className="text-xs text-dark-300 flex items-start gap-1.5">
                    <span>{benefit}</span>
                  </p>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 bg-dark-700 text-dark-300 rounded-xl text-sm font-medium active:scale-95 transition-transform"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  {isIOS ? (
                    <>
                      <Share size={15} />
                      How to Install
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      Install App
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- iOS STEP BY STEP GUIDE ---- */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 flex items-end"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full bg-dark-900 border-t border-dark-700 rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-dark-600 rounded-full" />
              </div>

              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-bold text-dark-50">
                  Install on iPhone
                </h3>
                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-dark-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: '1',
                    icon: <Share size={20} className="text-brand-400" />,
                    title: 'Tap the Share button',
                    description: 'Tap the Share icon at the bottom of your Safari browser (the square with an arrow pointing up)',
                  },
                  {
                    step: '2',
                    icon: <Plus size={20} className="text-brand-400" />,
                    title: 'Tap "Add to Home Screen"',
                    description: 'Scroll down in the share menu and tap "Add to Home Screen"',
                  },
                  {
                    step: '3',
                    icon: <span className="text-brand-400 text-lg">💪</span>,
                    title: 'Tap "Add"',
                    description: 'Confirm by tapping "Add" in the top right corner. FitTrack will appear on your home screen!',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-500/20 border border-brand-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-100 text-sm">{item.title}</p>
                      <p className="text-dark-400 text-xs mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Important note for iOS */}
              <div className="mt-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-300 flex items-start gap-2">
                  <span className="flex-shrink-0">ℹ️</span>
                  <span>
                    Make sure you are using <strong>Safari</strong> browser on your iPhone.
                    This does not work in Chrome or other browsers on iOS.
                  </span>
                </p>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full mt-5 py-3.5 bg-brand-500 text-white font-display font-bold rounded-xl active:scale-95 transition-transform"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}