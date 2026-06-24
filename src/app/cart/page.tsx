import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function CartPage() {
  const cookieStore = await cookies();
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4 text-sm">로그인 후 장바구니를 이용할 수 있습니다</p>
          <Link href="/auth/login" className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">
            로그인하기
          </Link>
        </div>
      </main>
    );
  }

  const { data: items } = await db
    .from('cart_items')
    .select('id, quantity, products(id, title, price, images, category)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const cartItems = (items ?? []) as unknown as Array<{
    id: string;
    quantity: number;
    products: { id: string; title: string; price: number; images: string[]; category: string } | null;
  }>;

  const total = cartItems.reduce((sum, item) => sum + (item.products?.price ?? 0) * item.quantity, 0);

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">장바구니</h1>
          {cartItems.length > 0 && (
            <span className="text-white/40 text-sm">{cartItems.length}개 상품</span>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">🛒</span>
            <p className="text-white font-semibold">장바구니가 비어있습니다</p>
            <Link
              href="/market"
              className="mt-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
            >
              마켓 구경하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 상품 목록 */}
            {cartItems.map((item) => {
              if (!item.products) return null;
              const p = item.products;
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center text-2xl shrink-0">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover rounded-xl" /> : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.title}</p>
                    <p className="text-amber-400 text-sm font-bold mt-0.5">{(p.price * item.quantity).toLocaleString('ko-KR')}원</p>
                    <p className="text-white/30 text-xs mt-0.5">{p.price.toLocaleString('ko-KR')}원 × {item.quantity}개</p>
                  </div>
                  <Link href={`/market/${p.id}`} className="text-white/30 text-xs hover:text-white transition shrink-0">
                    상세 →
                  </Link>
                </div>
              );
            })}

            {/* 합계 */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5 mt-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/50 text-sm">상품 합계</span>
                <span className="text-white font-semibold">{total.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="flex items-center justify-between mb-5">
                <span className="text-white/50 text-sm">배송비</span>
                <span className="text-white/50 text-sm">무료</span>
              </div>
              <div className="border-t border-white/8 pt-4 flex items-center justify-between">
                <span className="text-white font-semibold">총 결제금액</span>
                <span className="text-amber-400 font-bold text-lg">{total.toLocaleString('ko-KR')}원</span>
              </div>
            </div>

            <button className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition">
              구매하기
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
