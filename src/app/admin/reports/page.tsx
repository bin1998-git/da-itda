'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  reporter_profile?: { username: string | null; full_name: string | null } | null;
}

const REASON_LABEL: Record<string, string> = {
  spam:      '스팸/광고',
  adult:     '음란물/선정적',
  hate:      '욕설/혐오',
  fraud:     '사기/허위정보',
  copyright: '저작권 침해',
  other:     '기타',
};
const TYPE_LABEL: Record<string, { label: string; href: (id: string) => string }> = {
  post:    { label: '게시글', href: (id) => `/community/${id}` },
  media:   { label: '영상',   href: (id) => `/media/${id}` },
  product: { label: '상품',   href: (id) => `/market/${id}` },
  comment: { label: '댓글',   href: () => '#' },
  user:    { label: '사용자', href: () => '#' },
};
const STATUS_STYLE: Record<string, string> = {
  pending:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  resolved:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  dismissed: 'text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10',
};

const TABLE_MAP: Record<string, string> = {
  post: 'posts', media: 'media_posts', product: 'products', comment: 'comments',
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminReportsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'dismissed' | 'all'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('reports')
      .select('*, profiles!reporter_id(username, full_name)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setReports(
      (data ?? []).map((d: any) => ({ ...d, reporter_profile: d.profiles })) as Report[],
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) { router.replace('/'); return; }
    load();
  }, [user, isLoading, isAdmin, router, load]);

  const resolve = async (id: string) => {
    setProcessing(id);
    await supabase.from('reports').update({
      status: 'resolved',
      resolved_by: user!.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: 'resolved' } : r));
    setProcessing(null);
  };

  const dismiss = async (id: string) => {
    setProcessing(id);
    await supabase.from('reports').update({
      status: 'dismissed',
      resolved_by: user!.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: 'dismissed' } : r));
    setProcessing(null);
  };

  const deleteContent = async (report: Report) => {
    if (!confirm(`${TYPE_LABEL[report.target_type]?.label ?? '콘텐츠'}를 삭제하고 신고를 처리할까요?`)) return;
    setProcessing(report.id);
    const table = TABLE_MAP[report.target_type];
    if (table) {
      await supabase.from(table).delete().eq('id', report.target_id);
    }
    await supabase.from('reports').update({
      status: 'resolved',
      resolved_by: user!.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', report.id);
    setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: 'resolved' } : r));
    setProcessing(null);
  };

  const unbanUser = async (targetType: string, targetId: string) => {
    // target_id에서 user_id 찾기 (user 타입이면 targetId가 바로 user_id)
    let userId: string | null = null;
    if (targetType === 'user') {
      userId = targetId;
    } else {
      const tableMap: Record<string, string> = {
        comment: 'comments', post: 'posts', product: 'products', media: 'media_posts',
      };
      const tbl = tableMap[targetType];
      if (tbl) {
        const { data } = await supabase.from(tbl).select('user_id').eq('id', targetId).single();
        userId = data?.user_id ?? null;
      }
    }
    if (!userId) { alert('유저를 찾을 수 없습니다.'); return; }
    if (!confirm('이 유저의 제재를 해제하시겠습니까?')) return;
    setProcessing(targetId);
    await supabase.from('profiles').update({
      comment_banned_until: null,
      post_banned_until:    null,
      products_blocked:     false,
    }).eq('id', userId);
    setProcessing(null);
    alert('제재가 해제되었습니다.');
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const pending = reports.filter((r) => r.status === 'pending').length;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Link href="/admin" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition text-sm">← 관리자</Link>
          <span className="text-stone-300 dark:text-white/15">/</span>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">신고 관리</h1>
          {pending > 0 && (
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-xs font-semibold border border-rose-500/25">
              미처리 {pending}건
            </span>
          )}
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([['pending', '미처리'], ['all', '전체'], ['resolved', '처리완료'], ['dismissed', '무시']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                filter === key
                  ? key === 'pending'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                  : 'border-black/8 dark:border-white/8 text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {reports.length === 0 ? (
          <div className="rounded-2xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-16 text-center">
            <span className="text-5xl block mb-4">🚩</span>
            <p className="text-stone-400 dark:text-white/40 text-sm">
              {filter === 'pending' ? '처리할 신고가 없습니다' : '신고 내역이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((r) => {
              const typeInfo = TYPE_LABEL[r.target_type];
              return (
                <div key={r.id} className={`rounded-2xl border bg-black/[0.02] dark:bg-white/[0.02] p-5 ${r.status === 'pending' ? 'border-rose-500/15' : 'border-black/6 dark:border-white/6'}`}>
                  <div className="flex items-start gap-3 flex-wrap">
                    {/* 메타 뱃지들 */}
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[r.status] ?? STATUS_STYLE.pending}`}>
                        {r.status === 'pending' ? '미처리' : r.status === 'resolved' ? '처리완료' : '무시됨'}
                      </span>
                      <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 shrink-0">
                        {typeInfo?.label ?? r.target_type}
                      </span>
                      <span className="text-[10px] text-rose-400/70 bg-rose-500/8 px-2 py-0.5 rounded-full shrink-0">
                        {REASON_LABEL[r.reason] ?? r.reason}
                      </span>
                      {typeInfo && r.target_type !== 'user' && r.target_type !== 'comment' && (
                        <Link
                          href={typeInfo.href(r.target_id)}
                          target="_blank"
                          className="text-[10px] text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition shrink-0"
                        >
                          콘텐츠 보기 →
                        </Link>
                      )}
                    </div>

                    {/* 날짜 */}
                    <span className="text-stone-400 dark:text-white/25 text-xs shrink-0">{fmt(r.created_at)}</span>
                  </div>

                  {/* 신고자 */}
                  <div className="mt-2 text-stone-400 dark:text-white/30 text-xs">
                    신고자: {r.reporter_profile?.username ?? r.reporter_profile?.full_name ?? '회원'}
                  </div>

                  {/* 상세 내용 */}
                  {r.detail && (
                    <p className="mt-2 text-stone-500 dark:text-white/50 text-sm bg-black/3 dark:bg-white/3 rounded-xl px-4 py-2.5 leading-relaxed">
                      {r.detail}
                    </p>
                  )}

                  {/* 액션 버튼 (미처리 상태만) */}
                  {r.status === 'pending' && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <button
                        onClick={() => deleteContent(r)}
                        disabled={processing === r.id}
                        className="px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/25 transition disabled:opacity-50"
                      >
                        콘텐츠 삭제 + 처리완료
                      </button>
                      <button
                        onClick={() => resolve(r.id)}
                        disabled={processing === r.id}
                        className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50"
                      >
                        처리완료 (콘텐츠 유지)
                      </button>
                      <button
                        onClick={() => dismiss(r.id)}
                        disabled={processing === r.id}
                        className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/30 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 hover:text-stone-500 dark:hover:text-white/50 transition disabled:opacity-50"
                      >
                        신고 무시
                      </button>
                      <button
                        onClick={() => unbanUser(r.target_type, r.target_id)}
                        disabled={processing === r.id}
                        className="px-4 py-2 rounded-xl border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition disabled:opacity-50"
                      >
                        제재 해제
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
