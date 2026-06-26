'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface RoomItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  lastMessage: { content: string; created_at: string } | null;
}

interface Props {
  category: string;
  catLabel: string;
  initialRooms: RoomItem[];
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function CategoryChatClient({ category, catLabel, initialRooms }: Props) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomItem[]>(initialRooms);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!name.trim()) { setError('방 이름을 입력해주세요.'); return; }
    setCreating(true);
    const { data, error: err } = await supabase
      .from('chat_rooms')
      .insert({
        name: name.trim(),
        description: desc.trim() || null,
        type: 'user',
        category,
        creator_id: user.id,
      })
      .select('id')
      .single();
    setCreating(false);
    if (err || !data) { setError(err?.message ?? '오류가 발생했습니다.'); return; }
    router.push(`/chat/room/${data.id}`);
  };

  return (
    <div>
      {/* 방 만들기 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-stone-500 dark:text-white/40 text-sm">{rooms.length}개의 채팅방</p>
        <button
          onClick={() => { setShowForm((v) => !v); setError(''); }}
          className="text-xs px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/25 transition font-semibold"
        >
          + 방 만들기
        </button>
      </div>

      {/* 방 만들기 폼 */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-3">
          <p className="text-stone-700 dark:text-white/70 text-sm font-semibold">{catLabel} 채팅방 만들기</p>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="방 이름"
            className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition text-sm"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="설명 (선택)"
            className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition text-sm"
          />
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setName(''); setDesc(''); setError(''); }}
              className="flex-1 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/50 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              onClick={createRoom}
              disabled={creating}
              className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {creating ? '생성 중...' : '만들기'}
            </button>
          </div>
        </div>
      )}

      {/* 방 목록 */}
      {rooms.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-stone-400 dark:text-white/30 text-sm">아직 채팅방이 없어요</p>
          <p className="text-stone-300 dark:text-white/20 text-xs mt-1">첫 번째 방을 만들어보세요!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/room/${room.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8 hover:bg-white/80 dark:hover:bg-white/8 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 font-bold text-sm shrink-0">
                {room.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-stone-900 dark:text-white font-semibold text-sm truncate">{room.name}</p>
                  <span className="text-stone-400 dark:text-white/30 text-xs shrink-0">👥 {room.memberCount}</span>
                </div>
                <p className="text-stone-400 dark:text-white/35 text-xs truncate mt-0.5">
                  {room.lastMessage ? room.lastMessage.content : (room.description ?? '대화를 시작해보세요')}
                </p>
              </div>
              {room.lastMessage && (
                <span className="text-stone-300 dark:text-white/20 text-xs shrink-0">{fmtDate(room.lastMessage.created_at)}</span>
              )}
              <span className="text-stone-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
