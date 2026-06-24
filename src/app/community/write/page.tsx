'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const CATEGORIES = [
  { value: 'recipe',   label: '레시피', desc: '나만의 레시피 공유' },
  { value: 'review',   label: '후기',   desc: '상품·식당 리뷰' },
  { value: 'question', label: '질문',   desc: '요리 고민 상담' },
  { value: 'general',  label: '자유',   desc: '자유롭게 이야기' },
];

export default function CommunityWritePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">로그인이 필요합니다</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-3 rounded-full bg-emerald-500 text-black font-bold"
          >
            로그인하기
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('posts')
      .insert({ user_id: user.id, title: title.trim(), content: content.trim(), category })
      .select('id')
      .single();

    setLoading(false);
    if (err || !data) { setError(err?.message ?? '오류가 발생했습니다.'); return; }
    router.push(`/community/${data.id}`);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">커뮤니티</p>
          <h1 className="text-3xl font-bold text-white">글 쓰기</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 카테고리 */}
          <div className="flex flex-col gap-2">
            <label className="text-white/60 text-sm font-medium">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`py-3 rounded-xl border text-center transition flex flex-col gap-0.5 items-center ${
                    category === c.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  <span className="text-sm font-semibold">{c.label}</span>
                  <span className="text-[10px] text-inherit opacity-60">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-white/60 text-sm font-medium">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-2">
            <label className="text-white/60 text-sm font-medium">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={10}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition resize-none"
            />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-full border border-white/20 text-white/60 text-sm font-semibold hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {loading ? '등록 중...' : '게시하기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
