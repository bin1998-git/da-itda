'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Inquiry {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  file_urls: string[];
  user_profile?: { username: string | null; full_name: string | null; email?: string } | null;
}

const CAT_LABEL: Record<string, string> = {
  order: '주문/결제', shipping: '배송', product: '상품', general: '기타',
};
const STATUS_STYLE: Record<string, string> = {
  pending:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  answered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminInquiriesPage() {
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);
  const isAdmin  = useAuthStore((s) => s.isAdmin);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'pending' | 'answered' | 'all'>('pending');
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('inquiries')
      .select('*, profiles!user_id(username, full_name)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setInquiries(
      (data ?? []).map((d: Record<string, unknown>) => ({ ...d, user_profile: d.profiles })) as Inquiry[],
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) { router.replace('/'); return; }
    load();
  }, [user, isLoading, isAdmin, router, load]);

  const submitAnswer = async (id: string) => {
    const answer = (answerMap[id] ?? '').trim();
    if (!answer) return;
    setProcessing(id);
    await supabase.from('inquiries').update({
      answer,
      status: 'answered',
      answered_at: new Date().toISOString(),
    }).eq('id', id);
    setProcessing(null);
    setAnswerMap((m) => { const n = { ...m }; delete n[id]; return n; });
    await load();
  };

  const deleteInquiry = async (id: string) => {
    if (!confirm('이 문의를 삭제하시겠습니까?')) return;
    setProcessing(id);
    await supabase.from('inquiries').delete().eq('id', id);
    setProcessing(null);
    await load();
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-1">ADMIN</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">1:1 문의 관리</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">접수된 문의를 확인하고 답변해주세요</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {(['pending', 'answered', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                filter === f
                  ? f === 'pending'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : f === 'answered'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                  : 'border-black/8 dark:border-white/8 text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {f === 'pending' ? '미답변' : f === 'answered' ? '답변완료' : '전체'}
            </button>
          ))}
        </div>

        {inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">💬</span>
            <p className="text-stone-400 dark:text-white/40 text-sm">문의가 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {inquiries.map((q) => (
              <div
                key={q.id}
                className={`rounded-2xl border bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden ${
                  q.status === 'pending' ? 'border-amber-500/15' : 'border-black/6 dark:border-white/6'
                }`}
              >
                <button
                  className="w-full p-5 text-left flex items-start gap-3"
                  onClick={() => setExpanded((v) => (v === q.id ? null : q.id))}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[q.status] ?? STATUS_STYLE.pending}`}>
                        {q.status === 'pending' ? '미답변' : '답변완료'}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {CAT_LABEL[q.category] ?? '기타'}
                      </span>
                      {q.file_urls?.length > 0 && (
                        <span className="text-[10px] text-indigo-400/70">📎 {q.file_urls.length}</span>
                      )}
                    </div>
                    <p className="text-stone-800 dark:text-white/80 font-medium text-sm">{q.title}</p>
                    <div className="flex items-center gap-3 text-stone-400 dark:text-white/25 text-xs mt-1">
                      <span>{q.user_profile?.username ?? q.user_profile?.full_name ?? '회원'}</span>
                      <span>·</span>
                      <span>{fmt(q.created_at)}</span>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-stone-300 dark:text-white/20 shrink-0 mt-0.5 transition-transform ${expanded === q.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded === q.id && (
                  <div className="border-t border-black/5 dark:border-white/5 p-5 flex flex-col gap-4">
                    {/* 문의 내용 */}
                    <div className="rounded-xl bg-black/3 dark:bg-white/3 p-4">
                      <p className="text-stone-400 dark:text-white/25 text-xs font-semibold uppercase mb-2">문의 내용</p>
                      <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{q.content}</p>
                    </div>

                    {/* 파일 */}
                    {q.file_urls?.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {q.file_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                            📎 {decodeURIComponent(url.split('/').pop() ?? '').replace(/^\d+_/, '')}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* 기존 답변 */}
                    {q.answer && (
                      <div className="rounded-xl bg-sky-500/5 border border-sky-500/15 p-4">
                        <p className="text-sky-400 text-xs font-semibold uppercase mb-2">답변 내용</p>
                        <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    )}

                    {/* 답변 입력 */}
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={answerMap[q.id] ?? ''}
                        onChange={(e) => setAnswerMap((m) => ({ ...m, [q.id]: e.target.value }))}
                        placeholder={q.answer ? '답변을 수정합니다...' : '답변을 입력하세요...'}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitAnswer(q.id)}
                          disabled={!answerMap[q.id]?.trim() || processing === q.id}
                          className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition disabled:opacity-40"
                        >
                          {processing === q.id ? '저장 중...' : q.answer ? '답변 수정' : '답변 등록'}
                        </button>
                        <button
                          onClick={() => deleteInquiry(q.id)}
                          disabled={processing === q.id}
                          className="px-5 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/10 transition disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
