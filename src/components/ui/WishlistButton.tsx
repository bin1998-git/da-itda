'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Props {
  productId: string;
}

export default function WishlistButton({ productId }: Props) {
  const user = useAuthStore((s) => s.user);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('product_likes')
      .select('*', { count: 'exact' })
      .eq('product_id', productId)
      .then(({ count: c }) => setCount(c ?? 0));

    if (!user) return;
    supabase
      .from('product_likes')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [productId, user]);

  const toggle = async () => {
    if (!user) { alert('로그인 후 이용할 수 있습니다.'); return; }
    setLoading(true);
    if (liked) {
      await supabase.from('product_likes').delete()
        .eq('product_id', productId).eq('user_id', user.id);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('product_likes').insert({ product_id: productId, user_id: user.id });
      setLiked(true);
      setCount((c) => c + 1);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-medium text-sm transition ${
        liked
          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-stone-500 dark:text-white/50 hover:bg-black/8 dark:hover:bg-white/8 hover:text-stone-900 dark:hover:text-white'
      }`}
    >
      <svg
        className={`w-4 h-4 transition ${liked ? 'fill-rose-400 stroke-rose-400' : 'fill-none stroke-current'}`}
        viewBox="0 0 24 24"
        strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {liked ? '찜 완료' : '찜하기'}
      {count > 0 && <span className="text-xs opacity-60">{count}</span>}
    </button>
  );
}
