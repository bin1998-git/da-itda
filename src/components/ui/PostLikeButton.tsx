'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function PostLikeButton({
  postId,
  initialCount,
  initialLiked,
}: {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (loading) return;
    setLoading(true);

    if (liked) {
      await supabase.from('post_likes').delete().match({ user_id: user.id, post_id: postId });
      setLiked(false);
      setCount((c) => c - 1);
    } else {
      await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId });
      setLiked(true);
      setCount((c) => c + 1);
      // 게시글 작성자에게 알림 (본인 제외)
      const { data: post } = await supabase.from('posts').select('user_id, title').eq('id', postId).single();
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'like_post',
          title: '게시글에 좋아요가 달렸습니다',
          body: post.title,
          link: `/community/${postId}`,
        });
      }
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all ${
        liked
          ? 'bg-rose-500 border-rose-500 text-white'
          : 'border-black/20 dark:border-white/20 text-stone-600 dark:text-white/60 hover:border-rose-500/50 hover:text-rose-400'
      }`}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      {count > 0 && <span>{count}</span>}
      <span>{liked ? '좋아요 취소' : '좋아요'}</span>
    </button>
  );
}
