import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import ChatRoomClient from '@/components/ui/ChatRoomClient';

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const db = supabaseServer();

  const [{ data: room }, { data: messages }] = await Promise.all([
    db.from('chat_rooms').select('id, name, category').eq('id', roomId).single(),
    db
      .from('chat_room_messages')
      .select('id, sender_id, content, created_at')
      .eq('room_id', roomId)
      .order('created_at')
      .limit(100),
  ]);

  if (!room) notFound();

  // 메시지 발신자 프로필 일괄 조회
  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  const { data: profiles } =
    senderIds.length > 0
      ? await db
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', senderIds)
      : { data: [] };

  const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
  (profiles ?? []).forEach((p) => {
    profileMap[p.id] = {
      name: p.full_name || p.username || '익명',
      avatar_url: p.avatar_url || null,
    };
  });

  // 멤버 수 조회 (서버에서 — isMember는 클라이언트에서 확인)
  const { count: memberCount } = await db
    .from('chat_room_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-16">
      <ChatRoomClient
        roomId={room.id}
        roomName={room.name}
        category={room.category}
        initialMessages={messages ?? []}
        profileMap={profileMap}
        initialMemberCount={memberCount ?? 0}
      />
    </main>
  );
}
