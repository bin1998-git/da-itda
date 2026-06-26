import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';

async function getUser() {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export default async function ChatPage() {
  const user = await getUser();
  if (!user) redirect('/auth/login?next=/chat');

  const db = supabaseServer();

  const [{ data: fixedRooms }, { data: userRooms }] = await Promise.all([
    db.from('chat_rooms').select('id, name, description, category').eq('type', 'fixed').order('created_at'),
    db.from('chat_rooms').select('id, name, description, created_at').eq('type', 'user').order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">채팅</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">채팅 허브</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">오픈 채팅방에서 이야기를 나눠요</p>
        </div>

        {/* 고정 채팅방 */}
        <section className="mb-10">
          <h2 className="text-stone-700 dark:text-white/70 text-sm font-semibold mb-3">카테고리 채팅방</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(fixedRooms ?? []).map((room) => {
              const cat = room.category ? COMMUNITY_CATEGORY_MAP[room.category] : null;
              return (
                <Link
                  key={room.id}
                  href={`/chat/room/${room.id}`}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8 hover:bg-white/80 dark:hover:bg-white/8 transition group"
                >
                  <span className="text-2xl">{cat?.emoji ?? '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-900 dark:text-white font-semibold text-sm truncate">{room.name}</p>
                    {room.description && (
                      <p className="text-stone-400 dark:text-white/40 text-xs truncate mt-0.5">{room.description}</p>
                    )}
                  </div>
                  <span className="text-stone-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 유저 생성 채팅방 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-stone-700 dark:text-white/70 text-sm font-semibold">유저 채팅방</h2>
            <Link
              href="/chat/room/create"
              className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold transition"
            >
              + 방 만들기
            </Link>
          </div>
          {(userRooms ?? []).length === 0 ? (
            <div className="py-12 text-center text-stone-400 dark:text-white/30 text-sm">
              아직 유저 채팅방이 없어요
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {(userRooms ?? []).map((room) => (
                <Link
                  key={room.id}
                  href={`/chat/room/${room.id}`}
                  className="py-3.5 flex items-center gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition group"
                >
                  <span className="text-xl">💬</span>
                  <p className="flex-1 text-stone-900 dark:text-white text-sm font-medium truncate">{room.name}</p>
                  <span className="text-stone-300 dark:text-white/20 text-sm group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
