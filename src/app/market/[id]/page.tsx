import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import AddToCartButton from '@/components/ui/AddToCartButton';
import WishlistButton from '@/components/ui/WishlistButton';
import ReportButton from '@/components/ui/ReportButton';
import AdminContentActions from '@/components/ui/AdminContentActions';
import ProductImageGallery from '@/components/ui/ProductImageGallery';
import { Product } from '@/types/market';

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃',
};

const CATEGORY_LABEL: Record<string, string> = {
  food: '신선식품', kitchen: '주방용품', snack: '간식', drink: '음료',
};

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR');
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseServer();

  const { data: product } = await db
    .from('products')
    .select('*, sellers(store_name, store_desc)')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!product) notFound();

  const p = product as Product;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* 뒤로가기 */}
        <Link href="/market" className="inline-flex items-center gap-2 text-stone-400 dark:text-white/40 text-sm hover:text-stone-900 dark:hover:text-white transition mb-8">
          ← 마켓으로 돌아가기
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* 이미지 갤러리 */}
          <ProductImageGallery
            images={p.images ?? []}
            title={p.title}
            categoryEmoji={CATEGORY_EMOJI[p.category] ?? '📦'}
          />

          {/* 정보 */}
          <div className="flex flex-col gap-5">
            {/* 카테고리 + 판매자 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-amber-400 border border-amber-500/30 rounded-full px-3 py-1">
                {CATEGORY_LABEL[p.category] ?? p.category}
              </span>
              {p.sellers?.store_name && (
                <span className="text-xs text-stone-400 dark:text-white/40">{p.sellers.store_name}</span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white leading-snug">{p.title}</h1>

            {p.description && (
              <p className="text-stone-500 dark:text-white/50 text-sm leading-relaxed">{p.description}</p>
            )}

            {p.colors && p.colors.length > 0 && (
              <div>
                <p className="text-stone-400 dark:text-white/30 text-xs mb-2">색상</p>
                <div className="flex gap-2 flex-wrap">
                  {p.colors.map((color) => {
                    const HEX: Record<string, string> = {
                      red: '#ef4444', orange: '#f97316', yellow: '#eab308',
                      green: '#22c55e', blue: '#3b82f6', sky: '#0ea5e9',
                      purple: '#a855f7', pink: '#ec4899', white: '#f3f4f6',
                      gray: '#6b7280', black: '#1c1c1e', brown: '#92400e',
                    };
                    const NAME: Record<string, string> = {
                      red: '빨강', orange: '주황', yellow: '노랑', green: '초록',
                      blue: '파랑', sky: '하늘', purple: '보라', pink: '핑크',
                      white: '흰색', gray: '회색', black: '검정', brown: '갈색',
                    };
                    return (
                      <div key={color} className="flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 inline-block"
                          style={{ backgroundColor: HEX[color] ?? color }}
                        />
                        <span className="text-xs text-stone-500 dark:text-white/50">{NAME[color] ?? color}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 가격 */}
            <div className="py-5 border-t border-b border-black/8 dark:border-white/8">
              <p className="text-stone-400 dark:text-white/30 text-xs mb-1">판매가</p>
              <p className="text-3xl font-bold text-amber-400">{formatPrice(p.price)}<span className="text-lg text-stone-400 dark:text-white/40 font-normal ml-1">원</span></p>
            </div>

            {/* 재고 */}
            <div className="flex items-center gap-2">
              <span className="text-stone-400 dark:text-white/30 text-sm">재고</span>
              <span className={`text-sm font-semibold ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p.stock > 0 ? `${p.stock}개 남음` : '품절'}
              </span>
            </div>

            {/* 장바구니 + 위시리스트 버튼 */}
            <div className="flex flex-col gap-2">
              <AddToCartButton productId={p.id} stock={p.stock} />
              <WishlistButton productId={p.id} />
            </div>

            {/* 신고 / 관리자 액션 */}
            <div className="flex items-center gap-3 pt-1">
              <ReportButton targetType="product" targetId={p.id} />
              <AdminContentActions
                contentType="product"
                contentId={p.id}
                redirectTo="/market"
                showToggleActive
                isActive={p.is_active}
              />
            </div>

            {/* 판매자 정보 */}
            {p.sellers?.store_name && (
              <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 p-4">
                <p className="text-stone-400 dark:text-white/30 text-xs mb-1">판매자 정보</p>
                <p className="text-stone-900 dark:text-white font-semibold text-sm">{p.sellers.store_name}</p>
                {p.sellers.store_desc && (
                  <p className="text-stone-400 dark:text-white/40 text-xs mt-1">{p.sellers.store_desc}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
