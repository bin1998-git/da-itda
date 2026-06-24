import HiggsfieldHero from '@/components/ui/HiggsfieldHero';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-black">
      <HiggsfieldHero
        title="다잇다"
        subtitle="당신이 원하는 모든 것을 연결합니다"
      >
        <div className="flex gap-4">
          <a
            href="/explore"
            className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition"
          >
            시작하기
          </a>
          <a
            href="/about"
            className="px-8 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition"
          >
            더 알아보기
          </a>
        </div>
      </HiggsfieldHero>

      {/* 콘텐츠 섹션 (이후 Phase에서 채울 영역) */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white mb-4">주요 기능</h2>
        <p className="text-white/50">Phase 1에서 구현 예정</p>
      </section>
    </main>
  );
}
