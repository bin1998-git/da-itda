import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 via-black to-black pointer-events-none" />

      <div className="relative z-10">
        <p className="text-white/20 text-sm tracking-[0.3em] uppercase mb-6">
          다잇다 · Da-itda
        </p>

        <h1 className="text-[8rem] md:text-[12rem] font-bold text-white leading-none tracking-tighter">
          404
        </h1>

        <p className="text-white/50 text-lg md:text-xl mt-4 mb-2">
          페이지를 찾을 수 없습니다
        </p>
        <p className="text-white/30 text-sm mb-10">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition"
          >
            홈으로
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-full border border-white/20 text-white hover:bg-white/10 transition"
          >
            대시보드
          </Link>
        </div>
      </div>
    </div>
  );
}
