'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SavedCoupon {
  code: string;
  title: string;
  discountDesc: string;
}

const EVENTS = [
  {
    id: 1,
    badge: 'HOT',
    badgeColor: 'bg-rose-500/15 text-rose-400',
    title: '신규 회원 웰컴 쿠폰',
    desc: '첫 주문 시 5,000원을 즉시 할인해드립니다. 최소 주문금액 10,000원 이상.',
    period: '~ 2026.07.31',
    href: '/market',
    cta: '마켓에서 사용',
    gradient: 'from-rose-500/10 to-pink-500/5',
    border: 'border-rose-500/20',
    couponCode: 'WELCOME5000',
    couponTitle: '신규 회원 웰컴 쿠폰',
    discountDesc: '5,000원 고정 할인',
    couponColor: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
  },
  {
    id: 2,
    badge: 'NEW',
    badgeColor: 'bg-amber-500/15 text-amber-400',
    title: '마켓 첫 구매 무료배송',
    desc: '장바구니에서 코드 입력 시 배송비 3,000원을 할인해드립니다.',
    period: '~ 2026.12.31',
    href: '/market',
    cta: '마켓 바로가기',
    gradient: 'from-amber-500/10 to-orange-500/5',
    border: 'border-amber-500/20',
    couponCode: 'FREESHIP',
    couponTitle: '무료배송 쿠폰',
    discountDesc: '배송비 3,000원 할인',
    couponColor: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
  },
  {
    id: 3,
    badge: 'EVENT',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
    title: '레시피 크리에이터 쿠폰',
    desc: '영상을 업로드한 모든 크리에이터에게 드리는 3,000원 감사 쿠폰입니다.',
    period: '~ 2026.08.15',
    href: '/media/upload',
    cta: '영상 올리기',
    gradient: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/20',
    couponCode: 'RECIPE1000',
    couponTitle: '크리에이터 감사 쿠폰',
    discountDesc: '3,000원 고정 할인',
    couponColor: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  },
  {
    id: 4,
    badge: 'SPECIAL',
    badgeColor: 'bg-violet-500/15 text-violet-400',
    title: '여름 특가 30% 할인',
    desc: '제철 식재료 최대 30% 할인! 최대 20,000원까지 할인, 최소 주문금액 15,000원.',
    period: '~ 2026.07.15',
    href: '/market',
    cta: '특가 보러가기',
    gradient: 'from-violet-500/10 to-purple-500/5',
    border: 'border-violet-500/20',
    couponCode: 'SUMMER30',
    couponTitle: '여름 특가 쿠폰',
    discountDesc: '30% 할인 (최대 20,000원)',
    couponColor: 'bg-violet-500/10 border-violet-500/25 text-violet-300',
  },
  {
    id: 5,
    badge: 'OPEN',
    badgeColor: 'bg-sky-500/15 text-sky-400',
    title: '다잇다 오픈 기념 10% 쿠폰',
    desc: '다잇다 서비스 오픈을 기념해 전 상품 10% 할인 쿠폰을 드립니다. 최대 10,000원.',
    period: '~ 2026.12.31',
    href: '/market',
    cta: '마켓에서 사용',
    gradient: 'from-sky-500/10 to-blue-500/5',
    border: 'border-sky-500/20',
    couponCode: 'DAEITDA2026',
    couponTitle: '오픈 기념 쿠폰',
    discountDesc: '10% 할인 (최대 10,000원)',
    couponColor: 'bg-sky-500/10 border-sky-500/25 text-sky-300',
  },
];

export default function EventsPage() {
  const [myCoupons, setMyCoupons] = useState<SavedCoupon[]>([]);
  const [justDownloaded, setJustDownloaded] = useState<string | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('saved_coupons') ?? '[]') as SavedCoupon[];
    setMyCoupons(stored);
  }, []);

  const hasCoupon = (code: string) => myCoupons.some((c) => c.code === code);

  const downloadCoupon = (e: typeof EVENTS[0]) => {
    if (hasCoupon(e.couponCode)) return;
    const newCoupon: SavedCoupon = {
      code: e.couponCode,
      title: e.couponTitle,
      discountDesc: e.discountDesc,
    };
    const updated = [...myCoupons, newCoupon];
    setMyCoupons(updated);
    localStorage.setItem('saved_coupons', JSON.stringify(updated));
    setJustDownloaded(e.couponCode);
    setTimeout(() => setJustDownloaded(null), 2000);
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <p className="text-pink-400 text-xs font-semibold tracking-widest uppercase mb-2">Events</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">할인 · 프로모션</h1>
          <p className="text-stone-400 dark:text-white/35 text-sm mt-2">
            쿠폰을 받아 장바구니에서 바로 사용하세요.
          </p>
        </div>

        {/* 내 쿠폰 현황 */}
        {myCoupons.length > 0 && (
          <div className="mb-8 flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-xl shrink-0">🎟️</span>
            <div className="flex-1">
              <p className="text-emerald-400 text-sm font-medium">보유 쿠폰 {myCoupons.length}개</p>
              <p className="text-stone-400 dark:text-white/35 text-xs mt-0.5">
                {myCoupons.map((c) => c.code).join(' · ')}
              </p>
            </div>
            <Link href="/cart"
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition font-medium shrink-0"
            >
              장바구니에서 사용 →
            </Link>
          </div>
        )}

        {/* 사용 방법 */}
        <div className="mb-8 flex items-start gap-3 p-4 rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-sm text-stone-500 dark:text-white/45 leading-relaxed">
            쿠폰 받기 → <Link href="/cart" className="text-amber-400 hover:underline">장바구니</Link> 이동 → 내 쿠폰 선택 → 자동 적용
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {EVENTS.map((e) => {
            const owned = hasCoupon(e.couponCode);
            const downloading = justDownloaded === e.couponCode;
            return (
              <div
                key={e.id}
                className={`relative p-6 rounded-2xl border ${e.border} bg-gradient-to-br ${e.gradient} flex flex-col gap-4`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${e.badgeColor}`}>
                    {e.badge}
                  </span>
                  <span className="text-stone-400 dark:text-white/20 text-xs">{e.period}</span>
                </div>

                <div>
                  <h2 className="text-stone-900 dark:text-white font-bold text-lg leading-snug">{e.title}</h2>
                  <p className="text-stone-500 dark:text-white/45 text-sm mt-2 leading-relaxed">{e.desc}</p>
                </div>

                {/* 쿠폰 코드 + 다운로드 */}
                <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${e.couponColor}`}>
                  <div>
                    <p className="font-mono font-bold text-base tracking-widest">{e.couponCode}</p>
                    <p className="text-[11px] opacity-60 mt-0.5">{e.discountDesc}</p>
                  </div>
                  <button
                    onClick={() => downloadCoupon(e)}
                    disabled={owned}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      owned
                        ? 'bg-black/5 dark:bg-white/5 text-stone-400 dark:text-white/25 cursor-not-allowed'
                        : downloading
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-black/15 dark:bg-white/15 text-stone-900 dark:text-white hover:bg-black/25 dark:hover:bg-white/25'
                    }`}
                  >
                    {owned ? '보유중' : downloading ? '받기 완료 ✓' : '쿠폰 받기'}
                  </button>
                </div>

                <Link
                  href={e.href}
                  className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-4 py-2.5 rounded-xl bg-black/8 dark:bg-white/8 text-stone-600 dark:text-white/65 hover:bg-black/14 dark:hover:bg-white/14 hover:text-stone-900 dark:hover:text-white transition border border-black/8 dark:border-white/8"
                >
                  {e.cta} →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
