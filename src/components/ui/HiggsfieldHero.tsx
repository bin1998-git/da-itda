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
      {/* Higgsfield 영상 레이어 */}
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
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-950 to-black flex items-center justify-center">
            <span className="text-white/20 text-sm tracking-widest uppercase">
              Higgsfield Video Engine
            </span>
          </div>
        )}
        {/* 오버레이 */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-2xl text-white/70 mb-8 max-w-2xl">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
