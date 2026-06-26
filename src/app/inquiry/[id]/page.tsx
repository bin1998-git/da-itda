'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  file_urls?: string[];
}

const CAT_LABEL: Record<string, string> = {
  order: '주문/결제', shipping: '배송', product: '상품', general: '기타',
};
const STATUS_STYLE: Record<string, string> = {
  pending:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  answered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};
const STATUS_LABEL: Record<string, string> = {
  pending: '답변 대기 중', answered: '답변 완료',
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function InquiryDetailPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode]     = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }

    supabase
      .from('inquiries')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (!data) { router.replace('/inquiry'); return; }
        setInquiry(data as Inquiry);
        setLoading(false);
      });
  }, [user, isLoading, params.id, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('inquiries')
      .update({ content: editContent.trim() })
      .eq('id', params.id);
    setSaving(false);
    if (error) { alert('수정 실패: ' + error.message); return; }
    setInquiry((prev) => prev ? { ...prev, content: editContent.trim() } : prev);
    setEditMode(false);
  };

  const handleDelete = async () => {
    if (!confirm('문의를 삭제하시겠습니까?')) return;
    setDeleting(true);
    await supabase.from('inquiries').delete().eq('id', params.id);
    router.push('/inquiry');
  };

  if (!inquiry) return null;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link href="/inquiry" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
            ← 문의 내역
          </Link>
          {/* 미답변 상태일 때만 수정/삭제 가능 */}
          {inquiry.status === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditMode(true); setEditContent(inquiry.content); }}
                className="px-4 py-1.5 rounded-xl border border-sky-500/30 text-sky-400 text-xs font-semibold hover:bg-sky-500/10 transition"
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
              {CAT_LABEL[inquiry.category] ?? '기타'}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[inquiry.status] ?? STATUS_STYLE.pending}`}>
              {STATUS_LABEL[inquiry.status] ?? '처리 중'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white leading-snug">{inquiry.title}</h1>
          <p className="text-stone-400 dark:text-white/30 text-xs mt-2">{fmt(inquiry.created_at)}</p>
        </div>

        {/* 문의 내용 */}
        <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 mb-6">
          <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase mb-3">문의 내용</p>
          {editMode ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleEdit} disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition disabled:opacity-40">
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => setEditMode(false)}
                  className="px-5 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{inquiry.content}</p>
          )}
        </div>

        {/* 첨부파일 */}
        {inquiry.file_urls?.length ? (
          <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-5 mb-6">
            <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase mb-3">첨부파일</p>
            <div className="flex flex-col gap-2">
              {inquiry.file_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-sky-400 hover:text-sky-300 underline underline-offset-2">
                  📎 {decodeURIComponent(url.split('/').pop() ?? '').replace(/^\d+_/, '')}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* 답변 */}
        {inquiry.status === 'answered' && inquiry.answer ? (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sky-400 text-xs font-semibold tracking-widest uppercase">관리자 답변</span>
              {inquiry.answered_at && (
                <span className="text-stone-400 dark:text-white/25 text-xs">{fmt(inquiry.answered_at)}</span>
              )}
            </div>
            <p className="text-stone-700 dark:text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{inquiry.answer}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-6 text-center">
            <p className="text-stone-400 dark:text-white/30 text-sm">아직 답변이 등록되지 않았습니다.</p>
            <p className="text-stone-300 dark:text-white/20 text-xs mt-1">영업일 기준 1~2일 내 답변드립니다.</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/inquiry" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
            목록으로
          </Link>
        </div>
      </div>
    </main>
  );
}
