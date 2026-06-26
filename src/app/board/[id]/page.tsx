// src/app/board/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface BoardPost {
  id: string;
  title: string;
  content: string;
  file_urls: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function fileName(url: string) {
  return decodeURIComponent(url.split('/').pop() ?? url).replace(/^\d+_/, '');
}

export default function BoardDetailPage() {
  const params   = useParams<{ id: string }>();
  const router   = useRouter();
  const isAdmin  = useAuthStore((s) => s.isAdmin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [post, setPost]       = useState<BoardPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase
      .from('board_posts')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (!data) { router.replace('/board'); return; }
        setPost(data as BoardPost);
        setLoading(false);
        supabase.rpc('increment_board_view', { post_id: params.id });
      });
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    setDeleting(true);
    await supabase.from('board_posts').delete().eq('id', params.id);
    router.push('/board');
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link href="/board" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
            ← 게시판
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href={`/board/write?id=${post.id}`}
                className="px-4 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/10 transition"
              >
                수정
              </Link>
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

        <h1 className="text-2xl font-bold text-stone-900 dark:text-white leading-snug mb-3">{post.title}</h1>
        <div className="flex items-center gap-3 text-stone-400 dark:text-white/30 text-xs mb-8">
          <span>{fmt(post.created_at)}</span>
          {post.updated_at !== post.created_at && <span>· 수정됨 {fmt(post.updated_at)}</span>}
          <span>· 조회 {post.view_count}</span>
        </div>

        <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 mb-6">
          <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        {post.file_urls.length > 0 && (
          <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-5">
            <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase mb-3">첨부파일</p>
            <div className="flex flex-col gap-2">
              {post.file_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-indigo-400 hover:text-indigo-300 transition group"
                >
                  <svg className="w-4 h-4 shrink-0 text-indigo-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="underline underline-offset-2 group-hover:underline">{fileName(url)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/board" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
            목록으로
          </Link>
        </div>
      </div>
    </main>
  );
}
