'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  name: string;
  avatar_url: string | null;
}

interface Props {
  roomId: string;
  roomName: string;
  category?: string | null;
  initialMessages: Message[];
  profileMap: Record<string, Profile>;
  initialMemberCount: number;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isSameMinute(a: string, b: string) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours() &&
    da.getMinutes() === db.getMinutes();
}

export default function ChatRoomClient({
  roomId,
  roomName,
  category,
  initialMessages,
  profileMap: initialProfileMap,
  initialMemberCount,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>(initialProfileMap);
  const profileMapRef = useRef(profileMap);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(initialMemberCount);
  const [memberChecked, setMemberChecked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // profileMapRef를 profileMap 상태와 동기화
  useEffect(() => { profileMapRef.current = profileMap; }, [profileMap]);

  // 참여 여부 확인
  useEffect(() => {
    if (!user) { setMemberChecked(true); return; }
    supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsMember(!!data);
        setMemberChecked(true);
      });
  }, [user, roomId]);

  // 스크롤 하단 고정
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel(`chat:room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_room_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          // 발신자 프로필 없으면 조회
          if (!profileMapRef.current[msg.sender_id]) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .eq('id', msg.sender_id)
              .single();
            if (data) {
              setProfileMap((prev) => ({
                ...prev,
                [data.id]: { name: data.full_name || data.username || '익명', avatar_url: data.avatar_url },
              }));
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const join = async () => {
    if (!user) { router.push('/auth/login'); return; }
    setJoining(true);
    const { error } = await supabase
      .from('chat_room_members')
      .insert({ room_id: roomId, user_id: user.id });
    setJoining(false);
    if (!error) {
      setIsMember(true);
      setMemberCount((c) => c + 1);
    }
  };

  const leave = async () => {
    if (!user || leaving) return;
    setLeaving(true);
    const { error } = await supabase
      .from('chat_room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);
    if (!error) {
      setIsMember(false);
      setMemberCount((c) => Math.max(0, c - 1));
    }
    setLeaving(false);
  };

  const send = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!content.trim() || sending || !isMember) return;
    setSending(true);
    const { error } = await supabase.from('chat_room_messages').insert({
      room_id: roomId,
      sender_id: user.id,
      content: content.trim(),
    });
    if (!error) setContent('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-[#EDE8E2]/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center gap-3">
        <Link
          href={category ? `/chat/category/${category}` : '/chat'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/50 hover:text-stone-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 transition text-sm font-medium shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          뒤로
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-stone-900 dark:text-white font-bold text-base truncate">{roomName}</h1>
          <p className="text-stone-400 dark:text-white/30 text-xs">👥 {memberCount}명</p>
        </div>
        {memberChecked && user && isMember && (
          <button onClick={leave} disabled={leaving}
            className="text-xs px-3 py-1.5 rounded-lg text-stone-400 dark:text-white/30 hover:text-rose-400 hover:bg-rose-500/8 transition border border-black/8 dark:border-white/8 disabled:opacity-50"
          >
            {leaving ? '나가는 중...' : '나가기'}
          </button>
        )}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {messages.length === 0 && (
          <p className="text-center text-stone-400 dark:text-white/30 text-sm py-10">
            첫 메시지를 보내보세요
          </p>
        )}
        {messages.map((msg, idx) => {
          const isMine = user?.id === msg.sender_id;
          const prev = messages[idx - 1];
          const next = messages[idx + 1];

          // 날짜 구분선
          const showDate = !prev || !isSameDay(prev.created_at, msg.created_at);
          // 연속 메시지 그룹화 (같은 발신자, 1분 이내)
          const isGrouped = !!prev && prev.sender_id === msg.sender_id && isSameMinute(prev.created_at, msg.created_at);
          const isLastInGroup = !next || next.sender_id !== msg.sender_id || !isSameMinute(msg.created_at, next.created_at);

          const profile = profileMap[msg.sender_id];
          const displayName = isMine ? '' : (profile?.name ?? '익명');
          const initial = displayName[0]?.toUpperCase() ?? '?';

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
                  <span className="text-stone-400 dark:text-white/30 text-xs">{dateLabel(msg.created_at)}</span>
                  <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                {/* 상대방 아바타 */}
                {!isMine && (
                  <div className="w-8 shrink-0 self-end mb-0.5">
                    {!isGrouped && (
                      <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-white/10 flex items-center justify-center text-stone-600 dark:text-white/60 text-xs font-bold">
                        {initial}
                      </div>
                    )}
                  </div>
                )}

                <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {/* 이름 (상대방, 그룹 첫 메시지만) */}
                  {!isMine && !isGrouped && (
                    <span className="text-stone-500 dark:text-white/40 text-xs mb-1 ml-1">{displayName}</span>
                  )}
                  <div className="flex items-end gap-1.5">
                    {/* 시간 (내 메시지 왼쪽) */}
                    {isMine && isLastInGroup && (
                      <span className="text-[10px] text-stone-400 dark:text-white/25 mb-0.5">{timeLabel(msg.created_at)}</span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                        isMine
                          ? 'bg-amber-400 text-black rounded-br-sm'
                          : 'bg-white/80 dark:bg-white/10 text-stone-900 dark:text-white rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {/* 시간 (상대방 메시지 오른쪽) */}
                    {!isMine && isLastInGroup && (
                      <span className="text-[10px] text-stone-400 dark:text-white/25 mb-0.5">{timeLabel(msg.created_at)}</span>
                    )}
                  </div>
                </div>

                {/* 내 아바타 자리 (오른쪽 정렬 유지용) */}
                {isMine && <div className="w-8 shrink-0" />}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 / 참여하기 버튼 */}
      <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 bg-[#EDE8E2]/90 dark:bg-[#0a0a0a]/90">
        {!memberChecked ? null : !user ? (
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition"
          >
            로그인 후 채팅하기
          </button>
        ) : !isMember ? (
          <button
            onClick={join}
            disabled={joining}
            className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition disabled:opacity-50"
          >
            채팅방 참여하기
          </button>
        ) : (
          <div className="flex gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="메시지를 입력하세요 (Enter 전송)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm placeholder-stone-400 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition"
            />
            <button
              onClick={send}
              disabled={sending || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition disabled:opacity-40"
            >
              전송
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
