import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { confirmTossPayment, cancelTossPayment } from '@/lib/toss';

function ResultView({ ok, message }: { ok: boolean; message: string }) {
  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-6">
        <span className="text-6xl block mb-6">{ok ? '🎉' : '😥'}</span>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">
          {ok ? '주문이 완료됐습니다!' : '결제를 완료하지 못했어요'}
        </h2>
        <p className="text-stone-400 dark:text-white/40 text-sm mb-8">{message}</p>
        <div className="flex flex-col gap-3">
          <Link
            href={ok ? '/orders' : '/cart'}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition text-center"
          >
            {ok ? '주문 내역 확인' : '장바구니로 돌아가기'}
          </Link>
          <Link
            href="/market"
            className="px-6 py-3 rounded-xl border border-black/15 dark:border-white/15 text-stone-700 dark:text-white/70 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            계속 쇼핑하기
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) {
    return <ResultView ok={false} message="잘못된 결제 요청입니다." />;
  }

  const db = supabaseAdmin();

  const { data: order } = await db
    .from('orders')
    .select('id, user_id, total_amount, coupon_code, status')
    .eq('id', orderId)
    .single();

  if (!order || order.status !== 'pending') {
    return <ResultView ok={false} message="이미 처리되었거나 존재하지 않는 주문입니다." />;
  }

  if (Number(amount) !== order.total_amount) {
    return <ResultView ok={false} message="결제 금액이 일치하지 않습니다." />;
  }

  const confirm = await confirmTossPayment(paymentKey, orderId, order.total_amount);
  if (!confirm.ok) {
    await db.from('orders').update({ status: 'failed', fail_reason: confirm.message }).eq('id', orderId);
    return <ResultView ok={false} message={confirm.message ?? '결제 승인에 실패했습니다.'} />;
  }

  // 재고 차감 (원자적). 하나라도 품절이면 지금까지 차감분 롤백 + 결제 자동 취소
  const { data: orderItems } = await db
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);

  const decremented: { product_id: string; quantity: number }[] = [];
  let stockOk = true;
  for (const item of orderItems ?? []) {
    const { data: didDecrement } = await db.rpc('decrement_stock', {
      p_product_id: item.product_id,
      p_qty: item.quantity,
    });
    if (!didDecrement) { stockOk = false; break; }
    decremented.push(item);
  }

  if (!stockOk) {
    for (const item of decremented) {
      await db.rpc('restore_stock', { p_product_id: item.product_id, p_qty: item.quantity });
    }
    await cancelTossPayment(paymentKey, '재고 부족으로 자동 환불');
    await db.from('orders')
      .update({ status: 'failed', fail_reason: '재고 부족으로 자동 환불되었습니다.' })
      .eq('id', orderId);
    return <ResultView ok={false} message="일부 상품이 품절되어 결제가 자동 환불되었습니다." />;
  }

  // 쿠폰 사용 확정
  if (order.coupon_code) {
    const { data: couponRow } = await db
      .from('coupons').select('id').eq('code', order.coupon_code).maybeSingle();
    if (couponRow) {
      await db.from('coupon_uses').insert({ coupon_id: couponRow.id, user_id: order.user_id });
      await db.rpc('increment_coupon_used', { p_coupon_id: couponRow.id });
    }
  }

  await db.from('orders').update({
    status: 'paid',
    payment_key: paymentKey,
    paid_at: new Date().toISOString(),
  }).eq('id', orderId);

  await db.from('cart_items').delete().eq('user_id', order.user_id);

  await db.from('notifications').insert({
    user_id: order.user_id,
    type: 'order',
    title: `주문이 완료됐습니다 (${order.total_amount.toLocaleString('ko-KR')}원)`,
    body: `${(orderItems ?? []).length}개 상품`,
    link: '/orders',
  });

  return <ResultView ok={true} message="결제가 정상 처리됐습니다. 이용해주셔서 감사합니다." />;
}
