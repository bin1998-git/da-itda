'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const CATS = [
  { value: 'order',    label: '주문/결제' },
  { value: 'shipping', label: '배송' },
  { value: 'product',  label: '상품' },
  { value: 'general',  label: '기타' },
];

export default function InquiryWritePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [form, setForm] = useState({ category: 'general', title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth/login');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (form.content.trim().length < 10) { setError('내용을 10자 이상 입력해주세요.'); return; }

    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('inquiries').insert({
      user_id:  user.id,
      title:    form.title.trim(),
      content:  form.content.trim(),
      category: form.category,
    });
    setSubmitting(false);
    if (err) { setError('문의 등록에 실패했습니다: ' + err.message); return; }
    router.push('/inquiry');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/inquiry" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition mb-8">
          ← 문의 내역
        </Link>

        <div className="mb-8">
          <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-1">1:1 문의</p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">문의 작성</h1>
          <p className="text-stone-500 dark:text-white/35 text-sm mt-1">영업일 기준 1~2일 내 답변드립니다</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 카테고리 */}
          <div>
            <label className="text-stone-500 dark:text-white/45 text-sm mb-2 block">문의 유형</label>
            <div className="flex gap-2 flex-wrap">
              {CATS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    form.category === c.value
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : 'border-black/8 dark:border-white/8 text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-stone-500 dark:text-white/45 text-sm mb-2 block">제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="문의 제목을 입력해주세요"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition"
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="text-stone-500 dark:text-white/45 text-sm mb-2 block">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="문의 내용을 자세히 작성해주세요 (주문번호, 상품명 등을 포함하면 빠른 처리가 가능합니다)"
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
            />
            <p className="text-stone-300 dark:text-white/20 text-xs mt-1 text-right">{form.content.length}자</p>
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '문의 등록'}
            </button>
            <Link
              href="/inquiry"
              className="px-6 py-3 rounded-xl border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 text-sm hover:bg-black/5 dark:hover:bg-white/5 hover:text-stone-700 dark:hover:text-white/70 transition"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
