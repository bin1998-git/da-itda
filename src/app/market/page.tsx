import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import CategoryFilter from '@/components/ui/CategoryFilter';
import Pagination from '@/components/ui/Pagination';
import { Product } from '@/types/market';

const PAGE_SIZE = 12;

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃',
};

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR');
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/market/${product.id}`} className="group block">
      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden hover:border-amber-500/30 hover:bg-white/5 transition-all duration-200">
        {/* 이미지 영역 */}
        <div className="aspect-square bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center text-6xl">
          {product.images?.[0]
            ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
            : <span>{CATEGORY_EMOJI[product.category] ?? '📦'}</span>
          }
        </div>
        {/* 상품 정보 */}
        <div className="p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-400/70 tracking-wider uppercase">
              {product.sellers?.store_name ?? '판매자'}
            </span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-[10px] text-rose-400 font-medium">잔여 {product.stock}개</span>
            )}
          </div>
          <p className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-amber-100 transition">
            {product.title}
          </p>
          <p className="text-amber-400 font-bold text-base mt-0.5">
            {formatPrice(product.price)}원
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  let query = db
    .from('products')
    .select('*, sellers(store_name)', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data: products, count, error } = await query;
  const items = (products ?? []) as Product[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      {/* 헤더 */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />
        <div className="max-w-5xl mx-auto px-6 py-10 relative">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-1">식품 마켓</p>
              <h1 className="text-3xl font-bold text-white">신선식품 · 주방용품</h1>
              <p className="text-white/40 text-sm mt-1">
                {error ? '서비스 준비 중입니다' : `총 ${count ?? 0}개 상품`}
              </p>
            </div>
            <Link
              href="/market/sell"
              className="px-5 py-2.5 rounded-full bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition"
            >
              + 상품 등록
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* 카테고리 필터 */}
        <CategoryFilter current={category ?? 'all'} />

        {/* 상품 그리드 */}
        {error || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">🛒</span>
            <p className="text-white font-semibold text-lg">
              {error ? 'DB 테이블을 먼저 생성해주세요' : '등록된 상품이 없습니다'}
            </p>
            <p className="text-white/30 text-sm text-center max-w-sm">
              {error
                ? 'Supabase에서 products, sellers, cart_items 테이블을 생성하면 상품이 표시됩니다.'
                : '상품 등록 버튼을 눌러 첫 상품을 올려보세요.'}
            </p>
            {!error && (
              <Link
                href="/market/sell"
                className="mt-2 px-6 py-3 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
              >
                첫 상품 등록하기
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              getHref={(p) => `/market?${new URLSearchParams({ ...(category && category !== 'all' ? { category } : {}), page: String(p) }).toString()}`}
            />
          </>
        )}
      </div>
    </main>
  );
}
