'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface AddToCartButtonProps {
  productId: string;
  stock: number;
}

export default function AddToCartButton({ productId, stock }: AddToCartButtonProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleAddToCart = async () => {
    if (!user) { router.push('/auth/login'); return; }
    setLoading(true);

    const { error } = await supabase
      .from('cart_items')
      .upsert(
        { user_id: user.id, product_id: productId, quantity: qty },
        { onConflict: 'user_id,product_id' }
      );

    setLoading(false);
    if (!error) setDone(true);
  };

  if (stock === 0) {
    return (
      <button disabled className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 font-semibold cursor-not-allowed">
        품절
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="w-10 h-10 rounded-full border border-white/15 text-white hover:bg-white/10 transition flex items-center justify-center text-lg"
        >
          −
        </button>
        <span className="text-white font-semibold text-lg w-8 text-center">{qty}</span>
        <button
          onClick={() => setQty((q) => Math.min(stock, q + 1))}
          className="w-10 h-10 rounded-full border border-white/15 text-white hover:bg-white/10 transition flex items-center justify-center text-lg"
        >
          +
        </button>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={loading || done}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
          done
            ? 'bg-emerald-500 text-white'
            : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
        } disabled:opacity-70`}
      >
        {done ? '✓ 장바구니에 담겼습니다' : loading ? '처리 중...' : '장바구니 담기'}
      </button>
    </div>
  );
}
