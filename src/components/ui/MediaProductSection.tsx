'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export interface TaggedProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
}

interface Props {
  products: TaggedProduct[];
  mediaPostId: string;
}

export default function MediaProductSection({ products, mediaPostId }: Props) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  if (products.length === 0) return null;

  const addToCart = async (productId: string) => {
    if (!user) { router.push('/auth/login'); return; }

    await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: productId, quantity: 1 },
      { onConflict: 'user_id,product_id', ignoreDuplicates: false }
    );

    localStorage.setItem('referral_media_id', mediaPostId);
    router.push('/cart');
  };

  return (
    <section className="mt-8 pt-8 border-t border-black/5 dark:border-white/5">
      <h2 className="text-base font-bold text-stone-800 dark:text-white mb-4">
        🛒 이 레시피 재료 구매하기
      </h2>
      <div className="flex flex-col gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8"
          >
            {p.images?.[0] ? (
              <img src={p.images[0]} alt={p.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 shrink-0 flex items-center justify-center text-xl">📦</div>
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/market/${p.id}`} className="text-sm font-medium text-stone-800 dark:text-white hover:text-amber-500 transition line-clamp-1">
                {p.title}
              </Link>
              <p className="text-sm text-amber-500 font-semibold mt-0.5">{p.price.toLocaleString('ko-KR')}원</p>
            </div>
            <button
              onClick={() => addToCart(p.id)}
              className="shrink-0 px-4 py-2 rounded-full bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition"
            >
              담기
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
