import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cancelTossPayment } from '@/lib/toss';

export async function POST(req: NextRequest) {
  const { orderId, amount, reason } = await req.json();

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: order } = await db
    .from('orders')
    .select('id, payment_key, total_amount, refunded_amount, status, user_id')
    .eq('id', orderId)
    .single();

  if (!order || !order.payment_key) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: sellerCheck } = await db
    .from('order_items')
    .select('id, products!inner(seller_id)')
    .eq('order_id', orderId)
    .eq('products.seller_id', user.id)
    .limit(1);

  if (!sellerCheck || sellerCheck.length === 0) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const remaining = order.total_amount - order.refunded_amount;
  if (!amount || amount <= 0 || amount > remaining) {
    return NextResponse.json({ error: '환불 금액이 올바르지 않습니다.' }, { status: 400 });
  }

  const cancel = await cancelTossPayment(order.payment_key, reason || '판매자 환불', amount);
  if (!cancel.ok) {
    return NextResponse.json({ error: cancel.message ?? '환불에 실패했습니다.' }, { status: 500 });
  }

  const newRefunded = order.refunded_amount + amount;
  const fullyRefunded = newRefunded >= order.total_amount;

  await db.from('orders').update({
    refunded_amount: newRefunded,
    status: fullyRefunded ? 'cancelled' : order.status,
  }).eq('id', orderId);

  if (fullyRefunded) {
    const { data: orderItems } = await db
      .from('order_items').select('product_id, quantity').eq('order_id', orderId);
    for (const item of orderItems ?? []) {
      await db.rpc('restore_stock', { p_product_id: item.product_id, p_qty: item.quantity });
    }
  }

  await db.from('notifications').insert({
    user_id: order.user_id,
    type: 'order',
    title: `${amount.toLocaleString('ko-KR')}원이 환불되었습니다`,
    body: fullyRefunded ? '주문이 전액 환불되어 취소되었습니다.' : '부분 환불이 처리되었습니다.',
    link: '/orders',
  });

  return NextResponse.json({ ok: true, fullyRefunded });
}
