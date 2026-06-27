'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Props {
  productId: string;
  stock: number;
  colors?: string[];
  selectedColor?: string | null;
}

export default function AddToCartButton({ productId, stock, colors, selectedColor }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const hasColors = colors && colors.length > 0;
  const needsColor = hasColors && !selectedColor;

  const handleAddToCart = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (needsColor) return;
    setLoading(true);

    // 색상이 있으면 (product_id + selected_color) 기준으로 누적, 없으면 product_id만
    const matchQuery = supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId);

    const { data: existing } = selectedColor
      ? await matchQuery.eq('selected_color', selectedColor).maybeSingle()
      : await matchQuery.is('selected_color', null).maybeSingle();

    const newQty = Math.min((existing?.quantity ?? 0) + qty, stock);

    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      product_id: productId,
      quantity: newQty,
      selected_color: selectedColor ?? null,
    };

    const { error } = await supabase.from('cart_items').upsert(
      upsertData,
      { onConflict: selectedColor ? 'user_id,product_id,selected_color' : 'user_id,product_id' }
    );

    setLoading(false);
    if (!error) {
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    }
  };

  if (stock === 0) {
    return (
      <button disabled className="w-full py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/30 font-semibold cursor-not-allowed">
        품절
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 수량 선택 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="w-10 h-10 rounded-full border border-black/15 dark:border-white/15 text-stone-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition flex items-center justify-center text-lg"
        >
          −
        </button>
        <span className="text-stone-900 dark:text-white font-semibold text-lg w-8 text-center">{qty}</span>
        <button
          onClick={() => setQty((q) => Math.min(stock, q + 1))}
          className="w-10 h-10 rounded-full border border-black/15 dark:border-white/15 text-stone-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition flex items-center justify-center text-lg"
        >
          +
        </button>
      </div>

      {/* 담기 버튼 */}
      <button
        onClick={handleAddToCart}
        disabled={loading || needsColor}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
          done
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            : needsColor
            ? 'bg-black/8 dark:bg-white/8 text-stone-400 dark:text-white/40 cursor-not-allowed'
            : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
        } disabled:opacity-70`}
      >
        {loading ? '처리 중...' : done ? '✓ 담겼어요!' : needsColor ? '색상을 선택해주세요' : '장바구니 담기'}
      </button>

      {/* 성공 후 장바구니 바로가기 */}
      {done && (
        <Link
          href="/cart"
          className="w-full py-3 rounded-2xl border border-emerald-500/40 text-emerald-500 font-semibold text-sm text-center hover:bg-emerald-500/8 transition"
        >
          장바구니 보기 →
        </Link>
      )}
    </div>
  );
}
