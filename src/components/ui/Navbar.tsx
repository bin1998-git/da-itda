'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/ui/NotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';

const NAV_LINKS = [
  {
    href: '/market',
    label: '마켓',
    sub: '식품·주방용품',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    accent: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  {
    href: '/media',
    label: '미디어',
    sub: '레시피 영상',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: 'text-rose-400',
    activeBg: 'bg-rose-500/12 border-rose-500/20',
    dot: 'bg-rose-400',
  },
  {
    href: '/community',
    label: '커뮤니티',
    sub: '푸드 토크',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    accent: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  {
    href: '/ranking',
    label: '랭킹',
    sub: '인기 TOP 10',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    accent: 'text-violet-400',
    activeBg: 'bg-violet-500/12 border-violet-500/20',
    dot: 'bg-violet-400',
  },
  {
    href: '/events',
    label: '이벤트',
    sub: '할인·프로모션',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    accent: 'text-pink-400',
    activeBg: 'bg-pink-500/12 border-pink-500/20',
    dot: 'bg-pink-400',
  },
];

function SearchIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/');
  };

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="fixed top-0 w-full z-50">
      {/* 배경 */}
      <div className="absolute inset-0 bg-[#EDE8E2]/85 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-black/[0.07] dark:border-white/[0.07]" />

      <div className="relative max-w-6xl mx-auto px-5 h-[60px] flex items-center justify-between gap-6">

        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          {/* 마크: 앰버 그라디언트 + 불꽃 아이콘 */}
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 transition-shadow" />
            <svg className="absolute inset-0 w-full h-full p-1.5" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C9.5 5 9 7.5 10.5 9.5C9 9.5 7 8 8 5.5C5.5 8 5 11 7 13.5C8.5 16 10.2 17.5 12 17.5C13.8 17.5 15.5 16 17 13.5C19 11 18.5 8 16 5.5C17 8 15 9.5 13.5 9.5C15 7.5 14.5 5 12 2Z" />
            </svg>
          </div>
          {/* 워드마크 */}
          <span className="font-black text-[17px] tracking-tight leading-none">
            <span className="text-stone-900 dark:text-white">다</span>
            <span className="text-amber-500 dark:text-amber-400">잇</span>
            <span className="text-stone-900 dark:text-white">다</span>
          </span>
        </Link>

        {/* 데스크탑 중앙 네비 */}
        <div className="hidden md:flex items-center gap-0.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-2xl px-1.5 py-1.5 border border-black/[0.07] dark:border-white/[0.07]">
          {NAV_LINKS.map(({ href, label, sub, icon, accent, activeBg, dot }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 border ${
                  active
                    ? `${accent} ${activeBg}`
                    : 'text-stone-500 dark:text-white/45 hover:text-stone-800 dark:hover:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                }`}
              >
                {/* 아이콘: 항상 표시 */}
                <span className={active ? accent : 'text-stone-400 dark:text-white/30'}>
                  {icon}
                </span>
                {/* lg+: 라벨 표시 */}
                <span className={`hidden lg:inline xl:hidden text-[13px] ${active ? accent : ''}`}>{label}</span>
                {/* xl+: 라벨 + 서브텍스트 */}
                <span className="hidden xl:flex flex-col leading-none gap-0.5">
                  <span className={active ? accent : ''}>{label}</span>
                  <span className={`text-[10px] font-normal ${active ? 'opacity-60' : 'text-stone-400 dark:text-white/25'}`}>{sub}</span>
                </span>
                {active && <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />}
              </Link>
            );
          })}
        </div>

        {/* 우측 유틸리티 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 검색 */}
          <Link
            href="/search"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition border border-transparent hover:border-black/8 dark:hover:border-white/8"
            title="검색"
          >
            <SearchIcon />
          </Link>

          {/* 장바구니 (관리자 제외) */}
          {!isAdmin && (
            <Link
              href="/cart"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition border border-transparent hover:border-black/8 dark:hover:border-white/8"
              title="장바구니"
            >
              <CartIcon />
            </Link>
          )}

          {/* 알림 */}
          <NotificationBell />

          {/* 테마 토글 */}
          <ThemeToggle />

          {/* 구분선 */}
          <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* 로그인 상태 */}
          {isLoading ? (
            <div className="w-24 h-8 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-black/6 dark:hover:bg-white/6 transition border border-transparent hover:border-black/8 dark:hover:border-white/8"
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="프로필"
                    className="w-6 h-6 rounded-full object-cover border border-white/15"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400/40 to-orange-500/40 border border-black/15 dark:border-white/15 flex items-center justify-center text-stone-900 dark:text-white text-[10px] font-bold">
                    {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-stone-600 dark:text-white/60 text-[13px] hidden sm:block max-w-[80px] truncate">
                  {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '사용자'}
                </span>
                <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 유저 드롭다운 */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/50 overflow-hidden py-1.5">
                  <Link
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-stone-600 dark:text-white/60 text-sm hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <UserIcon />
                    마이페이지
                  </Link>
                  {!isAdmin && (
                    <Link
                      href="/market/manage"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-stone-600 dark:text-white/60 text-sm hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      <CartIcon />
                      판매자 센터
                    </Link>
                  )}
                  {!isAdmin && (
                    <Link
                      href="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-stone-600 dark:text-white/60 text-sm hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      주문 내역
                    </Link>
                  )}
                  <Link
                    href="/inquiry"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-stone-600 dark:text-white/60 text-sm hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    1:1 문의
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-emerald-400/70 text-sm hover:text-emerald-400 hover:bg-emerald-500/5 transition"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      관리자
                    </Link>
                  )}
                  <div className="my-1 border-t border-black/6 dark:border-white/6" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-stone-400 dark:text-white/40 text-sm hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/5 transition"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/auth/login"
                className="hidden sm:block text-stone-500 dark:text-white/50 text-[13px] hover:text-stone-900 dark:hover:text-white transition px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="text-[13px] font-semibold px-4 py-1.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-black hover:bg-stone-700 dark:hover:bg-white/90 transition shadow-lg shadow-black/10 dark:shadow-white/5"
              >
                회원가입
              </Link>
            </div>
          )}

          {/* 모바일 햄버거 */}
          <button
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition ml-0.5"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={`w-[18px] h-0.5 bg-stone-500 dark:bg-white/50 rounded-full transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`w-[18px] h-0.5 bg-stone-500 dark:bg-white/50 rounded-full transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-[18px] h-0.5 bg-stone-500 dark:bg-white/50 rounded-full transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {menuOpen && (
        <div className="md:hidden relative bg-stone-50/95 dark:bg-[#0d0d0d]/95 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07] px-5 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label, accent }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-xl text-[13px] font-medium transition ${
                isActive(href) ? `${accent} bg-black/6 dark:bg-white/6` : 'text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-black/6 dark:border-white/6 mt-2 pt-3 flex flex-col gap-1">
            <Link href="/ranking" onClick={() => setMenuOpen(false)} className={`px-4 py-3 rounded-xl text-[13px] font-medium transition ${isActive('/ranking') ? 'text-violet-500 dark:text-violet-400 bg-black/6 dark:bg-white/6' : 'text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4'}`}>랭킹</Link>
            <Link href="/events"  onClick={() => setMenuOpen(false)} className={`px-4 py-3 rounded-xl text-[13px] font-medium transition ${isActive('/events')  ? 'text-pink-500 dark:text-pink-400 bg-black/6 dark:bg-white/6'   : 'text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4'}`}>이벤트</Link>
            <Link href="/notice"  onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-[13px] text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4 transition">공지사항</Link>
            <Link href="/search"  onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-[13px] text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4 transition">검색</Link>
            <Link href="/cart"    onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-[13px] text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4 transition">장바구니</Link>
            {user && (
              <Link href="/inquiry" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-[13px] text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4 transition">1:1 문의</Link>
            )}
            {!user && (
              <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-[13px] text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4 transition">로그인</Link>
            )}
          </div>
        </div>
      )}

      {/* 드롭다운 닫기 오버레이 */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setUserMenuOpen(false)} />
      )}
    </nav>
  );
}
