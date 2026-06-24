'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const MODULES = [
  {
    slug: 'commerce',
    label: '식품 마켓',
    desc: '신선식품·주방용품 구매/판매',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
    gradient: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
    badge: '오픈 예정',
    active: false,
  },
  {
    slug: 'media',
    label: '푸드 미디어',
    desc: '레시피 영상·Higgsfield 콘텐츠',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    ),
    gradient: 'from-rose-500/20 to-pink-500/10',
    border: 'border-rose-500/30',
    accent: 'text-rose-400',
    badge: '오픈 예정',
    active: false,
  },
  {
    slug: 'community',
    label: '푸드 커뮤니티',
    desc: '레시피 공유·리뷰·소통',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    gradient: 'from-emerald-500/20 to-teal-500/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    badge: '오픈 예정',
    active: false,
  },
];

const QUICK_STATS = [
  { label: '오늘 신상품', value: '24', unit: '개', icon: '🥩' },
  { label: '활성 판매자', value: '1.2', unit: 'k', icon: '👨‍🍳' },
  { label: '누적 레시피', value: '3.8', unit: 'k', icon: '📖' },
  { label: '커뮤니티 멤버', value: '12', unit: 'k', icon: '👥' },
];

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('좋은 아침이에요');
    else if (h < 18) setGreeting('안녕하세요');
    else setGreeting('좋은 저녁이에요');
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/auth/login'); return; }

    const meta = user.user_metadata;
    setDisplayName(meta?.full_name || meta?.name || user.email?.split('@')[0] || '회원');
    setAvatar(meta?.avatar_url || '');

    supabase.from('profiles').select('username, full_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.full_name) setDisplayName(data.full_name);
        else if (data?.username) setDisplayName(data.username);
      });
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      {/* 헤더 배너 */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-amber-500/5 blur-3xl rounded-full" />
        <div className="max-w-5xl mx-auto px-6 py-10 relative">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt="프로필" referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black font-bold text-xl shadow-lg">
                {displayName[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <p className="text-white/40 text-sm">{greeting} 👋</p>
              <h1 className="text-2xl font-bold text-white">{displayName} 님</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* 플랫폼 소개 배너 */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none">🍽️</div>
          <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-1">다잇다 플랫폼</p>
          <h2 className="text-white text-xl font-bold mb-1">맛있는 모든 것이 여기에</h2>
          <p className="text-white/40 text-sm">신선식품부터 주방용품까지, 레시피와 커뮤니티까지 한 곳에서.</p>
        </div>

        {/* 퀵 스탯 */}
        <div>
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-4">플랫폼 현황</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/8 bg-white/3 p-4">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-white font-bold text-xl">{stat.value}</span>
                  <span className="text-white/40 text-sm">{stat.unit}</span>
                </div>
                <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 모듈 */}
        <div>
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-4">서비스 모듈</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODULES.map((mod) => (
              <div
                key={mod.slug}
                className={`relative rounded-2xl border bg-gradient-to-br ${mod.gradient} ${mod.border} p-6 flex flex-col gap-4 transition-all duration-200 cursor-not-allowed opacity-70 hover:opacity-90`}
              >
                <div className="flex items-start justify-between">
                  <div className={`${mod.accent}`}>{mod.icon}</div>
                  <span className="text-[10px] font-semibold tracking-wider text-white/40 border border-white/10 rounded-full px-2 py-0.5">
                    {mod.badge}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{mod.label}</p>
                  <p className="text-white/40 text-sm mt-0.5">{mod.desc}</p>
                </div>
                <div className={`h-0.5 w-12 rounded-full bg-gradient-to-r ${mod.gradient.replace('/20', '').replace('/10', '')}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 곧 출시 안내 */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 flex items-center gap-4">
          <div className="text-3xl">🚀</div>
          <div>
            <p className="text-white font-semibold text-sm">서비스 준비 중</p>
            <p className="text-white/40 text-xs mt-0.5">식품 마켓, 푸드 미디어, 커뮤니티 모듈이 곧 오픈됩니다.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
