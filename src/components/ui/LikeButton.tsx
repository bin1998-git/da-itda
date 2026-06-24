'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Props {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
}

export default function LikeButton({ postId, initialCount, initialLiked }: Props) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (loading) return;
    setLoading(true);

    if (liked) {
      await supabase.from('media_likes').delete().match({ user_id: user.id, post_id: postId });
      setLiked(false);
      setCount((c) => c - 1);
    } else {
      await supabase.from('media_likes').insert({ user_id: user.id, post_id: postId });
      setLiked(true);
      setCount((c) => c + 1);
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
          : 'border-white/20 text-white/60 hover:border-rose-500/50 hover:text-rose-400'
      }`}
    >
      <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {count > 0 && <span>{count}</span>}
      <span>{liked ? '좋아요 취소' : '좋아요'}</span>
    </button>
  );
}
