-- 오픈 채팅방
CREATE TABLE chat_rooms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL CHECK (type IN ('fixed', 'user')),
  category    TEXT,
  creator_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_rooms_select" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "chat_rooms_insert" ON chat_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND type = 'user');

-- 오픈 채팅방 메시지
CREATE TABLE chat_room_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_room_messages_select" ON chat_room_messages FOR SELECT USING (true);
CREATE POLICY "chat_room_messages_insert" ON chat_room_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "chat_room_messages_delete" ON chat_room_messages FOR DELETE
  USING (auth.uid() = sender_id);
CREATE INDEX chat_room_messages_room_idx ON chat_room_messages(room_id, created_at);

-- 1:1 DM 대화 (user1_id < user2_id 강제로 중복 방지)
CREATE TABLE direct_conversations (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT direct_conversations_ordered CHECK (user1_id < user2_id),
  UNIQUE (user1_id, user2_id)
);
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "direct_conversations_select" ON direct_conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "direct_conversations_insert" ON direct_conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- DM 메시지
CREATE TABLE direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "direct_messages_select" ON direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM direct_conversations dc
      WHERE dc.id = direct_messages.conversation_id
        AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
    )
  );
CREATE POLICY "direct_messages_insert" ON direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE INDEX direct_messages_conv_idx ON direct_messages(conversation_id, created_at);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- DM 대화 생성 RPC (LEAST/GREATEST로 순서 보장)
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  u1 UUID := LEAST(auth.uid()::text, other_user::text)::UUID;
  u2 UUID := GREATEST(auth.uid()::text, other_user::text)::UUID;
BEGIN
  SELECT id INTO conv_id FROM direct_conversations
  WHERE user1_id = u1 AND user2_id = u2;
  IF conv_id IS NULL THEN
    INSERT INTO direct_conversations (user1_id, user2_id)
    VALUES (u1, u2) RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
