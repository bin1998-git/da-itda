'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Stats {
  totalNotices: number;
  pendingInquiries: number;
  totalInquiries: number;
  totalUsers: number;
}

interface RecentInquiry {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

const CAT_LABEL: Record<string, string> = {
  order: '주문/결제', shipping: '배송', product: '상품', general: '기타',
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalNotices: 0, pendingInquiries: 0, totalInquiries: 0, totalUsers: 0 });
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }

    // 관리자 권한 확인
    supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
      if (!data || data.role !== 'admin') {
        router.replace('/');
        return;
      }

      // 통계 로드
      Promise.all([
        supabase.from('notices').select('*', { count: 'exact', head: true }),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('inquiries').select('id, title, category, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      ]).then(([notices, pending, total, users, recent]) => {
        setStats({
          totalNotices: notices.count ?? 0,
          pendingInquiries: pending.count ?? 0,
          totalInquiries: total.count ?? 0,
          totalUsers: users.count ?? 0,
        });
        setRecentInquiries((recent.data ?? []) as RecentInquiry[]);
        setLoading(false);
      });
    });
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
        <div className="max-w-5xl mx-auto px-6 py-10 relative">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 tracking-widest uppercase">ADMIN</span>
          </div>
          <h1 className="text-3xl font-bold text-white">관리자 대시보드</h1>
          <p className="text-white/35 text-sm mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* 통계 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: '공지사항', value: stats.totalNotices, accent: 'text-violet-400', bg: 'bg-violet-500/8' },
            { label: '미답변 문의', value: stats.pendingInquiries, accent: 'text-amber-400', bg: 'bg-amber-500/8', highlight: stats.pendingInquiries > 0 },
            { label: '전체 문의', value: stats.totalInquiries, accent: 'text-sky-400', bg: 'bg-sky-500/8' },
            { label: '가입 회원', value: stats.totalUsers, accent: 'text-emerald-400', bg: 'bg-emerald-500/8' },
          ].map((s) => (
            <div key={s.label}
              className={`rounded-2xl border p-5 ${s.highlight ? 'border-amber-500/25 bg-amber-500/6' : 'border-white/8 bg-white/3'}`}
            >
              <p className="text-white/30 text-xs mb-2">{s.label}</p>
              <p className={`text-3xl font-bold ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 관리 메뉴 */}
        <div>
          <p className="text-white/25 text-xs font-semibold tracking-widest uppercase mb-4">관리 메뉴</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/notices"
              className="group flex items-center gap-4 p-5 rounded-2xl border border-white/8 bg-white/3 hover:border-violet-500/30 hover:bg-violet-500/5 transition"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-2xl shrink-0 group-hover:bg-violet-500/20 transition">
                📢
              </div>
              <div>
                <p className="text-white font-semibold">공지사항 관리</p>
                <p className="text-white/35 text-sm mt-0.5">공지 작성·수정·삭제 및 고정 관리</p>
              </div>
            </Link>
            <Link
              href="/admin/inquiries"
              className="group flex items-center gap-4 p-5 rounded-2xl border border-white/8 bg-white/3 hover:border-sky-500/30 hover:bg-sky-500/5 transition"
            >
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-2xl shrink-0 group-hover:bg-sky-500/20 transition">
                💬
              </div>
              <div>
                <p className="text-white font-semibold">1:1 문의 관리</p>
                <p className="text-white/35 text-sm mt-0.5">
                  문의 목록 확인 및 답변 등록
                  {stats.pendingInquiries > 0 && (
                    <span className="ml-2 text-amber-400 font-semibold">미답변 {stats.pendingInquiries}건</span>
                  )}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* 최근 미답변 문의 */}
        {recentInquiries.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/25 text-xs font-semibold tracking-widest uppercase">최근 미답변 문의</p>
              <Link href="/admin/inquiries" className="text-sky-400 text-xs hover:text-sky-300 transition">전체 보기 →</Link>
            </div>
            <div className="flex flex-col gap-2">
              {recentInquiries.map((q) => (
                <Link
                  key={q.id}
                  href={`/admin/inquiries`}
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/6 bg-white/2 hover:bg-white/4 transition group"
                >
                  <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                    {CAT_LABEL[q.category] ?? '기타'}
                  </span>
                  <span className="text-white/60 text-sm truncate group-hover:text-white transition flex-1">{q.title}</span>
                  <span className="text-white/25 text-xs shrink-0">{fmt(q.created_at)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
