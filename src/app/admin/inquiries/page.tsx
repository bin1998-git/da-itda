'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Inquiry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null; email?: string } | null;
}

const CAT_LABEL: Record<string, string> = {
  order: '주문/결제', shipping: '배송', product: '상품', general: '기타',
};
const STATUS_STYLE: Record<string, string> = {
  pending:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  answered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};
const STATUS_LABEL: Record<string, string> = {
  pending: '답변 대기', answered: '답변 완료',
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminInquiriesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('pending');

  // 확장된 항목 & 답변 작성
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    let query = supabase
      .from('inquiries')
      .select('id, user_id, title, content, category, status, answer, answered_at, created_at, profiles(full_name, username)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data } = await query;
    setInquiries((data ?? []).map((d: any) => ({ ...d, profiles: d.profiles })) as Inquiry[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }

    supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
      if (!data || data.role !== 'admin') { router.replace('/'); return; }
      load();
    });
  }, [user, isLoading, router, load]);

  useEffect(() => {
    if (!loading) {
      setLoading(true);
      load();
    }
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id: string, currentAnswer: string | null) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setAnswerText(currentAnswer ?? '');
  };

  const submitAnswer = async (id: string) => {
    if (!answerText.trim()) return;
    setSaving(true);
    await supabase.from('inquiries').update({
      answer: answerText.trim(),
      status: 'answered',
      answered_at: new Date().toISOString(),
    }).eq('id', id);
    setSaving(false);
    setExpandedId(null);
    setInquiries((prev) => prev.map((q) =>
      q.id === id ? { ...q, status: 'answered', answer: answerText.trim(), answered_at: new Date().toISOString() } : q,
    ));
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Link href="/admin" className="text-white/30 hover:text-white/60 transition text-sm">← 관리자</Link>
          <span className="text-white/15">/</span>
          <h1 className="text-xl font-bold text-white">1:1 문의 관리</h1>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-6">
          {([['pending', '답변 대기'], ['all', '전체'], ['answered', '답변 완료']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                filter === key
                  ? key === 'pending'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                  : 'border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {inquiries.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-white/2 p-16 text-center">
            <span className="text-5xl block mb-4">💬</span>
            <p className="text-white/40 text-sm">
              {filter === 'pending' ? '미답변 문의가 없습니다' : '문의 내역이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {inquiries.map((q) => {
              const isExpanded = expandedId === q.id;
              return (
                <div key={q.id} className={`rounded-2xl border bg-white/2 overflow-hidden transition ${isExpanded ? 'border-sky-500/25' : 'border-white/6'}`}>
                  {/* 헤더 행 */}
                  <button
                    onClick={() => toggleExpand(q.id, q.answer)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/2 transition"
                  >
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                      {CAT_LABEL[q.category] ?? '기타'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[q.status] ?? STATUS_STYLE.pending}`}>
                      {STATUS_LABEL[q.status] ?? '처리 중'}
                    </span>
                    <p className="text-white/75 text-sm flex-1 truncate text-left">{q.title}</p>
                    <div className="flex items-center gap-3 shrink-0 text-white/25 text-xs">
                      <span>{q.profiles?.username ?? q.profiles?.full_name ?? '회원'}</span>
                      <span>{fmt(q.created_at)}</span>
                    </div>
                    <span className={`text-white/30 text-sm transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                  </button>

                  {/* 확장 영역 */}
                  {isExpanded && (
                    <div className="border-t border-white/6 px-4 py-5 space-y-4">
                      {/* 문의 내용 */}
                      <div>
                        <p className="text-white/25 text-xs font-semibold tracking-widest uppercase mb-2">문의 내용</p>
                        <p className="text-white/65 text-sm leading-relaxed whitespace-pre-wrap bg-white/3 rounded-xl p-4">
                          {q.content}
                        </p>
                      </div>

                      {/* 기존 답변 (있으면) */}
                      {q.answer && (
                        <div>
                          <p className="text-white/25 text-xs font-semibold tracking-widest uppercase mb-2">기존 답변</p>
                          <p className="text-emerald-400/80 text-sm leading-relaxed whitespace-pre-wrap bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/15">
                            {q.answer}
                          </p>
                        </div>
                      )}

                      {/* 답변 작성 */}
                      <div>
                        <p className="text-white/25 text-xs font-semibold tracking-widest uppercase mb-2">
                          {q.answer ? '답변 수정' : '답변 작성'}
                        </p>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="답변을 입력하세요"
                          rows={5}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
                        />
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => submitAnswer(q.id)}
                            disabled={saving || !answerText.trim()}
                            className="px-5 py-2 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition disabled:opacity-50"
                          >
                            {saving ? '저장 중...' : q.answer ? '답변 수정' : '답변 등록'}
                          </button>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="px-5 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5 transition"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
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
