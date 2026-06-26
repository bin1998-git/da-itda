'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Product } from '@/types/market';

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃',
};

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR');
}

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [cartDone, setCartDone] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('product_likes')
      .select('id')
      .eq('product_id', product.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, product.id]);

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/auth/login'); return; }
    if (cartLoading || product.stock === 0) return;
    setCartLoading(true);
    const { error } = await supabase
      .from('cart_items')
      .upsert(
        { user_id: user.id, product_id: product.id, quantity: 1 },
        { onConflict: 'user_id,product_id' }
      );
    setCartLoading(false);
    if (!error) {
      setCartDone(true);
      setTimeout(() => setCartDone(false), 1500);
    }
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/auth/login'); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    if (liked) {
      await supabase.from('product_likes').delete()
        .eq('product_id', product.id).eq('user_id', user.id);
      setLiked(false);
    } else {
      await supabase.from('product_likes').insert({ product_id: product.id, user_id: user.id });
      setLiked(true);
    }
    setLikeLoading(false);
  };

  const isSoldOut = product.stock === 0;

  return (
    <Link href={`/market/${product.id}`} className="group block">
      <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 overflow-hidden hover:border-amber-500/30 transition-all duration-300">
        {/* 이미지 영역 */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center text-6xl">
          {product.images?.[0]
            ? (
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )
            : (
              <span className="transition-transform duration-300 group-hover:scale-105 select-none">
                {CATEGORY_EMOJI[product.category] ?? '📦'}
              </span>
            )
          }

          {/* 찜하기 버튼 — 우상단, hover 시 페이드인 */}
          <button
            onClick={toggleLike}
            disabled={likeLoading}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-30"
            aria-label="찜하기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill={liked ? '#f59e0b' : 'none'} stroke={liked ? '#f59e0b' : 'white'} strokeWidth="1.5">
              <path d="M8 13.5S2 9.5 2 5.5C2 3.567 3.567 2 5.5 2c1.05 0 2 .5 2.5 1.3C8.5 2.5 9.45 2 10.5 2 12.433 2 14 3.567 14 5.5c0 4-6 8-6 8Z"/>
            </svg>
          </button>

          {/* 하단 슬라이드업 오버레이 — 터치 디바이스는 항상 표시 */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 [@media(hover:none)]:translate-y-0 transition-transform duration-300">
            <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pt-8 pb-3">
              {isSoldOut ? (
                <div className="w-full py-2.5 rounded-xl bg-white/10 text-white/40 text-sm font-semibold text-center cursor-not-allowed">
                  품절
                </div>
              ) : (
                <button
                  onClick={addToCart}
                  disabled={cartLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {cartDone ? '✓ 담겼어요' : cartLoading ? '담는 중...' : '장바구니 담기'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-400/70 tracking-wider uppercase">
              {product.sellers?.store_name ?? '판매자'}
            </span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-[10px] text-rose-400 font-medium">잔여 {product.stock}개</span>
            )}
          </div>
          <p className="text-stone-900 dark:text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors duration-300">
            {product.title}
          </p>
          <p className="text-amber-400 font-bold text-base mt-0.5">
            {formatPrice(product.price)}원
          </p>
        </div>
      </div>
    </Link>
  );
}
