'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '@/hooks/useApi';
import { X, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

const NOTIF_ICONS: Record<string, string> = {
  workout_shared: '💪',
  group_invite: '👥',
  group_join_request: '🔔',
  streak_milestone: '🔥',
  badge_earned: '🏆',
  challenge_started: '⚡',
  challenge_completed: '🎉',
  missed_workout: '😴',
  partner_workout: '👋',
  system: '📣',
};

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { request, loading } = useApi();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const res = await request<any>('/api/notifications?limit=30');
    if (res?.success) {
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    }
  };

  const markAllRead = async () => {
    await request('/api/notifications', { method: 'PATCH', body: { markAllRead: true } });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await request('/api/notifications', { method: 'PATCH', body: { notificationId: id } });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        exit={{ y: '-100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="absolute top-0 left-0 right-0 bg-dark-900 border-b border-dark-700 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="safe-top">
          <div className="flex items-center justify-between px-4 py-4 border-b border-dark-800">
            <div>
              <h2 className="font-display text-xl font-bold text-dark-50">Notifications</h2>
              {unreadCount > 0 && <p className="text-xs text-dark-400 mt-0.5">{unreadCount} unread</p>}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-brand-400 px-2 py-1">
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button onClick={onClose} className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center text-dark-400">
                <X size={18} />
              </button>
            </div>
          </div>

          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-dark-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-dark-400">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {notifications.map((notif: any) => (
                <button
                  key={notif._id}
                  onClick={() => markRead(notif._id)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${!notif.read ? 'bg-brand-500/5' : 'hover:bg-dark-800'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${!notif.read ? 'bg-brand-500/20' : 'bg-dark-700'}`}>
                    {NOTIF_ICONS[notif.type] || '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${!notif.read ? 'text-dark-50' : 'text-dark-200'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && <div className="w-2 h-2 bg-brand-400 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-[11px] text-dark-600 mt-1">{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
