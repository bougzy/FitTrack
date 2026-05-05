'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, Users, BarChart2, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/programs', icon: ClipboardList, label: 'Programs' },
  { href: '/groups', icon: Users, label: 'Groups' },
  { href: '/analytics', icon: BarChart2, label: 'Stats' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav bottom-nav">
      <div className="flex items-stretch justify-around px-2 pt-1.5 pb-0.5 max-w-2xl mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-2xl relative min-w-[3rem] flex-1"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-gradient-to-br from-brand-500/25 to-brand-700/10 border border-brand-500/30 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.25)]"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative"
              >
                <Icon
                  size={20}
                  className={`transition-colors ${isActive ? 'text-brand-300' : 'text-dark-400'}`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
              </motion.div>
              <span className={`relative text-[10px] font-display font-semibold transition-colors ${isActive ? 'text-brand-200' : 'text-dark-500'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
