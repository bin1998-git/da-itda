'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function HomeCTA() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  return (
    <section className="py-32 px-6 border-t border-white/5">
      <div className="max-w-2xl mx-auto text-center">
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-12 md:p-16">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_60%)]" />
          <div className="relative z-10">
            <span className="text-5xl block mb-6">🍽️</span>
            {user ? (
              <>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                  어서오세요!<br />오늘도 맛있는 하루
                </h2>
                <p className="text-white/50 text-base mb-8 leading-relaxed">
                  마켓, 미디어, 커뮤니티에서<br />
                  새로운 푸드 경험을 시작해보세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/dashboard"
                    className="px-10 py-4 rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all duration-200 shadow-lg shadow-amber-500/20"
                  >
                    대시보드로 이동
                  </Link>
                  <Link
                    href="/market"
                    className="px-10 py-4 rounded-full border border-white/15 text-white hover:bg-white/8 transition-all duration-200"
                  >
                    마켓 둘러보기
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                  지금 바로<br />시작해보세요
                </h2>
                <p className="text-white/50 text-base mb-8 leading-relaxed">
                  다잇다와 함께 더 풍부한 푸드 라이프를 경험하세요.<br />
                  가입은 무료, 언제든 모든 기능을 이용할 수 있습니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {isLoading ? (
                    <div className="h-14 w-64 rounded-full bg-white/5 animate-pulse mx-auto" />
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
