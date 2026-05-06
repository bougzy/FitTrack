import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/ui/Providers';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FitTrack — Accountability Fitness',
  description: 'Track workouts, verify exercises with sensors, compete with friends',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitTrack',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    title: 'FitTrack',
    description: 'Your accountability fitness partner',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#06b6d4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FitTrack" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="FitTrack" />
        {/* iOS splash screens */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        {/* Microsoft */}
        <meta name="msapplication-TileColor" content="#06b6d4" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
      </head>
      <body
        className={`${syne.variable} ${dmSans.variable} font-body bg-dark-950 text-dark-50 antialiased`}
      >
        <Providers>
          {children}
          <PWAInstallPrompt />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(20, 23, 42, 0.92)',
                color: '#f5f6fa',
                border: '1px solid rgba(34, 211, 238, 0.2)',
                borderRadius: '14px',
                fontFamily: 'var(--font-body)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              },
              success: {
                iconTheme: { primary: '#06b6d4', secondary: '#04050d' },
              },
              error: {
                iconTheme: { primary: '#f43f5e', secondary: '#04050d' },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}