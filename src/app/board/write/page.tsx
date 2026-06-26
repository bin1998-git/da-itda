// src/app/board/write/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

function BoardWriteContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get('id');
  const isAdmin      = useAuthStore((s) => s.isAdmin);
  const isLoading    = useAuthStore((s) => s.isLoading);
  const fileRef      = useRef<HTMLInputElement>(null);

  const [form, setForm]             = useState({ title: '', content: '' });
  const [existingUrls, setExisting] = useState<string[]>([]);
  const [newFiles, setNewFiles]     = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!isLoading && !isAdmin) { router.replace('/'); return; }
    if (editId) {
      supabase.from('board_posts').select('title, content, file_urls').eq('id', editId).single()
        .then(({ data }) => {
          if (data) {
            setForm({ title: data.title, content: data.content });
            setExisting(data.file_urls as string[]);
          }
        });
    }
  }, [isAdmin, isLoading, editId, router]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFiles(Array.from(e.target.files ?? []));
  };

  const removeExisting = (url: string) => {
    setExisting((prev) => prev.filter((u) => u !== url));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploaded: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split('.').pop() ?? 'bin';
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const path = user ? `${user.id}/${safeName}` : safeName;
      const { error: upErr } = await supabase.storage.from('board-files').upload(path, file);
      if (upErr) throw new Error('파일 업로드 실패: ' + upErr.message);
      const { data } = supabase.storage.from('board-files').getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!form.content.trim()) { setError('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const newUrls = await uploadFiles();
      const file_urls = [...existingUrls, ...newUrls];

      if (editId) {
        const { error: err } = await supabase
          .from('board_posts')
          .update({ title: form.title.trim(), content: form.content.trim(), file_urls })
          .eq('id', editId);
        if (err) throw err;
        router.push(`/board/${editId}`);
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        const { data, error: err } = await supabase
          .from('board_posts')
          .insert({ author_id: user!.id, title: form.title.trim(), content: form.content.trim(), file_urls })
          .select('id')
          .single();
        if (err) throw err;
        router.push(`/board/${data.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href={editId ? `/board/${editId}` : '/board'} className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition mb-8">
          ← {editId ? '상세로' : '게시판'}
        </Link>

        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-8">
          {editId ? '게시글 수정' : '새 게시글 작성'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="제목을 입력해주세요"
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40 transition"
            />
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="내용을 입력해주세요"
              rows={12}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40 transition resize-none"
            />
          </div>

          {/* 파일첨부 */}
          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">파일첨부</label>

            {existingUrls.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-3">
                {existingUrls.map((url, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8">
                    <span className="text-xs text-stone-500 dark:text-white/50 truncate">
                      {decodeURIComponent(url.split('/').pop() ?? url).replace(/^\d+_/, '')}
                    </span>
                    <button type="button" onClick={() => removeExisting(url)} className="text-rose-400 text-xs hover:text-rose-300 shrink-0">삭제</button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-stone-400 dark:text-white/30 text-sm hover:border-indigo-500/40 hover:text-indigo-400 transition"
            >
              📎 파일 선택 (복수 선택 가능)
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />

            {newFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {newFiles.map((f, i) => (
                  <p key={i} className="text-xs text-stone-400 dark:text-white/30 px-1">📄 {f.name}</p>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-400 transition disabled:opacity-40"
          >
            {submitting ? '저장 중...' : editId ? '수정하기' : '게시하기'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function BoardWritePage() {
  return (
    <Suspense>
      <BoardWriteContent />
    </Suspense>
  );
}
