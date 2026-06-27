import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import AddToCartButton from '@/components/ui/AddToCartButton';
import ColorSelectorCart from '@/components/ui/ColorSelectorCart';
import WishlistButton from '@/components/ui/WishlistButton';
import ReportButton from '@/components/ui/ReportButton';
import AdminContentActions from '@/components/ui/AdminContentActions';
import ProductImageGallery from '@/components/ui/ProductImageGallery';
import StarRating from '@/components/ui/StarRating';
import ReviewSection from '@/components/ui/ReviewSection';
import ProductDetailTabs from '@/components/ui/ProductDetailTabs';
import { Product, Review } from '@/types/market';

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃', etc: '📦',
};
const CATEGORY_LABEL: Record<string, string> = {
  food: '신선식품', kitchen: '주방용품', snack: '간식', drink: '음료', etc: '기타',
};

function formatPrice(p: number) {
  return p.toLocaleString('ko-KR');
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseServer();

  const [{ data: product }, { data: reviews }] = await Promise.all([
    db.from('products')
      .select('*, sellers(store_name, store_desc)')
      .eq('id', id).eq('is_active', true).single(),
    db.from('reviews')
      .select('*, profiles(nickname, avatar_url)')
      .eq('product_id', id).order('created_at', { ascending: false })
      .order('helpful_count', { ascending: false }),
  ]);

  if (!product) notFound();

  const p = product as Product;
  const reviewList = (reviews ?? []) as Review[];
  const avgRating = reviewList.length
    ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length
    : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviewList.filter((r) => r.rating === star).length,
  }));

  /* 상세정보 행 */
  const deliveryDaysLabel = p.delivery_days == null ? null
    : p.delivery_days <= 1  ? '당일 ~ 1일'
    : p.delivery_days <= 3  ? '2 ~ 3일'
    : p.delivery_days <= 7  ? '4 ~ 7일'
    : '7일 이상';

  const infoRows = [
    { label: '배송',      value: p.delivery_type },
    { label: '평균 배송기간', value: deliveryDaysLabel },
    { label: '포장타입',  value: p.packaging_type },
    { label: '판매단위',  value: p.sales_unit },
    { label: '원산지',    value: p.origin },
    { label: '중량/용량', value: p.weight },
    { label: '보관방법',  value: p.storage_method },
    { label: '유통기한',  value: p.expiry_info },
    { label: '알레르기',  value: p.allergen_info },
    { label: '판매자',    value: p.sellers?.store_name },
    { label: '카테고리',  value: CATEGORY_LABEL[p.category] ?? p.category },
  ].filter((r) => r.value);

  const tabs = [
    { id: 'desc',  label: '상품설명' },
    { id: 'info',  label: '상세정보' },
    { id: 'review',label: '후기', count: reviewList.length },
    { id: 'qna',   label: '문의' },
  ];

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* 뒤로가기 */}
        <Link href="/market" className="inline-flex items-center gap-2 text-stone-400 dark:text-white/40 text-sm hover:text-stone-900 dark:hover:text-white transition mb-8">
          ← 마켓으로 돌아가기
        </Link>

        {/* ── 상단: 이미지 + 구매정보 ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <ProductImageGallery
            images={p.images ?? []}
            title={p.title}
            categoryEmoji={CATEGORY_EMOJI[p.category] ?? '📦'}
          />

          <div className="flex flex-col gap-5">
            {/* 카테고리 + 해외직구 뱃지 + 판매자 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-amber-400 border border-amber-500/30 rounded-full px-3 py-1">
                {CATEGORY_LABEL[p.category] ?? p.category}
              </span>
              {p.is_overseas && (
                <span className="text-xs font-bold text-white bg-sky-500 rounded-full px-3 py-1 flex items-center gap-1">
                  🌐 해외직구
                </span>
              )}
              {p.sellers?.store_name && (
                <span className="text-xs text-stone-400 dark:text-white/40">{p.sellers.store_name}</span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white leading-snug">{p.title}</h1>

            {/* 평균 별점 */}
            {reviewList.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size="sm" />
                <span className="text-amber-500 font-bold text-sm">{avgRating.toFixed(1)}</span>
                <span className="text-stone-400 dark:text-white/40 text-xs">후기 {reviewList.length}개</span>
              </div>
            )}


            {/* 빠른 스펙 정보 (마켓컬리 스타일 테이블) */}
            {(p.is_overseas || p.delivery_type || p.delivery_days || p.packaging_type || p.sales_unit || p.origin || p.weight || p.storage_method) && (
              <div className="rounded-xl border border-black/8 dark:border-white/8 overflow-hidden text-sm">
                {/* 해외직구 전용 안내 */}
                {p.is_overseas && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-sky-500/8 border-b border-sky-500/15 text-sky-400 text-xs">
                    <span className="shrink-0 mt-0.5">🌐</span>
                    <span>해외직구 상품입니다. 관부가세가 발생할 수 있으며, 통관 지연 시 배송이 늦어질 수 있습니다.</span>
                  </div>
                )}
                {[
                  { label: '배송',          value: p.delivery_type },
                  { label: '해외배송비',    value: p.is_overseas ? (p.overseas_shipping_fee ? `${p.overseas_shipping_fee.toLocaleString('ko-KR')}원` : '별도 안내') : null },
                  { label: '관부가세',      value: p.is_overseas ? '수입 시 별도 발생 가능' : null },
                  { label: '평균 배송기간', value: deliveryDaysLabel },
                  { label: '포장타입',      value: p.packaging_type },
                  { label: '판매단위',      value: p.sales_unit },
                  { label: '원산지',        value: p.origin },
                  { label: '중량/용량',     value: p.weight },
                  { label: '보관방법',      value: p.storage_method },
                ].filter((r) => r.value).map(({ label, value }, i, arr) => (
                  <div
                    key={label}
                    className={`flex items-center ${i < arr.length - 1 ? 'border-b border-black/6 dark:border-white/6' : ''}`}
                  >
                    <span className="w-20 shrink-0 px-3 py-2.5 bg-black/3 dark:bg-white/3 text-[11px] font-semibold text-stone-500 dark:text-white/40 self-stretch flex items-center">
                      {label}
                    </span>
                    <span className="flex-1 px-3 py-2.5 text-stone-700 dark:text-white/70">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 가격 */}
            <div className="py-5 border-t border-b border-black/8 dark:border-white/8">
              <p className="text-stone-400 dark:text-white/30 text-xs mb-1">판매가</p>
              <p className="text-3xl font-bold text-amber-400">
                {formatPrice(p.price)}
                <span className="text-lg text-stone-400 dark:text-white/40 font-normal ml-1">원</span>
              </p>
            </div>

            {/* 재고 */}
            <div className="flex items-center gap-2">
              <span className="text-stone-400 dark:text-white/30 text-sm">재고</span>
              <span className={`text-sm font-semibold ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p.stock > 0 ? `${p.stock}개 남음` : '품절'}
              </span>
            </div>

            {/* 색상 선택 + 장바구니 */}
            <div className="flex flex-col gap-2">
              {p.colors && p.colors.length > 0 ? (
                <ColorSelectorCart productId={p.id} stock={p.stock} colors={p.colors} />
              ) : (
                <AddToCartButton productId={p.id} stock={p.stock} />
              )}
              <WishlistButton productId={p.id} />
            </div>

            {/* 신고 / 관리자 */}
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
          </div>
        </div>

        {/* ── 탭 섹션 ──────────────────────────────────────────────────── */}
        <div className="border-t border-black/8 dark:border-white/8">
          <ProductDetailTabs tabs={tabs}>

            {/* [0] 상품설명 */}
            <div>
              {p.description ? (
                <div
                  className="product-desc"
                  dangerouslySetInnerHTML={{ __html: p.description }}
                />
              ) : (
                <div className="py-16 text-center text-stone-400 dark:text-white/30 text-sm">
                  판매자가 작성한 상품 설명이 없습니다.
                </div>
              )}
            </div>

            {/* [1] 상세정보 */}
            <div>
              {infoRows.length > 0 ? (
                <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden">
                  {infoRows.map(({ label, value }, i) => (
                    <div
                      key={label}
                      className={`flex items-start gap-0 ${i < infoRows.length - 1 ? 'border-b border-black/6 dark:border-white/6' : ''}`}
                    >
                      <div className="w-28 shrink-0 px-5 py-4 bg-black/3 dark:bg-white/3 text-xs font-semibold text-stone-500 dark:text-white/40 self-stretch flex items-center">
                        {label}
                      </div>
                      <div className="flex-1 px-5 py-4 text-sm text-stone-700 dark:text-white/70">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-stone-400 dark:text-white/30 text-sm">
                  상세정보가 등록되지 않았습니다.
                </div>
              )}
            </div>

            {/* [2] 후기 */}
            <ReviewSection
              productId={id}
              sellerId={p.seller_id}
              reviews={reviewList}
              avgRating={avgRating}
              dist={dist}
            />

            {/* [3] 문의 */}
            <div className="py-8 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                </div>
                <p className="text-stone-600 dark:text-white/60 text-sm">상품에 대해 궁금한 점이 있으신가요?</p>
                <Link
                  href="/inquiry/write"
                  className="px-6 py-3 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
                >
                  1:1 문의하기
                </Link>
              </div>
            </div>

          </ProductDetailTabs>
        </div>
      </div>
    </main>
  );
}
