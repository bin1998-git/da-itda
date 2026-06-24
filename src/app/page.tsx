import Link from 'next/link';
import HiggsfieldHero from '@/components/ui/HiggsfieldHero';

const VALUES = [
  {
    icon: '🔗',
    title: '연결성',
    en: 'Connectivity',
    desc: '파편화된 서비스를 하나의 UI/UX로 통합합니다. 식품 구매부터 레시피, 커뮤니티까지 끊김 없이 연결됩니다.',
    accent: 'from-amber-500/20 to-orange-500/5',
    border: 'border-amber-500/20',
    tag: 'text-amber-400',
  },
  {
    icon: '🎬',
    title: '몰입감',
    en: 'Immersive',
    desc: 'Higgsfield 영상 엔진이 만드는 시각적 압도감. 모든 주요 화면에 영상 Hero가 살아 숨쉽니다.',
    accent: 'from-rose-500/20 to-pink-500/5',
    border: 'border-rose-500/20',
    tag: 'text-rose-400',
  },
  {
    icon: '🧩',
    title: '유연성',
    en: 'Scalability',
    desc: '새 기능을 모듈처럼 끼워 넣는 구조. 필요한 서비스만 선택해서 나만의 플랫폼을 구성하세요.',
    accent: 'from-emerald-500/20 to-teal-500/5',
    border: 'border-emerald-500/20',
    tag: 'text-emerald-400',
  },
];

const MODULES = [
  {
    slug: 'commerce',
    emoji: '🛒',
    label: '식품 마켓',
    desc: '신선식품부터 주방용품까지, 검증된 판매자의 제품을 직접 구매하세요.',
    features: ['신선식품 당일배송', '주방용품 큐레이션', '판매자 직거래'],
    gradient: 'from-amber-500/15 to-orange-500/5',
    border: 'border-amber-500/25',
    accent: 'text-amber-400',
    tag: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    slug: 'media',
    emoji: '🎥',
    label: '푸드 미디어',
    desc: 'Higgsfield 영상으로 만드는 레시피 콘텐츠. 요리를 보고, 배우고, 따라하세요.',
    features: ['Higgsfield 영상 레시피', '셰프 LIVE 쿠킹', '요리 클래스'],
    gradient: 'from-rose-500/15 to-pink-500/5',
    border: 'border-rose-500/25',
    accent: 'text-rose-400',
    tag: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  {
    slug: 'community',
    emoji: '💬',
    label: '푸드 커뮤니티',
    desc: '레시피를 공유하고, 리뷰를 남기고, 같은 취향의 사람들과 소통하세요.',
    features: ['레시피 공유 게시판', '상품 리뷰 & 평점', '좋아요 & 북마크'],
    gradient: 'from-emerald-500/15 to-teal-500/5',
    border: 'border-emerald-500/25',
    accent: 'text-emerald-400',
    tag: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
];

const STATS = [
  { value: '1.2k+', label: '활성 판매자', icon: '👨‍🍳' },
  { value: '3.8k+', label: '누적 레시피', icon: '📖' },
  { value: '12k+', label: '커뮤니티 멤버', icon: '👥' },
  { value: '24/7', label: '서비스 운영', icon: '⚡' },
];

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-[#0a0a0a]">

      {/* ── Hero 섹션 ── */}
      <HiggsfieldHero
        title="다잇다"
        subtitle="맛있는 모든 것을 하나로 — 식품 마켓부터 레시피 영상, 푸드 커뮤니티까지"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/auth/signup"
            className="px-8 py-3.5 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all duration-200 shadow-lg shadow-amber-500/20 min-w-[160px] text-center"
          >
            무료로 시작하기
          </Link>
          <a
            href="#modules"
            className="px-8 py-3.5 rounded-full border border-white/20 text-white text-sm hover:bg-white/8 transition-all duration-200 min-w-[160px] text-center"
          >
            서비스 둘러보기
          </a>
        </div>
      </HiggsfieldHero>

      {/* ── 핵심 가치 섹션 ── */}
      <section id="why" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-400/70 uppercase mb-3">왜 다잇다인가</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              세 가지 핵심 가치로<br className="hidden md:block" /> 설계된 플랫폼
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div
                key={v.en}
                className={`relative rounded-2xl border bg-gradient-to-br ${v.accent} ${v.border} p-7 flex flex-col gap-4`}
              >
                <div className="text-4xl">{v.icon}</div>
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="text-white font-bold text-xl">{v.title}</h3>
                    <span className={`text-xs font-medium ${v.tag}`}>{v.en}</span>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 모듈 섹션 ── */}
      <section id="modules" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-400/70 uppercase mb-3">3가지 모듈</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              하나의 플랫폼,<br className="hidden md:block" /> 무한한 가능성
            </h2>
            <p className="text-white/40 mt-4 text-base max-w-xl mx-auto">
              식품 마켓, 푸드 미디어, 커뮤니티를 하나로 연결해 더 풍부한 푸드 라이프를 제공합니다.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MODULES.map((mod) => (
              <div
                key={mod.slug}
                className={`relative rounded-2xl border bg-gradient-to-br ${mod.gradient} ${mod.border} p-7 flex flex-col gap-5`}
              >
                <div>
                  <span className="text-4xl">{mod.emoji}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-white font-bold text-xl`}>{mod.label}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mod.tag}`}>
                      오픈 예정
                    </span>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">{mod.desc}</p>
                </div>
                <ul className="flex flex-col gap-2">
                  {mod.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-white/40 text-xs">
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 bg-current ${mod.accent}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 통계 섹션 ── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center gap-3 py-6">
                <span className="text-3xl">{s.icon}</span>
                <span className="text-4xl font-bold text-white tracking-tight">{s.value}</span>
                <span className="text-white/40 text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 최종 CTA 섹션 ── */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-12 md:p-16">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_60%)]" />
            <div className="relative z-10">
              <span className="text-5xl block mb-6">🍽️</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                지금 바로<br />시작해보세요
              </h2>
              <p className="text-white/50 text-base mb-8 leading-relaxed">
                다잇다와 함께 더 풍부한 푸드 라이프를 경험하세요.<br />
                가입은 무료, 언제든 모든 기능을 이용할 수 있습니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup"
                  className="px-10 py-4 rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all duration-200 shadow-lg shadow-amber-500/20"
                >
                  무료 회원가입
                </Link>
                <Link
                  href="/auth/login"
                  className="px-10 py-4 rounded-full border border-white/15 text-white hover:bg-white/8 transition-all duration-200"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="py-10 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg tracking-tight">다잇다</span>
            <span className="text-white/20 text-sm">— Connect Everything</span>
          </div>
          <p className="text-white/20 text-xs">© 2026 Da-itda. All rights reserved.</p>
        </div>
      </footer>

    </main>
  );
}
