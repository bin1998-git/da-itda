import Link from 'next/link';

const EVENTS = [
  {
    id: 1,
    badge: 'HOT',
    badgeColor: 'bg-rose-500/15 text-rose-400',
    title: '신규 회원 웰컴 쿠폰',
    desc: '가입 후 첫 주문 시 5,000원 할인 쿠폰을 드립니다.',
    period: '2026.06.01 ~ 2026.07.31',
    href: '/auth/signup',
    cta: '지금 가입하기',
    gradient: 'from-rose-500/10 to-pink-500/5',
    border: 'border-rose-500/20',
  },
  {
    id: 2,
    badge: 'NEW',
    badgeColor: 'bg-amber-500/15 text-amber-400',
    title: '마켓 첫 구매 무료배송',
    desc: '식품 마켓에서 첫 주문 시 배송비가 무료입니다.',
    period: '2026.06.01 ~ 상시',
    href: '/market',
    cta: '마켓 바로가기',
    gradient: 'from-amber-500/10 to-orange-500/5',
    border: 'border-amber-500/20',
  },
  {
    id: 3,
    badge: 'EVENT',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
    title: '레시피 영상 업로드 이벤트',
    desc: '내 레시피 영상을 올리고 조회수 1,000 달성 시 커피 쿠폰 증정!',
    period: '2026.06.15 ~ 2026.08.15',
    href: '/media/upload',
    cta: '영상 올리기',
    gradient: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/20',
  },
  {
    id: 4,
    badge: 'SPECIAL',
    badgeColor: 'bg-violet-500/15 text-violet-400',
    title: '여름 특가 식품 기획전',
    desc: '여름 제철 식재료 최대 30% 할인! 한정 수량이니 서두르세요.',
    period: '2026.07.01 ~ 2026.07.15',
    href: '/market',
    cta: '특가 보러가기',
    gradient: 'from-violet-500/10 to-purple-500/5',
    border: 'border-violet-500/20',
  },
];

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <p className="text-pink-400 text-xs font-semibold tracking-widest uppercase mb-2">Events</p>
          <h1 className="text-3xl font-bold text-white">할인 · 프로모션</h1>
          <p className="text-white/35 text-sm mt-2">다잇다에서 진행 중인 이벤트를 확인하세요</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {EVENTS.map((e) => (
            <div
              key={e.id}
              className={`relative p-6 rounded-2xl border ${e.border} bg-gradient-to-br ${e.gradient} flex flex-col gap-4`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${e.badgeColor}`}>
                  {e.badge}
                </span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-snug">{e.title}</h2>
                <p className="text-white/45 text-sm mt-2 leading-relaxed">{e.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-white/25 text-xs">{e.period}</span>
                <Link
                  href={e.href}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-white/8 text-white/70 hover:bg-white/14 hover:text-white transition border border-white/8"
                >
                  {e.cta} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
