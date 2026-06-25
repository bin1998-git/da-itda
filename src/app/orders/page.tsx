'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AddressInput from '@/components/ui/AddressInput';

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
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_detail: string | null;
  tracking_number: string | null;
  created_at: string;
  items: OrderItem[];
}

interface ShippingForm {
  name: string;
  phone: string;
  address: string;
  detail: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  paid:      { label: '결제완료',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  preparing: { label: '배송준비',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  shipping:  { label: '배송중',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  delivered: { label: '배송완료',  cls: 'bg-white/8 text-white/50 border-white/10' },
  cancelled: { label: '취소됨',   cls: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
};

const STEPS = [
  { key: 'paid',      label: '결제완료' },
  { key: 'preparing', label: '배송준비' },
  { key: 'shipping',  label: '배송중' },
  { key: 'delivered', label: '배송완료' },
];
const STEP_INDEX: Record<string, number> = {
  paid: 0, preparing: 1, shipping: 2, delivered: 3,
};

function StatusStepper({ status, trackingNumber }: { status: string; trackingNumber: string | null }) {
  if (status === 'cancelled') return null;
  const current = STEP_INDEX[status] ?? 0;
  return (
    <div className="px-5 py-4 border-b border-white/6">
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i <= current;
          const active = i === current;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done
                    ? active
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-white/4 border-white/10 text-white/20'
                }`}>
                  {i < current ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] whitespace-nowrap ${
                  active ? 'text-amber-400 font-semibold' : done ? 'text-emerald-400/70' : 'text-white/20'
                }`}>{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${i < current ? 'bg-emerald-500/40' : 'bg-white/8'}`} />
              )}
            </div>
          );
        })}
      </div>
      {trackingNumber && status === 'shipping' && (
        <p className="text-xs text-white/30 mt-3">
          운송장 번호: <span className="font-mono text-white/50">{trackingNumber}</span>
        </p>
      )}
    </div>
  );
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 배송지 변경 모달
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [shippingForm, setShippingForm] = useState<ShippingForm>({ name: '', phone: '', address: '', detail: '' });
  const [shippingError, setShippingError] = useState('');
  const [savingShipping, setSavingShipping] = useState(false);

  // 취소 확인 중인 주문
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = async (uid: string) => {
    const { data: orderRows } = await supabase
      .from('orders')
      .select('id, status, total_amount, discount_amount, coupon_code, shipping_name, shipping_phone, shipping_address, shipping_detail, tracking_number, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!orderRows || orderRows.length === 0) { setLoading(false); return; }

    const { data: itemRows } = await supabase
      .from('order_items')
      .select('id, order_id, title, price, quantity, image_url, product_id')
      .in('order_id', orderRows.map((o) => o.id));

    const itemMap: Record<string, OrderItem[]> = {};
    for (const item of itemRows ?? []) {
      if (!itemMap[item.order_id]) itemMap[item.order_id] = [];
      itemMap[item.order_id].push(item as OrderItem);
    }

    setOrders(orderRows.map((o) => ({ ...o, items: itemMap[o.id] ?? [] })) as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    load(user.id);
  }, [user, isLoading, router]);

  const cancelOrder = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    setCancellingId(null);
  };

  const openShippingEdit = (order: Order) => {
    setShippingForm({
      name: order.shipping_name ?? '',
      phone: order.shipping_phone ?? '',
      address: order.shipping_address ?? '',
      detail: order.shipping_detail ?? '',
    });
    setShippingError('');
    setEditingOrderId(order.id);
  };

  const saveShipping = async () => {
    if (!shippingForm.name.trim() || !shippingForm.phone.trim() || !shippingForm.address.trim()) {
      setShippingError('이름, 전화번호, 주소를 모두 입력해주세요.');
      return;
    }
    setSavingShipping(true);
    await supabase.from('orders').update({
      shipping_name: shippingForm.name.trim(),
      shipping_phone: shippingForm.phone.trim(),
      shipping_address: shippingForm.address.trim(),
      shipping_detail: shippingForm.detail.trim() || null,
    }).eq('id', editingOrderId!);
    setOrders((prev) => prev.map((o) => o.id === editingOrderId ? {
      ...o,
      shipping_name: shippingForm.name.trim(),
      shipping_phone: shippingForm.phone.trim(),
      shipping_address: shippingForm.address.trim(),
      shipping_detail: shippingForm.detail.trim() || null,
    } : o));
    setSavingShipping(false);
    setEditingOrderId(null);
  };

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
          <div className="flex flex-col gap-5">
            {orders.map((order) => {
              const st = STATUS[order.status] ?? STATUS.paid;
              const canModify = order.status === 'paid';
              const isCancelling = cancellingId === order.id;
              const isEditingShipping = editingOrderId === order.id;

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

                  {/* 배송 상태 스텝퍼 */}
                  <StatusStepper status={order.status} trackingNumber={order.tracking_number} />

                  {/* 상품 목록 */}
                  <div className="px-5 py-4 flex flex-col gap-3 border-b border-white/6">
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

                  {/* 배송지 */}
                  <div className="px-5 py-4 border-b border-white/6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">배송지</p>
                      {canModify && !isEditingShipping && (
                        <button
                          onClick={() => openShippingEdit(order)}
                          className="text-xs text-amber-400/60 hover:text-amber-400 transition"
                        >
                          변경하기
                        </button>
                      )}
                    </div>

                    {isEditingShipping ? (
                      <div className="flex flex-col gap-3 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-white/30 text-[11px] mb-1 block">받는 분</label>
                            <input
                              value={shippingForm.name}
                              onChange={(e) => { setShippingForm((f) => ({ ...f, name: e.target.value })); setShippingError(''); }}
                              placeholder="홍길동"
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50 transition placeholder-white/20"
                            />
                          </div>
                          <div>
                            <label className="text-white/30 text-[11px] mb-1 block">전화번호</label>
                            <input
                              value={shippingForm.phone}
                              onChange={(e) => { setShippingForm((f) => ({ ...f, phone: e.target.value })); setShippingError(''); }}
                              placeholder="010-0000-0000"
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50 transition placeholder-white/20"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-white/30 text-[11px] mb-1 block">주소</label>
                          <AddressInput
                            value={shippingForm.address}
                            onChange={(addr) => { setShippingForm((f) => ({ ...f, address: addr })); setShippingError(''); }}
                            placeholder="주소 검색"
                            inputClassName="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50 transition placeholder-white/20 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-white/30 text-[11px] mb-1 block">상세 주소</label>
                          <input
                            value={shippingForm.detail}
                            onChange={(e) => setShippingForm((f) => ({ ...f, detail: e.target.value }))}
                            placeholder="101동 202호"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50 transition placeholder-white/20"
                          />
                        </div>
                        {shippingError && <p className="text-rose-400 text-xs">{shippingError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={saveShipping}
                            disabled={savingShipping}
                            className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition disabled:opacity-50"
                          >
                            {savingShipping ? '저장 중...' : '저장하기'}
                          </button>
                          <button
                            onClick={() => { setEditingOrderId(null); setShippingError(''); }}
                            className="px-4 py-2 rounded-lg border border-white/10 text-white/40 text-xs hover:bg-white/5 transition"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : order.shipping_name ? (
                      <div className="text-sm space-y-0.5">
                        <p className="text-white/60">
                          <span className="text-white/80 font-medium">{order.shipping_name}</span>
                          <span className="text-white/30 mx-2">·</span>
                          {order.shipping_phone}
                        </p>
                        <p className="text-white/40 text-xs">{order.shipping_address}</p>
                        {order.shipping_detail && (
                          <p className="text-white/30 text-xs">{order.shipping_detail}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/25 text-xs">배송지 정보 없음</p>
                    )}
                  </div>

                  {/* 결제 요약 + 액션 버튼 */}
                  <div className="px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      {order.coupon_code && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5 border border-emerald-500/20 mr-2">
                          {order.coupon_code}
                        </span>
                      )}
                      {order.discount_amount > 0 && (
                        <span className="text-xs text-white/30">-{order.discount_amount.toLocaleString('ko-KR')}원 할인</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right shrink-0">
                        {order.discount_amount > 0 && (
                          <p className="text-white/25 text-xs line-through">
                            {(order.total_amount + order.discount_amount).toLocaleString('ko-KR')}원
                          </p>
                        )}
                        <p className={`font-bold ${order.status === 'cancelled' ? 'text-white/30 line-through' : 'text-amber-400'}`}>
                          {order.total_amount.toLocaleString('ko-KR')}원
                        </p>
                      </div>

                      {/* 취소 버튼 (결제완료 상태만) */}
                      {canModify && (
                        isCancelling ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-white/40 text-xs">취소할까요?</span>
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-semibold text-xs hover:bg-rose-400 transition"
                            >
                              확인
                            </button>
                            <button
                              onClick={() => setCancellingId(null)}
                              className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-xs hover:bg-white/5 transition"
                            >
                              돌아가기
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancellingId(order.id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-400/60 text-xs hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/6 transition shrink-0"
                          >
                            주문 취소
                          </button>
                        )
                      )}
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
