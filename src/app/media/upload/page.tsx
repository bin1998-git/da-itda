'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const TAG_SUGGESTIONS = ['한식', '양식', '중식', '일식', '베이킹', '디저트', '다이어트', '간식', '파티', '빠른요리'];

export default function MediaUploadPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 dark:text-white/60 mb-4">로그인이 필요합니다</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-3 rounded-full bg-rose-500 text-white font-bold"
          >
            로그인하기
          </button>
        </div>
      </main>
    );
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim().replace(/^#/, '');
    if (!trimmed || form.tags.includes(trimmed) || form.tags.length >= 5) return;
    setForm((f) => ({ ...f, tags: [...f.tags, trimmed] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.video_url) {
      setError('제목과 영상 URL은 필수입니다.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('media_posts').insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      video_url: form.video_url,
      thumbnail_url: form.thumbnail_url || null,
      tags: form.tags,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/media');
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-rose-400 text-xs font-semibold tracking-widest uppercase mb-1">푸드 미디어</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">영상 올리기</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">나만의 레시피 영상을 공유해보세요</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">제목 *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="예: 집에서 만드는 파스타 레시피"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-rose-500/50 transition"
            />
          </div>

          {/* 영상 URL */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">영상 URL *</label>
            <input
              value={form.video_url}
              onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
              placeholder="https://... (MP4, Higgsfield 영상 URL)"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-rose-500/50 transition"
            />
          </div>

          {/* 썸네일 URL */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">썸네일 URL (선택)</label>
            <input
              value={form.thumbnail_url}
              onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
              placeholder="https://... (이미지 URL)"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-rose-500/50 transition"
            />
          </div>

          {/* 설명 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">설명 (선택)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="레시피 소개, 재료, 조리 과정 등..."
              rows={4}
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-rose-500/50 transition resize-none"
            />
          </div>

          {/* 태그 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">태그 (최대 5개)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-rose-300">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                placeholder="태그 입력 후 Enter"
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-rose-500/50 transition text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              {TAG_SUGGESTIONS.filter((t) => !form.tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="text-[11px] text-stone-400 dark:text-white/30 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10 hover:border-rose-500/30 transition"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-full border border-white/20 text-stone-600 dark:text-white/60 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-rose-500 text-white text-sm font-bold hover:bg-rose-400 transition disabled:opacity-50"
            >
              {loading ? '업로드 중...' : '영상 올리기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
