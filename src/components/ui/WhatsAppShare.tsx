'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, X, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface WhatsAppShareProps {
  text: string;
  /** Phone number in international format without "+", e.g. "2348012345678". Optional — if omitted, opens chooser. */
  phone?: string;
  trigger: React.ReactNode;
  /** Additional non-WhatsApp options shown beneath. */
  extraActions?: { label: string; icon: React.ReactNode; onClick: () => void }[];
  title?: string;
}

/**
 * Picker that lets the user choose between regular WhatsApp and WhatsApp Business
 * before sharing. Falls back to copy/native share for browsers that block deep links.
 */
export function WhatsAppShare({
  text,
  phone = '',
  trigger,
  extraActions = [],
  title = 'Share via WhatsApp',
}: WhatsAppShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const encoded = encodeURIComponent(text);
  const phonePart = phone ? phone.replace(/\D/g, '') : '';

  const openInApp = (target: 'whatsapp' | 'business' | 'web') => {
    let url = '';

    if (target === 'web') {
      // Universal web link — works whether app is installed or not
      url = phonePart
        ? `https://wa.me/${phonePart}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      setOpen(false);
      return;
    }

    // Try the app-scheme deep link first; fall back to wa.me after a short delay
    // so iOS/Android users without the chosen app don't see a dead page.
    if (target === 'whatsapp') {
      url = phonePart
        ? `whatsapp://send?phone=${phonePart}&text=${encoded}`
        : `whatsapp://send?text=${encoded}`;
    } else {
      // WhatsApp Business — same scheme on iOS, distinct package on Android
      const isAndroid = /android/i.test(navigator.userAgent);
      if (isAndroid) {
        // Android intent that explicitly targets the Business package
        url = `intent://send?text=${encoded}${
          phonePart ? `&phone=${phonePart}` : ''
        }#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
      } else {
        // iOS uses a separate scheme registered by the Business app
        url = phonePart
          ? `whatsapp-business://send?phone=${phonePart}&text=${encoded}`
          : `whatsapp-business://send?text=${encoded}`;
      }
    }

    const fallback = phonePart
      ? `https://wa.me/${phonePart}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    // Attempt deep link, redirect to web fallback if app isn't installed
    const start = Date.now();
    const timer = window.setTimeout(() => {
      if (Date.now() - start < 1600 && document.visibilityState === 'visible') {
        window.location.href = fallback;
      }
    }, 1200);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') window.clearTimeout(timer);
    };
    document.addEventListener('visibilitychange', onVisibility, { once: true });

    window.location.href = url;
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ text });
        setOpen(false);
      } catch {
        /* user cancelled */
      }
    } else {
      toast('Native share unavailable. Try Copy.');
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 flex items-end justify-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-lg bg-dark-900 border-t border-dark-700 rounded-t-3xl pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-dark-600 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-6 py-3 border-b border-dark-800">
                <h3 className="font-display text-lg font-bold text-dark-50">{title}</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-dark-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pt-4 space-y-2.5">
                <p className="text-xs text-dark-500 mb-2">
                  Choose which app to open. We&apos;ll fall back to web WhatsApp if the chosen app isn&apos;t installed.
                </p>

                <ShareOption
                  emoji="🟢"
                  label="WhatsApp"
                  sub="Personal account"
                  onClick={() => openInApp('whatsapp')}
                />
                <ShareOption
                  emoji="💼"
                  label="WhatsApp Business"
                  sub="Business account"
                  onClick={() => openInApp('business')}
                />
                <ShareOption
                  emoji="🌐"
                  label="Open WhatsApp Web"
                  sub="Browser — works without app"
                  onClick={() => openInApp('web')}
                />

                <div className="border-t border-dark-800 my-3" />

                <ShareOption
                  emoji={copied ? '✅' : '📋'}
                  label={copied ? 'Copied!' : 'Copy text'}
                  sub="Paste anywhere"
                  onClick={handleCopy}
                />
                <ShareOption
                  emoji="📤"
                  label="More apps…"
                  sub="System share sheet"
                  onClick={handleNativeShare}
                />

                {extraActions.map((a) => (
                  <ShareOption
                    key={a.label}
                    customIcon={a.icon}
                    label={a.label}
                    onClick={() => {
                      a.onClick();
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ShareOption({
  emoji,
  customIcon,
  label,
  sub,
  onClick,
}: {
  emoji?: string;
  customIcon?: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-dark-800 hover:bg-dark-700 active:scale-[0.98] transition-all rounded-xl text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl flex-shrink-0">
        {customIcon || <span>{emoji}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-dark-100 leading-tight">{label}</p>
        {sub && <p className="text-xs text-dark-500 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}
