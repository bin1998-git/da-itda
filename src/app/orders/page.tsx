'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
  product_id: string | null;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  created_at: string;
  items: OrderItem[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  paid:      { label: '결제완료',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  shipping:  { label: '배송중',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  delivered: { label: '배송완료',  cls: 'bg-white/8 text-white/40 border-white/10' },
  cancelled: { label: '취소됨',   cls: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }

    supabase
      .from('orders')
      .select('id, status, total_amount, discount_amount, coupon_code, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data: orderRows }) => {
        if (!orderRows || orderRows.length === 0) { setLoading(false); return; }

        const orderIds = orderRows.map((o) => o.id);
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('id, order_id, title, price, quantity, image_url, product_id')
          .in('order_id', orderIds);

        const itemMap: Record<string, OrderItem[]> = {};
        for (const item of itemRows ?? []) {
          if (!itemMap[item.order_id]) itemMap[item.order_id] = [];
          itemMap[item.order_id].push(item as OrderItem);
        }

        setOrders(orderRows.map((o) => ({ ...o, items: itemMap[o.id] ?? [] })) as Order[]);
        setLoading(false);
      });
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-[60px]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="text-white/30 hover:text-white transition text-sm">← 마이페이지</Link>
          <span className="text-white/15">/</span>
          <h1 className="text-xl font-bold text-white">주문 내역</h1>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-white/2 p-16 text-center">
            <span className="text-5xl block mb-4">📦</span>
            <p className="text-white/40 text-sm mb-4">아직 주문 내역이 없습니다.</p>
            <Link href="/market"
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
            >
              마켓 구경하기 →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => {
              const st = STATUS[order.status] ?? STATUS.paid;
              return (
                <div key={order.id} className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
                  {/* 주문 헤더 */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
                    <div>
                      <p className="text-white/30 text-xs">{fmt(order.created_at)}</p>
                      <p className="text-white/15 text-[10px] mt-0.5 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
                  </div>

                  {/* 상품 목록 */}
                  <div className="px-5 py-4 flex flex-col gap-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                          {item.image_url
                            ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                            : '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-sm truncate">{item.title}</p>
                          <p className="text-white/30 text-xs mt-0.5">{item.price.toLocaleString('ko-KR')}원 × {item.quantity}개</p>
                        </div>
                        <p className="text-white/60 text-sm font-medium shrink-0">
                          {(item.price * item.quantity).toLocaleString('ko-KR')}원
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 결제 요약 */}
                  <div className="border-t border-white/6 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.coupon_code && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5 border border-emerald-500/20">
                          쿠폰 {order.coupon_code}
                        </span>
                      )}
                      {order.discount_amount > 0 && (
                        <span className="text-xs text-white/30">
                          -{order.discount_amount.toLocaleString('ko-KR')}원 할인
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {order.discount_amount > 0 && (
                        <p className="text-white/25 text-xs line-through">
                          {(order.total_amount + order.discount_amount).toLocaleString('ko-KR')}원
                        </p>
                      )}
                      <p className="text-amber-400 font-bold">{order.total_amount.toLocaleString('ko-KR')}원</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
