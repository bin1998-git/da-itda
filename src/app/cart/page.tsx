'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface CartItem {
  id: string;
  quantity: number;
  products: { id: string; title: string; price: number; images: string[]; category: string } | null;
}

interface Coupon {
  id: string;
  code: string;
  title: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
}

interface SavedCoupon {
  code: string;
  title: string;
  discountDesc: string;
}

export default function CartPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [items, setItems]       = useState<CartItem[]>([]);
  const [fetching, setFetching] = useState(true);

  const [couponInput, setCouponInput]   = useState('');
  const [coupon, setCoupon]             = useState<Coupon | null>(null);
  const [couponError, setCouponError]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [mySaved, setMySaved] = useState<SavedCoupon[]>([]);

  const [purchased, setPurchased]   = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // 배송 정보
  const [shipping, setShipping] = useState({
    name: '', phone: '', address: '', detail: '',
  });
  const [shippingError, setShippingError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // localStorage 저장 쿠폰 + sessionStorage 적용 쿠폰 복원
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('saved_coupons') ?? '[]') as SavedCoupon[];
    setMySaved(stored);

    const applied = sessionStorage.getItem('cart_coupon');
    if (applied) {
      try {
        const parsed = JSON.parse(applied) as Coupon;
        setCoupon(parsed);
        setCouponInput(parsed.code);
      } catch { sessionStorage.removeItem('cart_coupon'); }
    }
  }, []);

  // 적용 쿠폰 → sessionStorage 동기화 (페이지 이탈 후 복원용)
  useEffect(() => {
    if (coupon) sessionStorage.setItem('cart_coupon', JSON.stringify(coupon));
    else sessionStorage.removeItem('cart_coupon');
  }, [coupon]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setFetching(false); return; }

    supabase
      .from('cart_items')
      .select('id, quantity, products(id, title, price, images, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as unknown as CartItem[]);
        setFetching(false);
      });
  }, [user, isLoading]);

  const removeItem = async (id: string) => {
    await supabase.from('cart_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setCoupon(null);
    setCouponError('');
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    await supabase.from('cart_items').update({ quantity: qty }).eq('id', id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
    setCoupon(null);
    setCouponError('');
  };

  const subtotal  = items.reduce((s, i) => s + (i.products?.price ?? 0) * i.quantity, 0);

  const calcDiscount = (c: Coupon): number => {
    if (c.discount_type === 'fixed') return Math.min(c.discount_value, subtotal);
    const raw = Math.floor(subtotal * c.discount_value / 100);
    return c.max_discount_amount ? Math.min(raw, c.max_discount_amount) : raw;
  };

  const discount = coupon ? calcDiscount(coupon) : 0;
  const total    = Math.max(0, subtotal - discount);

  const applyCoupon = async (code = couponInput) => {
    if (!user || !code.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCoupon(null);

    const normalized = code.trim().toUpperCase();

    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) {
      setCouponError('존재하지 않는 쿠폰 코드입니다.');
      setCouponLoading(false);
      return;
    }

    const c = data as Coupon;

    if (c.expires_at && new Date(c.expires_at) < new Date()) {
      setCouponError('만료된 쿠폰입니다.');
      setCouponLoading(false);
      return;
    }
    if (c.max_uses !== null && c.used_count >= c.max_uses) {
      setCouponError('쿠폰 사용 한도가 초과됐습니다.');
      setCouponLoading(false);
      return;
    }
    if (subtotal < c.min_order_amount) {
      setCouponError(`최소 주문금액 ${c.min_order_amount.toLocaleString('ko-KR')}원 이상에서 사용 가능합니다.`);
      setCouponLoading(false);
      return;
    }

    const { data: used } = await supabase
      .from('coupon_uses')
      .select('id')
      .eq('coupon_id', c.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (used) {
      setCouponError('이미 사용한 쿠폰입니다.');
      setCouponLoading(false);
      return;
    }

    setCoupon(c);
    setCouponInput(normalized);
    setCouponLoading(false);
  };

  const handlePurchase = async () => {
    if (!user) return;

    // 배송 정보 검증
    if (!shipping.name.trim() || !shipping.phone.trim() || !shipping.address.trim()) {
      setShippingError('이름, 전화번호, 주소를 모두 입력해주세요.');
      document.getElementById('shipping-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setShippingError('');
    setPurchasing(true);

    if (coupon) {
      await supabase.rpc('apply_coupon', { p_coupon_id: coupon.id });
      const updated = mySaved.filter((s) => s.code !== coupon.code);
      setMySaved(updated);
      localStorage.setItem('saved_coupons', JSON.stringify(updated));
    }

    // 주문 생성
    const { data: order } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'paid',
        total_amount: total,
        discount_amount: discount,
        coupon_code: coupon?.code ?? null,
        shipping_name: shipping.name.trim(),
        shipping_phone: shipping.phone.trim(),
        shipping_address: shipping.address.trim(),
        shipping_detail: shipping.detail.trim() || null,
      })
      .select('id')
      .single();

    if (order) {
      const orderItems = items
        .filter((i) => i.products)
        .map((i) => ({
          order_id: order.id,
          product_id: i.products!.id,
          title: i.products!.title,
          price: i.products!.price,
          quantity: i.quantity,
          image_url: i.products!.images?.[0] ?? null,
        }));
      if (orderItems.length > 0) {
        await supabase.from('order_items').insert(orderItems);
      }
      // 주문 완료 알림
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'order',
        title: `주문이 완료됐습니다 (${total.toLocaleString('ko-KR')}원)`,
        body: `${items.length}개 상품`,
        link: '/orders',
      });
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id);
    setItems([]);
    setCoupon(null);
    setCouponInput('');
    setPurchasing(false);
    setPurchased(true);
  };

  /* ── 로딩 ── */
  if (isLoading || fetching) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </main>
    );
  }

  /* ── 비로그인 ── */
  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4">🛒</span>
          <p className="text-white/50 mb-4 text-sm">로그인 후 장바구니를 이용할 수 있습니다</p>
          <Link href="/auth/login"
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
          >
            로그인하기
          </Link>
        </div>
      </main>
    );
  }

  /* ── 구매 완료 ── */
  if (purchased) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <span className="text-6xl block mb-6">🎉</span>
          <h2 className="text-2xl font-bold text-white mb-2">주문이 완료됐습니다!</h2>
          <p className="text-white/40 text-sm mb-8">결제가 정상 처리됐습니다. 이용해주셔서 감사합니다.</p>
          <div className="flex flex-col gap-3">
            <Link href="/orders"
              className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition text-center"
            >
              주문 내역 확인
            </Link>
            <div className="flex gap-3 justify-center">
              <Link href="/market"
                className="px-6 py-3 rounded-xl border border-white/15 text-white/70 text-sm hover:bg-white/5 transition"
              >
                계속 쇼핑하기
              </Link>
              <Link href="/dashboard"
                className="px-6 py-3 rounded-xl border border-white/15 text-white/70 text-sm hover:bg-white/5 transition"
              >
                마이페이지
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── 메인 ── */
  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">장바구니</h1>
          {items.length > 0 && <span className="text-white/40 text-sm">{items.length}개 상품</span>}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">🛒</span>
            <p className="text-white font-semibold">장바구니가 비어있습니다</p>
            <Link href="/market"
              className="mt-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
            >
              마켓 구경하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* 상품 목록 */}
            {items.map((item) => {
              if (!item.products) return null;
              const p = item.products;
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                      : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.title}</p>
                    <p className="text-amber-400 text-sm font-bold mt-0.5">
                      {(p.price * item.quantity).toLocaleString('ko-KR')}원
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {p.price.toLocaleString('ko-KR')}원 × {item.quantity}개
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-white/8 text-white/60 hover:bg-white/15 transition font-bold text-sm"
                    >−</button>
                    <span className="text-white text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-white/8 text-white/60 hover:bg-white/15 transition font-bold text-sm"
                    >+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)}
                    className="text-white/20 hover:text-rose-400 transition text-xs shrink-0 px-2 py-1 rounded hover:bg-rose-500/8"
                  >삭제</button>
                </div>
              );
            })}

            {/* 배송 정보 섹션 */}
            <div id="shipping-section" className="rounded-2xl border border-white/8 bg-white/3 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-sm font-medium">배송 정보</p>
                <button
                  type="button"
                  disabled={loadingProfile}
                  onClick={async () => {
                    if (!user) return;
                    setLoadingProfile(true);
                    const { data } = await supabase
                      .from('profiles')
                      .select('full_name, phone, address, address_detail')
                      .eq('id', user.id)
                      .single();
                    if (data) {
                      setShipping({
                        name:    data.full_name     || '',
                        phone:   data.phone         || '',
                        address: data.address       || '',
                        detail:  data.address_detail || '',
                      });
                      setShippingError('');
                    }
                    setLoadingProfile(false);
                  }}
                  className="text-xs text-amber-400/60 hover:text-amber-400 transition disabled:opacity-40"
                >
                  {loadingProfile ? '불러오는 중...' : '저장된 주소 불러오기'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/35 text-xs mb-1.5 block">받는 분 이름 *</label>
                  <input
                    type="text"
                    value={shipping.name}
                    onChange={(e) => { setShipping((s) => ({ ...s, name: e.target.value })); setShippingError(''); }}
                    placeholder="홍길동"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div>
                  <label className="text-white/35 text-xs mb-1.5 block">전화번호 *</label>
                  <input
                    type="tel"
                    value={shipping.phone}
                    onChange={(e) => { setShipping((s) => ({ ...s, phone: e.target.value })); setShippingError(''); }}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-white/35 text-xs mb-1.5 block">주소 *</label>
                  <input
                    type="text"
                    value={shipping.address}
                    onChange={(e) => { setShipping((s) => ({ ...s, address: e.target.value })); setShippingError(''); }}
                    placeholder="서울특별시 강남구 테헤란로 123"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-white/35 text-xs mb-1.5 block">상세 주소</label>
                  <input
                    type="text"
                    value={shipping.detail}
                    onChange={(e) => setShipping((s) => ({ ...s, detail: e.target.value }))}
                    placeholder="101동 202호"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>
              {shippingError && (
                <p className="text-rose-400 text-xs">{shippingError}</p>
              )}
            </div>

            {/* 쿠폰 섹션 */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5 flex flex-col gap-3">
              <p className="text-white/50 text-sm font-medium">쿠폰 적용</p>

              {/* 보유 쿠폰 카드 목록 (이벤트에서 받은 쿠폰) */}
              {mySaved.length > 0 && !coupon && (
                <div className="flex flex-col gap-2">
                  <p className="text-white/25 text-[11px] font-semibold tracking-widest uppercase">보유 쿠폰 {mySaved.length}개</p>
                  {mySaved.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => applyCoupon(s.code)}
                      disabled={couponLoading}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/4 border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/6 transition group text-left"
                    >
                      <div>
                        <p className="font-mono font-bold text-sm text-white/80 group-hover:text-amber-400 transition tracking-wider">{s.code}</p>
                        <p className="text-white/35 text-xs mt-0.5">{s.title} · {s.discountDesc}</p>
                      </div>
                      <span className="text-xs text-white/25 group-hover:text-amber-400/60 transition shrink-0 ml-3">
                        {couponLoading ? '확인 중...' : '사용하기 →'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 적용된 쿠폰 표시 */}
              {coupon && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-400">✓</span>
                  <div className="flex-1">
                    <p className="text-emerald-400 text-sm font-medium">{coupon.title}</p>
                    <p className="text-emerald-400/60 text-xs">{coupon.code} · -{calcDiscount(coupon).toLocaleString('ko-KR')}원 할인</p>
                  </div>
                  <button
                    onClick={() => { setCoupon(null); setCouponInput(''); setCouponError(''); }}
                    className="text-white/25 hover:text-rose-400 transition text-xs"
                  >취소</button>
                </div>
              )}

              {/* 직접 입력 */}
              {!coupon && (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder="쿠폰 코드 직접 입력"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-amber-500/40 transition text-sm"
                    />
                    <button
                      onClick={() => applyCoupon()}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition disabled:opacity-40"
                    >
                      {couponLoading ? '확인 중...' : '적용'}
                    </button>
                  </div>
                  {mySaved.length === 0 && (
                    <Link href="/events" className="text-xs text-pink-400/60 hover:text-pink-400 transition">
                      🎟️ 이벤트 페이지에서 쿠폰 받기 →
                    </Link>
                  )}
                </>
              )}

              {couponError && <p className="text-rose-400 text-xs">{couponError}</p>}
            </div>

            {/* 결제 요약 */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/50 text-sm">상품 합계</span>
                <span className="text-white">{subtotal.toLocaleString('ko-KR')}원</span>
              </div>
              {coupon && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-emerald-400 text-sm">쿠폰 할인</span>
                  <span className="text-emerald-400 font-medium">-{discount.toLocaleString('ko-KR')}원</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/50 text-sm">배송비</span>
                <span className="text-emerald-400 text-sm font-medium">무료</span>
              </div>
              <div className="border-t border-white/8 pt-4 flex items-center justify-between">
                <span className="text-white font-semibold">총 결제금액</span>
                <div className="text-right">
                  {coupon && (
                    <p className="text-white/30 text-xs line-through mb-0.5">{subtotal.toLocaleString('ko-KR')}원</p>
                  )}
                  <span className="text-amber-400 font-bold text-xl">{total.toLocaleString('ko-KR')}원</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition text-base disabled:opacity-50"
            >
              {purchasing ? '처리 중...' : `${total.toLocaleString('ko-KR')}원 구매하기`}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
