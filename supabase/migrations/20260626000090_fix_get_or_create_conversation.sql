CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  u1 UUID := LEAST(auth.uid()::text, other_user::text)::UUID;
  u2 UUID := GREATEST(auth.uid()::text, other_user::text)::UUID;
BEGIN
  -- Try insert first; on conflict (race), fall through to select
  INSERT INTO direct_conversations (user1_id, user2_id)
  VALUES (u1, u2)
  ON CONFLICT (user1_id, user2_id) DO NOTHING;

  SELECT id INTO conv_id FROM direct_conversations
  WHERE user1_id = u1 AND user2_id = u2;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
