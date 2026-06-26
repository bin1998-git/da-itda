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
    db.from('chat_rooms').select('id, name').eq('id', roomId).single(),
    db.from('chat_room_messages')
      .select('id, sender_id, content, created_at')
      .eq('room_id', roomId)
      .order('created_at')
      .limit(100),
  ]);

  if (!room) notFound();

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-16">
      <ChatRoomClient
        roomId={room.id}
        roomName={room.name}
        initialMessages={messages ?? []}
      />
    </main>
  );
}
