'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  like_post: '❤️', like_media: '❤️', comment: '💬', order: '📦', default: '🔔',
};

const fmt = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

export default function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      supabase
        .from('notifications')
        .select('id, type, title, body, link, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          const rows = (data ?? []) as Notification[];
          setNotifications(rows);
          setUnreadCount(rows.filter((n) => !n.is_read).length);
        });
    };
    load();
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition border border-transparent hover:border-black/8 dark:hover:border-white/8"
        title="알림"
      >
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/50 overflow-hidden z-50">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/6 dark:border-white/6">
            <p className="text-stone-700 dark:text-white/70 text-sm font-semibold">알림</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-stone-400 dark:text-white/30 hover:text-stone-900 dark:hover:text-white transition">
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-3xl block mb-2">🔔</span>
                <p className="text-stone-400 dark:text-white/30 text-xs">새 알림이 없습니다.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const inner = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-black/4 dark:hover:bg-white/4 transition cursor-pointer ${!n.is_read ? 'bg-black/[0.02] dark:bg-white/[0.02]' : ''}`}
                    onClick={() => { if (!n.is_read) markRead(n.id); setOpen(false); }}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? TYPE_ICON.default}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.is_read ? 'text-stone-500 dark:text-white/45' : 'text-stone-800 dark:text-white/80'}`}>{n.title}</p>
                      {n.body && <p className="text-stone-400 dark:text-white/25 text-xs mt-0.5 truncate">{n.body}</p>}
                      <p className="text-stone-300 dark:text-white/20 text-[10px] mt-1">{fmt(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />}
                  </div>
                );
                return n.link
                  ? <Link key={n.id} href={n.link}>{inner}</Link>
                  : <div key={n.id}>{inner}</div>;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
