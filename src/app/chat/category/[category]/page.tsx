import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';
import CategoryChatClient from './CategoryChatClient';

export default async function CategoryChatPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = COMMUNITY_CATEGORY_MAP[category];
  if (!cat) notFound();

  const db = supabaseServer();

  const { data: rooms } = await db
    .from('chat_rooms')
    .select('id, name, description, creator_id, created_at')
    .eq('type', 'user')
    .eq('category', category)
    .order('created_at', { ascending: false });

  // 방별 멤버 수 + 최근 메시지
  const roomIds = (rooms ?? []).map((r) => r.id);

  const [{ data: memberCounts }, { data: lastMessages }] = await Promise.all([
    roomIds.length > 0
      ? db.from('chat_room_members').select('room_id').in('room_id', roomIds)
      : Promise.resolve({ data: [] }),
    roomIds.length > 0
      ? db
          .from('chat_room_messages')
          .select('room_id, content, created_at')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const memberCountMap: Record<string, number> = {};
  (memberCounts ?? []).forEach((m) => {
    memberCountMap[m.room_id] = (memberCountMap[m.room_id] ?? 0) + 1;
  });

  const lastMsgMap: Record<string, { content: string; created_at: string }> = {};
  (lastMessages ?? []).forEach((msg) => {
    if (!lastMsgMap[msg.room_id]) lastMsgMap[msg.room_id] = msg;
  });

  const enrichedRooms = (rooms ?? []).map((r) => ({
    ...r,
    memberCount: memberCountMap[r.id] ?? 0,
    lastMessage: lastMsgMap[r.id] ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/chat" className="text-stone-400 dark:text-white/30 text-sm hover:text-stone-600 dark:hover:text-white/60 transition">채팅</Link>
          <span className="text-stone-300 dark:text-white/20 text-sm">›</span>
        </div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">카테고리</p>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
              {cat.emoji} {cat.label}
            </h1>
          </div>
        </div>

        <CategoryChatClient
          category={category}
          catLabel={cat.label}
          initialRooms={enrichedRooms}
        />
      </div>
    </main>
  );
}
