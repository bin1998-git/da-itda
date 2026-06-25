'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
}

const CATS = [
  { value: 'general', label: '공지' },
  { value: 'update',  label: '업데이트' },
  { value: 'event',   label: '이벤트' },
];
const CAT_STYLE: Record<string, string> = {
  general: 'text-violet-400 bg-violet-500/10',
  update:  'text-sky-400 bg-sky-500/10',
  event:   'text-pink-400 bg-pink-500/10',
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });

interface WriteForm {
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
}

const emptyForm: WriteForm = { title: '', content: '', category: 'general', is_pinned: false };

export default function AdminNoticesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // write/edit form
  const [mode, setMode] = useState<'list' | 'write' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WriteForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notices')
      .select('id, title, content, category, is_pinned, view_count, created_at')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setNotices((data ?? []) as Notice[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }

    supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
      if (!data || data.role !== 'admin') { router.replace('/'); return; }
      load();
    });
  }, [user, isLoading, router, load]);

  const openWrite = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setMode('write');
  };

  const openEdit = (n: Notice) => {
    setForm({ title: n.title, content: n.content, category: n.category, is_pinned: n.is_pinned });
    setEditingId(n.id);
    setError('');
    setMode('edit');
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!form.content.trim()) { setError('내용을 입력해주세요.'); return; }
    setSaving(true);
    setError('');

    if (mode === 'write') {
      const { error: err } = await supabase.from('notices').insert({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_pinned: form.is_pinned,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('notices').update({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_pinned: form.is_pinned,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId!);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setMode('list');
    load();
  };

  const togglePin = async (id: string, current: boolean) => {
    await supabase.from('notices').update({ is_pinned: !current }).eq('id', id);
    setNotices((prev) => prev.map((n) => n.id === id ? { ...n, is_pinned: !current } : n));
  };

  const deleteNotice = async (id: string) => {
    if (!confirm('공지사항을 삭제할까요?')) return;
    await supabase.from('notices').delete().eq('id', id);
    setNotices((prev) => prev.filter((n) => n.id !== id));
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
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-white/30 hover:text-white/60 transition text-sm">← 관리자</Link>
          <span className="text-white/15">/</span>
          <h1 className="text-xl font-bold text-white">공지사항 관리</h1>
          <span className="ml-auto">
            {mode === 'list' ? (
              <button
                onClick={openWrite}
                className="px-5 py-2.5 rounded-xl bg-violet-500 text-white font-semibold text-sm hover:bg-violet-400 transition"
              >
                + 공지 작성
              </button>
            ) : (
              <button
                onClick={() => setMode('list')}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition"
              >
                ← 목록
              </button>
            )}
          </span>
        </div>

        {/* 작성/수정 폼 */}
        {(mode === 'write' || mode === 'edit') && (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-8">
            <h2 className="text-white font-semibold mb-5">{mode === 'write' ? '새 공지 작성' : '공지 수정'}</h2>

            <div className="flex flex-col gap-4">
              {/* 카테고리 */}
              <div>
                <label className="text-white/40 text-xs mb-2 block">카테고리</label>
                <div className="flex gap-2">
                  {CATS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                      className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition ${
                        form.category === c.value
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'border-white/8 text-white/40 hover:text-white/60 hover:bg-white/5'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 고정 여부 */}
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <div
                  onClick={() => setForm((f) => ({ ...f, is_pinned: !f.is_pinned }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.is_pinned ? 'bg-amber-500' : 'bg-white/15'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.is_pinned ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-white/50 text-sm">상단 고정</span>
              </label>

              {/* 제목 */}
              <div>
                <label className="text-white/40 text-xs mb-2 block">제목</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="공지 제목"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/40 transition"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="text-white/40 text-xs mb-2 block">내용</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="공지 내용을 입력하세요"
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/40 transition resize-none"
                />
              </div>

              {error && <p className="text-rose-400 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-violet-500 text-white font-semibold text-sm hover:bg-violet-400 transition disabled:opacity-50"
                >
                  {saving ? '저장 중...' : mode === 'write' ? '공지 등록' : '수정 저장'}
                </button>
                <button
                  onClick={() => setMode('list')}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 목록 */}
        {notices.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-white/2 p-16 text-center">
            <span className="text-5xl block mb-4">📢</span>
            <p className="text-white/40 text-sm">등록된 공지사항이 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notices.map((n) => (
              <div key={n.id} className={`rounded-xl border bg-white/2 p-4 flex items-center gap-3 ${n.is_pinned ? 'border-amber-500/20' : 'border-white/6'}`}>
                {n.is_pinned && <span className="text-sm shrink-0">📌</span>}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${CAT_STYLE[n.category] ?? ''}`}>
                  {CATS.find((c) => c.value === n.category)?.label}
                </span>
                <p className="text-white/70 text-sm flex-1 truncate">{n.title}</p>
                <div className="flex items-center gap-2 shrink-0 text-white/25 text-xs">
                  <span>조회 {n.view_count}</span>
                  <span>{fmt(n.created_at)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(n.id, n.is_pinned)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition ${
                      n.is_pinned
                        ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/8'
                        : 'border-white/10 text-white/30 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {n.is_pinned ? '고정해제' : '고정'}
                  </button>
                  <button
                    onClick={() => openEdit(n)}
                    className="px-2.5 py-1 rounded-lg text-xs border border-white/10 text-white/30 hover:text-white/60 hover:bg-white/5 transition"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteNotice(n.id)}
                    className="px-2.5 py-1 rounded-lg text-xs border border-transparent text-white/20 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/8 transition"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
