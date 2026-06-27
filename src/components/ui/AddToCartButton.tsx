'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Props {
  productId: string;
  stock: number;
  colors?: string[];
  selectedColor?: string | null;
  onColorError?: () => void;
}

export default function AddToCartButton({ productId, stock, colors, selectedColor, onColorError }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [cartError, setCartError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const hasColors = colors && colors.length > 0;
  const needsColor = hasColors && !selectedColor;

  const handleAddToCart = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (needsColor) { onColorError?.(); return; }
    if (loading || done) return;

    setLoading(true);
    setCartError(false);

    try {
      const matchQuery = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      const { data: existing } = selectedColor
        ? await matchQuery.eq('selected_color', selectedColor).maybeSingle()
        : await matchQuery.is('selected_color', null).maybeSingle();

      const newQty = Math.min((existing?.quantity ?? 0) + qty, stock);

      const { error } = existing
        ? await supabase.from('cart_items').update({ quantity: newQty }).eq('id', existing.id)
        : await supabase.from('cart_items').insert({
            user_id: user.id,
            product_id: productId,
            quantity: newQty,
            selected_color: selectedColor ?? null,
          });

      if (error) throw error;

      setDone(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDone(false), 1800);
    } catch {
      setCartError(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCartError(false), 2000);
    } finally {
      setLoading(false);
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
        disabled={loading || done}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
          done
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            : cartError
            ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400'
            : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
        } disabled:opacity-80 disabled:cursor-not-allowed`}
      >
        {loading ? '처리 중...' : done ? '✓ 담겼어요!' : cartError ? '오류가 발생했어요' : '장바구니 담기'}
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
