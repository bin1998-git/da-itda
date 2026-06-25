'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function HiggsfieldHero() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const ctaHref = user ? '/dashboard' : '/auth/signup';
  const ctaLabel = isLoading ? '잠시만요...' : user ? '대시보드로 이동' : '무료로 시작하기';

  return (
    <section className="relative w-full min-h-screen overflow-hidden flex flex-col">
      {/* 배경 */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#EDE8E2] dark:bg-[#080808] transition-colors duration-300" />
        {/* 그리드 패턴 */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* 앰비언트 glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-400/[0.18] dark:bg-amber-500/[0.08] rounded-full blur-[120px]" />
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-orange-400/[0.12] dark:bg-rose-500/[0.06] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-amber-300/[0.10] dark:bg-emerald-500/[0.05] rounded-full blur-[100px]" />
        {/* 하단 페이드 */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#EDE8E2] dark:from-[#0a0a0a] to-transparent" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-6 pt-32 pb-16">
        {/* 공지 뱃지 */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-sm text-xs text-stone-500 dark:text-white/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          커뮤니티 오픈 · 지금 바로 대화에 참여하세요
          <svg className="w-3 h-3 text-stone-400 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* 헤드라인 */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6 max-w-4xl">
          <span className="text-stone-900 dark:text-white">맛있는 모든 것을</span>
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #f59e0b 100%)' }}
          >
            하나로
          </span>
        </h1>

        {/* 서브타이틀 */}
        <p className="text-base md:text-lg text-stone-600 dark:text-white/45 mb-10 max-w-xl leading-relaxed">
          식품 마켓부터 레시피 영상, 푸드 커뮤니티까지 —<br className="hidden md:block" />
          다잇다 하나로 끊김 없이 연결됩니다.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link
            href={ctaHref}
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:bg-stone-700 dark:hover:bg-white/90 transition-all shadow-xl shadow-black/10 dark:shadow-white/10"
          >
            {ctaLabel}
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <a
            href="#modules"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-black/12 dark:border-white/12 text-stone-600 dark:text-white/70 text-sm hover:bg-black/5 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-all"
          >
            서비스 둘러보기
          </a>
        </div>

        {/* 신뢰 지표 */}
        <div className="flex items-center gap-3 text-stone-500 dark:text-white/30 text-xs">
          <div className="flex -space-x-1.5">
            {['🧑‍🍳','👩‍🍳','🧑','👨','👩'].map((e, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-black/8 dark:bg-white/10 border border-stone-200 dark:border-black flex items-center justify-center text-[10px]">{e}</div>
            ))}
          </div>
          <span>1,200+ 명이 이미 사용 중</span>
          <span className="text-stone-300 dark:text-white/15">·</span>
          <span>무료로 시작</span>
        </div>
      </div>

      {/* 모듈 프리뷰 카드 */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-24" id="modules">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 마켓 카드 */}
          <Link href="/market" className="group relative rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5 hover:border-amber-500/30 transition-all duration-300 p-5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-lg">🛒</div>
                <span className="text-[10px] text-amber-500/60 dark:text-amber-400/60 font-semibold uppercase tracking-wider">Market</span>
              </div>
              <h3 className="text-stone-900 dark:text-white font-semibold text-sm mb-1">식품 마켓</h3>
              <p className="text-stone-400 dark:text-white/35 text-xs leading-relaxed">신선식품 · 주방용품 직거래</p>
              <div className="mt-4 flex gap-1.5">
                {['한라봉 5kg', '삼겹살', '두부'].map(t => (
                  <span key={t} className="text-[10px] text-amber-600 dark:text-amber-400/50 bg-amber-500/8 px-2 py-0.5 rounded-full border border-amber-500/15">{t}</span>
                ))}
              </div>
            </div>
          </Link>

          {/* 미디어 카드 */}
          <Link href="/media" className="group relative rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5 hover:border-rose-500/30 transition-all duration-300 p-5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-lg">🎬</div>
                <span className="text-[10px] text-rose-500/60 dark:text-rose-400/60 font-semibold uppercase tracking-wider">Media</span>
              </div>
              <h3 className="text-stone-900 dark:text-white font-semibold text-sm mb-1">푸드 미디어</h3>
              <p className="text-stone-400 dark:text-white/35 text-xs leading-relaxed">레시피 영상 · 요리 콘텐츠</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex -space-x-1">
                  {['🍜','🥗','🍰'].map((e,i)=>(
                    <div key={i} className="w-6 h-6 rounded-full bg-rose-500/15 border border-stone-200 dark:border-black flex items-center justify-center text-[10px]">{e}</div>
                  ))}
                </div>
                <span className="text-[10px] text-stone-400 dark:text-white/25">3,800+ 레시피</span>
              </div>
            </div>
          </Link>

          {/* 커뮤니티 카드 */}
          <Link href="/community" className="group relative rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5 hover:border-emerald-500/30 transition-all duration-300 p-5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-lg">💬</div>
                <span className="text-[10px] text-emerald-500/60 dark:text-emerald-400/60 font-semibold uppercase tracking-wider">Community</span>
              </div>
              <h3 className="text-stone-900 dark:text-white font-semibold text-sm mb-1">푸드 커뮤니티</h3>
              <p className="text-stone-400 dark:text-white/35 text-xs leading-relaxed">레시피 공유 · 요리 토크</p>
              <div className="mt-4 flex gap-1.5">
                {['질문','레시피','후기'].map(t => (
                  <span key={t} className="text-[10px] text-emerald-600 dark:text-emerald-400/50 bg-emerald-500/8 px-2 py-0.5 rounded-full border border-emerald-500/15">{t}</span>
                ))}
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-stone-300 dark:text-white/20">
        <div className="w-5 h-8 rounded-full border border-stone-300 dark:border-white/15 flex items-start justify-center pt-1.5">
          <div className="w-0.5 h-2 bg-stone-400 dark:bg-white/40 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
