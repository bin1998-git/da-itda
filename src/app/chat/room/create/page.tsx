'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function CreateRoomPage() {
  const user   = useAuthStore((s) => s.user);
  const router = useRouter();
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  if (!user) { router.replace('/auth/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('방 이름을 입력해주세요.'); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('chat_rooms')
      .insert({ name: name.trim(), description: description.trim() || null, type: 'user', creator_id: user.id })
      .select('id')
      .single();
    setLoading(false);
    if (err || !data) { setError(err?.message ?? '오류가 발생했습니다.'); return; }
    router.push(`/chat/room/${data.id}`);
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">채팅</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">채팅방 만들기</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">방 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="채팅방 이름을 입력하세요"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">
              설명 <span className="text-stone-400 dark:text-white/30 font-normal">(선택)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="어떤 채팅방인지 설명해주세요"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-full border border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
