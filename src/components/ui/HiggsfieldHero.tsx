'use client';

interface HiggsfieldHeroProps {
  videoUrl?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function HiggsfieldHero({
  videoUrl,
  title,
  subtitle,
  children,
}: HiggsfieldHeroProps) {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* 배경 레이어 */}
      <div className="absolute inset-0 z-0">
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="hero-bg-animated w-full h-full">
            {/* 앰비언트 orb */}
            <div className="orb-1 absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
            <div className="orb-2 absolute top-1/2 right-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl" />
            <div className="orb-3 absolute bottom-1/4 left-1/2 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          </div>
        )}
        {/* 그라디언트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
      </div>

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        <div className="animate-fade-in-up">
          <span className="inline-block text-xs font-semibold tracking-[0.3em] text-amber-400/80 uppercase mb-6 border border-amber-400/20 rounded-full px-4 py-1.5">
            Higgsfield Video Engine Ready
          </span>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight leading-none">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="animate-fade-in-up delay-100 text-lg md:text-2xl text-white/60 mb-10 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="animate-fade-in-up delay-200">
          {children}
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/30">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );
}
