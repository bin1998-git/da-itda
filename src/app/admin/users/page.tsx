'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import Pagination from '@/components/ui/Pagination';

const PAGE_SIZE = 15;

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  comment_banned_until: string | null;
  post_banned_until: string | null;
  products_blocked: boolean;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });

const isBanned = (p: Profile) =>
  (p.comment_banned_until && new Date(p.comment_banned_until) > new Date()) ||
  (p.post_banned_until && new Date(p.post_banned_until) > new Date()) ||
  p.products_blocked;

export default function AdminUsersPage() {
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const isAdmin   = useAuthStore((s) => s.isAdmin);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<'all' | 'admin' | 'banned'>('all');
  const [page, setPage]           = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role, created_at, comment_banned_until, post_banned_until, products_blocked')
      .order('created_at', { ascending: false });
    setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) { router.replace('/'); return; }
    load();
  }, [user, isLoading, isAdmin, router, load]);

  const toggleRole = async (p: Profile) => {
    if (p.id === user?.id) return; // 자기 자신은 변경 불가
    const newRole = p.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`${p.username ?? p.full_name ?? '회원'}을 ${newRole === 'admin' ? '관리자' : '일반 회원'}으로 변경할까요?`)) return;
    setProcessing(p.id);
    await supabase.from('profiles').update({ role: newRole }).eq('id', p.id);
    setProcessing(null);
    await load();
  };

  const removeBan = async (p: Profile) => {
    setProcessing(p.id);
    await supabase.from('profiles').update({
      comment_banned_until: null,
      post_banned_until: null,
      products_blocked: false,
    }).eq('id', p.id);
    setProcessing(null);
    await load();
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.username ?? '').toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'admin' ? p.role === 'admin' :
      isBanned(p);
    return matchSearch && matchFilter;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      {/* 헤더 */}
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
        <div className="max-w-4xl mx-auto px-6 py-10 relative">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">ADMIN</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">가입 회원 관리</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">총 {profiles.length}명의 회원이 가입되어 있습니다</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {/* 검색 + 필터 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="이름 또는 아이디로 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/25 text-sm focus:outline-none focus:border-emerald-500/40 transition"
          />
          <div className="flex gap-2">
            {(['all', 'admin', 'banned'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  filter === f
                    ? f === 'admin'
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                      : f === 'banned'
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'border-black/8 dark:border-white/8 text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {f === 'all' ? '전체' : f === 'admin' ? '관리자' : '제재중'}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">👥</span>
            <p className="text-stone-400 dark:text-white/40 text-sm">해당하는 회원이 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paged.map((p) => {
              const banned = isBanned(p);
              const isSelf = p.id === user?.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition ${
                    banned
                      ? 'border-rose-500/20 bg-rose-500/4'
                      : p.role === 'admin'
                      ? 'border-indigo-500/20 bg-indigo-500/4'
                      : 'border-black/6 dark:border-white/6 bg-black/2 dark:bg-white/2'
                  }`}
                >
                  {/* 아바타 */}
                  <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (p.username ?? p.full_name ?? '?')[0].toUpperCase()
                    }
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-stone-900 dark:text-white font-medium text-sm">
                        {p.full_name ?? p.username ?? '이름 없음'}
                      </span>
                      {p.username && (
                        <span className="text-stone-400 dark:text-white/30 text-xs">@{p.username}</span>
                      )}
                      {p.role === 'admin' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                          관리자
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          나
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-stone-400 dark:text-white/25 text-xs">가입 {fmt(p.created_at)}</span>
                      {p.comment_banned_until && new Date(p.comment_banned_until) > new Date() && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          댓글금지 ~{fmt(p.comment_banned_until)}
                        </span>
                      )}
                      {p.post_banned_until && new Date(p.post_banned_until) > new Date() && (
                        <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                          게시금지 ~{fmt(p.post_banned_until)}
                        </span>
                      )}
                      {p.products_blocked && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          판매정지
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {banned && (
                      <button
                        onClick={() => removeBan(p)}
                        disabled={processing === p.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-40"
                      >
                        제재 해제
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        onClick={() => toggleRole(p)}
                        disabled={processing === p.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-40 ${
                          p.role === 'admin'
                            ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                            : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'
                        }`}
                      >
                        {processing === p.id ? '...' : p.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </main>
  );
}
