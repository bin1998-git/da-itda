'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function DmPage() {
  const params    = useParams();
  const targetId  = params.userId as string;
  const user      = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router    = useRouter();

  const [convId,    setConvId]    = useState<string | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [content,   setContent]   = useState('');
  const [sending,   setSending]   = useState(false);
  const [initDone,  setInitDone]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (user.id === targetId) { router.replace('/chat'); return; }

    // 대화방 조회 또는 생성 (RPC)
    // @ts-ignore – custom RPC
    supabase.rpc('get_or_create_conversation', { other_user: targetId }).then(({ data: cid, error: rpcErr }) => {
      if (rpcErr || !cid) {
        setInitDone(true); // show page, not spinner
        return;
      }
      setConvId(cid);

      // 초기 메시지 로드
      supabase
        .from('direct_messages')
        .select('id, sender_id, content, created_at, read_at')
        .eq('conversation_id', cid)
        .order('created_at')
        .limit(100)
        .then(({ data }) => {
          setMessages((data as Message[]) ?? []);
          setInitDone(true);
        });

      // NOTE: read_at 업데이트는 UPDATE RLS 정책 없음으로 인해 생략
    });
  }, [isLoading, user, targetId, router]);

  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel(`chat:dm:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convId]);

  const send = async () => {
    if (!user || !convId || !content.trim() || sending) return;
    setSending(true);
    await supabase.from('direct_messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content: content.trim(),
    });
    setContent('');
    setSending(false);
  };

  if (isLoading || !initDone) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-16">
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
          <Link href="/chat" className="text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-500/40 flex items-center justify-center text-stone-900 dark:text-white text-xs font-bold">
            D
          </div>
          <span className="text-stone-900 dark:text-white font-semibold text-sm">다이렉트 메시지</span>
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
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-400 dark:text-white/25">
                      {timeLabel(msg.created_at)}
                    </span>
                    {isMine && (
                      <span className="text-[10px] text-stone-400 dark:text-white/25">
                        {msg.read_at ? '읽음' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="px-6 py-4 border-t border-black/5 dark:border-white/5">
          <div className="flex gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="메시지를 입력하세요 (Enter 전송)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm placeholder-stone-400 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
            <button
              onClick={send}
              disabled={sending || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-40"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
