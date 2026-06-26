'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function ChatUnreadBadge() {
  const user = useAuthStore((s) => s.user);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
        .filter(
          'conversation_id',
          'in',
          `(select id from direct_conversations where user1_id='${user.id}' or user2_id='${user.id}')`
        );
      setUnread(count ?? 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`chat:unread:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <Link
      href="/chat"
      className="relative w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition border border-transparent hover:border-black/8 dark:hover:border-white/8"
      title="채팅"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
