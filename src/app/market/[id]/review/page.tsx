'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import StarRating from '@/components/ui/StarRating';

const LABEL = ['', '별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요!'];

type LoadState = 'loading' | 'not-purchased' | 'not-delivered' | 'ok';

export default function ReviewPage() {
  const router = useRouter();
  const { id: productId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [product, setProduct] = useState<{ title: string; images: string[] } | null>(null);
  const [existingReview, setExistingReview] = useState<{ id: string; rating: number; content: string | null } | null>(null);
  const [rating, setRating]   = useState(5);
  const [content, setContent] = useState('');
  const [hover, setHover]     = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/auth/login'); return; }

    (async () => {
      // 상품 정보
      const { data: prod } = await supabase
        .from('products').select('title, images').eq('id', productId).single();
      setProduct(prod as { title: string; images: string[] });

      // 기존 리뷰
      const { data: existing } = await supabase
        .from('reviews').select('id, rating, content')
        .eq('product_id', productId).eq('user_id', user.id).maybeSingle();
      if (existing) {
        setExistingReview(existing);
        setRating(existing.rating);
        setContent(existing.content ?? '');
      }

      // 구매 여부 확인 (배송완료 주문에 해당 상품 있는지)
      const { data: orders } = await supabase
        .from('orders').select('id').eq('user_id', user.id).eq('status', 'delivered');

      if (!orders?.length) {
        // 이미 리뷰가 있으면 수정은 허용
        setLoadState(existing ? 'ok' : 'not-delivered');
        return;
      }

      const { data: items } = await supabase
        .from('order_items').select('id')
        .eq('product_id', productId)
        .in('order_id', orders.map((o) => o.id))
        .limit(1);

      if (!items?.length && !existing) {
        setLoadState('not-purchased');
        return;
      }

      setLoadState('ok');
    })();
  }, [user, isLoading, productId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0) return;
    setSubmitting(true);
    setError('');

    if (existingReview) {
      const { error: err } = await supabase.from('reviews')
        .update({ rating, content: content.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', existingReview.id);
      if (err) { setError(err.message); setSubmitting(false); return; }
    } else {
      const { error: err } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user.id,
        rating,
        content: content.trim() || null,
      });
      if (err) { setError(err.message); setSubmitting(false); return; }
    }

    router.push(`/market/${productId}?tab=review`);
  };

  /* ── 로딩 / 조건 불충족 ─────────────────────────────────────────── */
  if (isLoading || loadState === 'loading' || !product) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadState === 'not-purchased') {
    return (
      <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
        <div className="max-w-lg mx-auto px-6 py-10 text-center">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">구매 후 작성 가능해요</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mb-6">이 상품을 구매하신 분만 후기를 남길 수 있어요.</p>
          <Link href={`/market/${productId}`} className="px-6 py-3 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition">
            상품 보러가기
          </Link>
        </div>
      </main>
    );
  }

  if (loadState === 'not-delivered') {
    return (
      <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
        <div className="max-w-lg mx-auto px-6 py-10 text-center">
          <div className="text-5xl mb-4">🚚</div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">배송 완료 후 작성 가능해요</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mb-6">상품을 받으신 후 솔직한 후기를 남겨주세요.</p>
          <Link href="/orders" className="px-6 py-3 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition">
            주문 내역 보기
          </Link>
        </div>
      </main>
    );
  }

  const displayRating = hover || rating;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-lg mx-auto px-6 py-10">
        <button onClick={() => router.back()} className="text-stone-400 dark:text-white/40 text-sm hover:text-stone-900 dark:hover:text-white transition mb-8 flex items-center gap-2">
          ← 돌아가기
        </button>

        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-1">
          {existingReview ? '후기 수정' : '후기 작성'}
        </h1>
        <p className="text-stone-400 dark:text-white/40 text-sm mb-8">구매하신 상품은 어떠셨나요?</p>

        {/* 상품 미니 카드 */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 mb-8">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl shrink-0">📦</div>
          )}
          <p className="text-stone-800 dark:text-white text-sm font-medium leading-snug line-clamp-2">{product.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 별점 */}
          <div className="flex flex-col items-center gap-3 py-6 rounded-xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-125 active:scale-95"
                >
                  <svg width="36" height="36" viewBox="0 0 20 20">
                    <path d="M10 1l2.6 5.3 5.9.9-4.3 4.2 1 5.8L10 14.3l-5.2 2.9 1-5.8L1.5 7.2l5.9-.9z" fill={star <= displayRating ? '#f59e0b' : '#d1d5db'} className="transition-colors duration-100" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-amber-500 font-semibold text-sm h-5">{displayRating > 0 ? LABEL[displayRating] : ''}</p>
          </div>

          {/* 텍스트 후기 */}
          <div>
            <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">
              상세 후기 <span className="text-stone-400 dark:text-white/30 normal-case font-normal">(선택)</span>
            </label>
            <textarea
              placeholder="품질, 배송, 포장 상태 등 솔직한 후기를 남겨주세요. 다른 구매자에게 큰 도움이 됩니다."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none text-sm"
            />
            <p className="text-right text-xs text-stone-400 dark:text-white/30 mt-1">{content.length}/1000</p>
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition disabled:opacity-50"
          >
            {submitting ? '등록 중...' : existingReview ? '후기 수정하기' : '후기 등록하기'}
          </button>
        </form>
      </div>
    </main>
  );
}
