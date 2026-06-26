CREATE TABLE chat_room_members (
  room_id   UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON chat_room_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON chat_room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete" ON chat_room_members FOR DELETE
  USING (auth.uid() = user_id);
CREATE INDEX chat_room_members_user_idx ON chat_room_members(user_id);
