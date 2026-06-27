'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getRecentProductIds } from './ViewTracker';
import StarRating from './StarRating';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  category: string;
  sellers: { store_name: string } | null;
  reviews: { rating: number }[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃', etc: '📦',
};

export default function RecentlyViewedProducts({ excludeId }: { excludeId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const ids = getRecentProductIds().filter((id) => id !== excludeId);
    if (ids.length === 0) return;

    supabase
      .from('products')
      .select('id, title, price, images, category, sellers(store_name), reviews(rating)')
      .in('id', ids)
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        // localStorage 순서(최신순) 기준으로 정렬
        const sorted = ids
          .map((id) => (data as unknown as Product[]).find((p) => p.id === id))
          .filter(Boolean) as Product[];
        setProducts(sorted);
      });
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-12">
      <h3 className="text-stone-900 dark:text-white font-bold text-base mb-4">
        최근 본 상품
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((p) => {
          const reviews = p.reviews ?? [];
          const avg = reviews.length
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            : 0;

          return (
            <Link
              key={p.id}
              href={`/market/${p.id}`}
              className="shrink-0 w-36 rounded-xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 hover:border-amber-500/30 transition-all duration-200 overflow-hidden group"
            >
              {/* 이미지 */}
              <div className="aspect-square bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center text-3xl overflow-hidden">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span>{CATEGORY_EMOJI[p.category] ?? '📦'}</span>
                )}
              </div>

              {/* 정보 */}
              <div className="p-2.5 flex flex-col gap-1">
                <p className="text-[10px] text-amber-400/70 font-semibold truncate">
                  {p.sellers?.store_name ?? '판매자'}
                </p>
                <p className="text-stone-900 dark:text-white text-xs font-semibold leading-snug line-clamp-2 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                  {p.title}
                </p>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1">
                    <StarRating rating={avg} size="sm" />
                    <span className="text-amber-500 text-[10px] font-semibold">{avg.toFixed(1)}</span>
                  </div>
                )}
                <p className="text-amber-400 font-bold text-xs mt-0.5">
                  {p.price.toLocaleString('ko-KR')}원
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
