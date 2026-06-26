import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { COMMUNITY_CATEGORIES } from '@/types/community';

export default async function ChatPage() {
  const db = supabaseServer();

  // 카테고리별 방 수 조회
  const { data: rooms } = await db
    .from('chat_rooms')
    .select('category')
    .eq('type', 'user');

  const countByCategory: Record<string, number> = {};
  (rooms ?? []).forEach((r) => {
    if (r.category) countByCategory[r.category] = (countByCategory[r.category] ?? 0) + 1;
  });

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">채팅</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">채팅 허브</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">카테고리를 선택해 채팅방에 참여하세요</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMMUNITY_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/chat/category/${cat.value}`}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8 hover:bg-white/80 dark:hover:bg-white/8 transition group"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-stone-900 dark:text-white font-semibold text-sm">{cat.label}</p>
                <p className="text-stone-400 dark:text-white/40 text-xs mt-0.5">
                  방 {countByCategory[cat.value] ?? 0}개
                </p>
              </div>
              <span className="text-stone-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform text-lg">›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
