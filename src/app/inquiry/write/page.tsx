'use client';

import { useState, useEffect, useRef } from 'react';
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
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form, setForm]       = useState({ category: 'general', title: '', content: '' });
  const [files, setFiles]     = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth/login');
  }, [user, isLoading, router]);

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('inquiry-files').upload(path, file);
      if (upErr) throw new Error('파일 업로드 실패: ' + upErr.message);
      const { data } = supabase.storage.from('inquiry-files').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (form.content.trim().length < 10) { setError('내용을 10자 이상 입력해주세요.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const file_urls = await uploadFiles();
      const { error: err } = await supabase.from('inquiries').insert({
        user_id:   user.id,
        title:     form.title.trim(),
        content:   form.content.trim(),
        category:  form.category,
        file_urls,
      });
      if (err) throw err;
      router.push('/inquiry');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '문의 등록에 실패했습니다.');
      setSubmitting(false);
    }
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
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-8">1:1 문의하기</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">문의 유형</label>
            <div className="flex gap-2 flex-wrap">
              {CATS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    form.category === c.value
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="문의 제목을 입력해주세요"
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition"
            />
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="문의 내용을 자세히 입력해주세요 (10자 이상)"
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
            />
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">파일첨부 (선택)</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-stone-400 dark:text-white/30 text-sm hover:border-sky-500/40 hover:text-sky-400 transition"
            >
              📎 파일 선택 (복수 선택 가능)
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {files.map((f, i) => <p key={i} className="text-xs text-stone-400 dark:text-white/30 px-1">📄 {f.name}</p>)}
              </div>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-400 transition disabled:opacity-40"
          >
            {submitting ? '접수 중...' : '문의 접수하기'}
          </button>
        </form>
      </div>
    </main>
  );
}
