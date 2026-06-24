'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const SERVICE_LINKS = [
  { label: '식품 마켓', href: '/market' },
  { label: '푸드 미디어', href: '/media' },
  { label: '커뮤니티', href: '/community' },
  { label: '대시보드', href: '/dashboard' },
];

const INFO_LINKS = [
  { label: '서비스 소개', href: '/#modules' },
  { label: '핵심 가치', href: '/#why' },
  { label: '이용약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
];

export default function Footer() {
  const user = useAuthStore((s) => s.user);

  const accountLinks = user
    ? [
        { label: '마이페이지', href: '/dashboard' },
        { label: '상품 등록', href: '/market/sell' },
        { label: '영상 올리기', href: '/media/upload' },
      ]
    : [
        { label: '회원가입', href: '/auth/signup' },
        { label: '로그인', href: '/auth/login' },
        { label: '상품 등록', href: '/market/sell' },
        { label: '영상 올리기', href: '/media/upload' },
      ];

  return (
    <footer className="bg-[#0a0a0a] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6">
        {/* 메인 */}
        <div className="py-14 grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* 브랜드 */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black text-sm font-black shadow-lg shadow-amber-500/20">
                다
              </div>
              <span className="text-white font-bold text-xl tracking-tight">다잇다</span>
            </div>
            <p className="text-white/35 text-sm leading-relaxed max-w-xs">
              맛있는 모든 것을 하나로 — 식품 마켓, 레시피 영상, 푸드 커뮤니티까지 끊김 없이 연결합니다.
            </p>
            {/* 소셜 */}
            <div className="flex items-center gap-3 mt-1">
              {[
                { label: 'GitHub', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                )},
                { label: 'Instagram', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                )},
              ].map(({ label, icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* 링크 컬럼들 */}
          {([['서비스', SERVICE_LINKS], ['정보', INFO_LINKS], ['계정', accountLinks]] as [string, { label: string; href: string }[]][]).map(([title, items]) => (
            <div key={title} className="flex flex-col gap-3">
              <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">{title}</p>
              <ul className="flex flex-col gap-2">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-white/45 text-sm hover:text-white transition leading-relaxed"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 하단 바 */}
        <div className="border-t border-white/[0.06] py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">© 2026 Da-itda. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-white/15 text-xs">Made in Korea 🇰🇷</span>
            <span className="text-white/10 text-xs">·</span>
            <span className="text-white/15 text-xs">Powered by Higgsfield AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
