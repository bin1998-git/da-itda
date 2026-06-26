'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Props {
  roomId: string;
  roomName: string;
  initialMessages: Message[];
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoomClient({ roomId, roomName, initialMessages }: Props) {
  const user    = useAuthStore((s) => s.user);
  const router  = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent]   = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_room_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const send = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!content.trim() || sending) return;
    setSending(true);
    await supabase.from('chat_room_messages').insert({
      room_id: roomId,
      sender_id: user.id,
      content: content.trim(),
    });
    setContent('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-[#EDE8E2]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm">
        <h1 className="text-stone-900 dark:text-white font-bold text-lg">{roomName}</h1>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-center text-stone-400 dark:text-white/30 text-sm py-10">
            첫 메시지를 보내보세요
          </p>
        )}
        {messages.map((msg) => {
          const isMine = user?.id === msg.sender_id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-emerald-500 text-black rounded-br-sm'
                      : 'bg-white/70 dark:bg-white/10 text-stone-900 dark:text-white rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-stone-400 dark:text-white/25">
                  {timeLabel(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-[#EDE8E2]/80 dark:bg-[#0a0a0a]/80">
        <div className="flex gap-3">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={user ? '메시지를 입력하세요 (Enter 전송)' : '로그인 후 채팅할 수 있습니다'}
            disabled={!user}
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm placeholder-stone-400 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
          />
          <button
            onClick={send}
            disabled={sending || !content.trim() || !user}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
