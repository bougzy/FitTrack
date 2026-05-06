/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        /**
         * Brand: ELECTRIC CYAN — energetic primary
         */
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        /**
         * Accent: VIOLET — AI / smart features
         */
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        /**
         * Live: ROSE — pulsing red for live sessions / streak warnings
         */
        live: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        /**
         * Dark: cool blue-black surfaces with subtle indigo undertone
         */
        dark: {
          50: '#f5f6fa',
          100: '#e9ebf2',
          200: '#c9cdda',
          300: '#9ba0b5',
          400: '#6e7387',
          500: '#4a4f63',
          600: '#353a4d',
          700: '#21253a',
          800: '#14172a',
          900: '#0a0c1a',
          950: '#04050d',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'mesh-brand':
          'radial-gradient(at 20% 0%, rgba(6, 182, 212, 0.18) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(168, 85, 247, 0.16) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(244, 63, 94, 0.06) 0px, transparent 50%)',
        'mesh-ai':
          'radial-gradient(at 0% 0%, rgba(168, 85, 247, 0.22) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.18) 0px, transparent 50%)',
        'mesh-live':
          'radial-gradient(at 0% 0%, rgba(244, 63, 94, 0.22) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.14) 0px, transparent 50%)',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-lg': '0 20px 60px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'brand-glow': '0 0 28px rgba(6, 182, 212, 0.45), 0 0 60px rgba(6, 182, 212, 0.18)',
        'ai-glow': '0 0 28px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.15)',
        'live-glow': '0 0 28px rgba(244, 63, 94, 0.45), 0 0 60px rgba(244, 63, 94, 0.18)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounce 2s infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        glow: 'glow 2s ease-in-out infinite alternate',
        progress: 'progress 1.5s ease-in-out infinite',
        'shimmer-slow': 'shimmerSlow 3s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { '0%': { transform: 'translateY(-20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { transform: 'scale(0.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.9), 0 0 40px rgba(6, 182, 212, 0.4)' },
        },
        progress: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        shimmerSlow: { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
      },
    },
  },
  plugins: [],
};
