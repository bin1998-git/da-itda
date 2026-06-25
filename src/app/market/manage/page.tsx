'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Category } from '@/types/market';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: Category;
  images: string[];
  stock: number;
  is_active: boolean;
  created_at: string;
}

const CAT_LABEL: Record<string, string> = {
  food: '신선식품', kitchen: '주방용품', snack: '간식', drink: '음료',
};
const CAT_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃',
};
const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'food', label: '신선식품' },
  { value: 'kitchen', label: '주방용품' },
  { value: 'snack', label: '간식' },
  { value: 'drink', label: '음료' },
];

interface EditForm {
  title: string;
  description: string;
  price: string;
  stock: string;
  category: Category;
  imageUrl: string;
}

export default function ManagePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState<boolean | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', price: '', stock: '', category: 'food', imageUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: seller } = await supabase.from('sellers').select('id').eq('id', uid).maybeSingle();
    if (!seller) { setIsSeller(false); setLoading(false); return; }
    setIsSeller(true);
    const { data } = await supabase
      .from('products')
      .select('id, title, description, price, category, images, stock, is_active, created_at')
      .eq('seller_id', uid)
      .order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    load(user.id);
  }, [user, isLoading, router, load]);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({
      title: p.title,
      description: p.description ?? '',
      price: String(p.price),
      stock: String(p.stock),
      category: p.category,
      imageUrl: p.images[0] ?? '',
    });
    setError('');
  };

  const cancelEdit = () => { setEditingId(null); setError(''); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('products').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      price: Number(editForm.price),
      stock: Number(editForm.stock),
      category: editForm.category,
      images: editForm.imageUrl.trim() ? [editForm.imageUrl.trim()] : [],
    }).eq('id', id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setProducts((prev) => prev.map((p) => p.id !== id ? p : {
      ...p,
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      price: Number(editForm.price),
      stock: Number(editForm.stock),
      category: editForm.category,
      images: editForm.imageUrl.trim() ? [editForm.imageUrl.trim()] : [],
    }));
    setEditingId(null);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('products').update({ is_active: !current }).eq('id', id);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !current } : p));
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('상품을 삭제하면 복구할 수 없습니다. 삭제할까요?')) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isSeller === false) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <span className="text-5xl block mb-4">🏪</span>
          <h2 className="text-xl font-bold text-white mb-2">판매자 등록이 필요합니다</h2>
          <p className="text-white/40 text-sm mb-6">먼저 판매자 등록 후 상품을 관리할 수 있습니다.</p>
          <Link href="/market/sell"
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
          >
            판매자 등록하기 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-[60px]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">내 상품 관리</h1>
            <p className="text-white/35 text-sm mt-1">{products.length}개 상품 등록됨</p>
          </div>
          <Link href="/market/sell"
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
          >
            + 새 상품 등록
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-white/2 p-16 text-center">
            <span className="text-5xl block mb-4">📦</span>
            <p className="text-white/40 text-sm mb-4">아직 등록한 상품이 없습니다.</p>
            <Link href="/market/sell"
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
            >
              첫 상품 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <div key={p.id}
                className={`rounded-2xl border bg-white/2 overflow-hidden transition ${
                  p.is_active ? 'border-white/8' : 'border-white/4 opacity-60'
                }`}
              >
                {/* 상품 행 */}
                <div className="flex items-center gap-4 p-4">
                  {/* 썸네일 */}
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {p.images[0]
                      ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                      : CAT_EMOJI[p.category] ?? '📦'}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium text-sm truncate">{p.title}</p>
                      <span className="text-[10px] text-white/30 bg-white/6 rounded-full px-2 py-0.5 shrink-0">
                        {CAT_LABEL[p.category]}
                      </span>
                      {!p.is_active && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 rounded-full px-2 py-0.5 border border-rose-500/20 shrink-0">비공개</span>
                      )}
                    </div>
                    <p className="text-amber-400 font-bold text-sm mt-0.5">{p.price.toLocaleString('ko-KR')}원</p>
                    <p className="text-white/30 text-xs mt-0.5">재고 {p.stock}개</p>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        p.is_active
                          ? 'border-white/10 text-white/40 hover:text-white hover:bg-white/6'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/8'
                      }`}
                    >
                      {p.is_active ? '비공개' : '공개'}
                    </button>
                    <button
                      onClick={() => editingId === p.id ? cancelEdit() : startEdit(p)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/40 hover:text-white hover:bg-white/6 transition"
                    >
                      {editingId === p.id ? '취소' : '수정'}
                    </button>
                    <Link
                      href={`/market/${p.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/40 hover:text-white hover:bg-white/6 transition"
                    >
                      보기
                    </Link>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent text-white/20 hover:text-rose-400 hover:bg-rose-500/8 hover:border-rose-500/20 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 수정 폼 (인라인 확장) */}
                {editingId === p.id && (
                  <div className="border-t border-white/6 bg-white/[0.02] px-4 py-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-white/40 text-xs mb-1.5 block">상품명</label>
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition placeholder-white/20"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-white/40 text-xs mb-1.5 block">상품 설명</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition resize-none placeholder-white/20"
                        />
                      </div>
                      <div>
                        <label className="text-white/40 text-xs mb-1.5 block">가격 (원)</label>
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition"
                        />
                      </div>
                      <div>
                        <label className="text-white/40 text-xs mb-1.5 block">재고</label>
                        <input
                          type="number"
                          value={editForm.stock}
                          onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition"
                        />
                      </div>
                      <div>
                        <label className="text-white/40 text-xs mb-1.5 block">카테고리</label>
                        <div className="flex gap-2 flex-wrap">
                          {CATEGORIES.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditForm((f) => ({ ...f, category: c.value }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                                editForm.category === c.value
                                  ? 'bg-amber-500 border-amber-500 text-black'
                                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-white/40 text-xs mb-1.5 block">이미지 URL</label>
                        <input
                          type="url"
                          value={editForm.imageUrl}
                          onChange={(e) => setEditForm((f) => ({ ...f, imageUrl: e.target.value }))}
                          placeholder="https://..."
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition placeholder-white/20"
                        />
                      </div>
                    </div>
                    {error && <p className="text-rose-400 text-xs mt-3">{error}</p>}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => saveEdit(p.id)}
                        disabled={saving || !editForm.title.trim()}
                        className="px-5 py-2 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition disabled:opacity-50"
                      >
                        {saving ? '저장 중...' : '저장하기'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-5 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5 transition"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
