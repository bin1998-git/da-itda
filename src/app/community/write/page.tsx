'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COMMUNITY_CATEGORIES } from '@/types/community';

function CommunityWriteContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get('id');
  const user         = useAuthStore((s) => s.user);
  const isLoading    = useAuthStore((s) => s.isLoading);

  const [category,    setCategory]    = useState('general');
  const [subcategory, setSubcategory] = useState('');
  const [title,       setTitle]       = useState('');
  const [content,     setContent]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(!!editId);
  const [error,       setError]       = useState('');

  const activeCat = COMMUNITY_CATEGORIES.find((c) => c.value === category);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!editId) return;

    supabase
      .from('posts')
      .select('title, content, category, subcategory, user_id')
      .eq('id', editId)
      .single()
      .then(({ data }) => {
        if (!data || data.user_id !== user.id) { router.replace('/community'); return; }
        setTitle(data.title);
        setContent(data.content);
        setCategory(data.category);
        setSubcategory(data.subcategory ?? '');
        setInitLoading(false);
      });
  }, [editId, user, isLoading, router]);

  // 카테고리 변경 시 서브카테고리 초기화
  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setSubcategory('');
  };

  if (isLoading || initLoading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError('제목과 내용을 입력해주세요.'); return; }
    setLoading(true);
    setError('');

    const payload = {
      title:      title.trim(),
      content:    content.trim(),
      category,
      subcategory: subcategory || null,
    };

    if (editId) {
      const { error: err } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', editId)
        .eq('user_id', user.id);
      setLoading(false);
      if (err) { setError(err.message); return; }
      router.push(`/community/${editId}`);
      router.refresh();
    } else {
      const { data, error: err } = await supabase
        .from('posts')
        .insert({ user_id: user.id, ...payload })
        .select('id')
        .single();
      setLoading(false);
      if (err || !data) { setError(err?.message ?? '오류가 발생했습니다.'); return; }
      router.push(`/community/${data.id}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">커뮤니티</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
            {editId ? '글 수정' : '글 쓰기'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 카테고리 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {COMMUNITY_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleCategoryChange(c.value)}
                  className={`py-3 rounded-xl border text-center transition flex flex-col gap-0.5 items-center ${
                    category === c.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 서브카테고리 (subcategories가 있는 카테고리만) */}
          {activeCat?.subcategories && (
            <div className="flex flex-col gap-2">
              <label className="text-stone-600 dark:text-white/60 text-sm font-medium">
                세부 분류 <span className="text-stone-400 dark:text-white/30 font-normal">(선택)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSubcategory('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                    !subcategory
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  선택 안 함
                </button>
                {activeCat.subcategories.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubcategory(sub)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                      subcategory === sub
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={10}
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition resize-none"
            />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-full border border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {loading ? (editId ? '수정 중...' : '등록 중...') : (editId ? '수정하기' : '게시하기')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CommunityWritePage() {
  return (
    <Suspense>
      <CommunityWriteContent />
    </Suspense>
  );
}
