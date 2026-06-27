'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Props {
  productId: string;
  stock: number;
}

export default function RestockAlertButton({ productId, stock }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isAlerted, setIsAlerted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || stock > 0) return;
    supabase
      .from('restock_alerts')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle()
      .then(({ data }) => setIsAlerted(!!data));
  }, [user, productId, stock]);

  if (stock > 0) return null;

  const handleClick = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (loading) return;
    setLoading(true);
    if (isAlerted) {
      const { error } = await supabase
        .from('restock_alerts')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      if (!error) setIsAlerted(false);
    } else {
      const { error } = await supabase
        .from('restock_alerts')
        .insert({ user_id: user.id, product_id: productId });
      if (!error) setIsAlerted(true);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-3 rounded-xl text-sm font-semibold transition border disabled:opacity-50 ${
        isAlerted
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/15'
          : 'border-black/10 dark:border-white/10 text-stone-500 dark:text-white/50 hover:border-amber-500/30 hover:text-amber-500 hover:bg-amber-500/5'
      }`}
    >
      {isAlerted ? '✓ 알림 신청됨 (취소하기)' : '🔔 재입고 알림 신청'}
    </button>
  );
}
