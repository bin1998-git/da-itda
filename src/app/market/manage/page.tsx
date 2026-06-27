'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Category } from '@/types/market';
import Pagination from '@/components/ui/Pagination';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });

const PAGE_SIZE = 10;

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
  colors: string[] | null;
  delivery_type: string | null;
  delivery_days: number | null;
  is_overseas: boolean | null;
  overseas_shipping_fee: number | null;
  packaging_type: string | null;
  sales_unit: string | null;
  weight: string | null;
  origin: string | null;
  storage_method: string | null;
  expiry_info: string | null;
  allergen_info: string | null;
  original_price: number | null;
}

const CAT_LABEL: Record<string, string> = {
  food: '신선식품', kitchen: '주방용품', snack: '간식', drink: '음료', etc: '기타',
};
const CAT_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃', etc: '📦',
};
const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'food', label: '신선식품' },
  { value: 'kitchen', label: '주방용품' },
  { value: 'snack', label: '간식' },
  { value: 'drink', label: '음료' },
  { value: 'etc', label: '기타' },
];

interface EditForm {
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  stock: string;
  category: Category;
  colors: string[];
  delivery_type: string;
  delivery_days: number | null;
  is_overseas: boolean;
  overseas_shipping_fee: string;
  packaging_type: string;
  sales_unit: string;
  weight: string;
  origin: string;
  storage_method: string;
  expiry_info: string;
  allergen_info: string;
}

const EMPTY_FORM: EditForm = {
  title: '', description: '', price: '', originalPrice: '', stock: '', category: 'food',
  colors: [],
  delivery_type: '', delivery_days: null, is_overseas: false, overseas_shipping_fee: '',
  packaging_type: '', sales_unit: '',
  weight: '', origin: '', storage_method: '', expiry_info: '', allergen_info: '',
};

export default function ManagePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState<boolean | null>(null);

  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);

  // 이미지 상태 (기존 URL + 새 파일)
  const [editImages, setEditImages] = useState<string[]>([]);       // 기존 이미지 URL
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);  // 새로 추가할 파일
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]); // 새 파일 미리보기

  // 색상 입력
  const [editColorInput, setEditColorInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: seller } = await supabase.from('sellers').select('id').eq('id', uid).maybeSingle();
    if (!seller) { setIsSeller(false); setLoading(false); return; }
    setIsSeller(true);
    const { data } = await supabase
      .from('products')
      .select(`
        id, title, description, price, original_price, category, images, stock, is_active, created_at,
        colors, delivery_type, delivery_days, is_overseas, overseas_shipping_fee,
        packaging_type, sales_unit, weight, origin, storage_method, expiry_info, allergen_info
      `)
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
      originalPrice: p.original_price?.toString() ?? '',
      stock: String(p.stock),
      category: p.category,
      colors: p.colors ?? [],
      delivery_type: p.delivery_type ?? '',
      delivery_days: p.delivery_days ?? null,
      is_overseas: p.is_overseas ?? false,
      overseas_shipping_fee: p.overseas_shipping_fee ? String(p.overseas_shipping_fee) : '',
      packaging_type: p.packaging_type ?? '',
      sales_unit: p.sales_unit ?? '',
      weight: p.weight ?? '',
      origin: p.origin ?? '',
      storage_method: p.storage_method ?? '',
      expiry_info: p.expiry_info ?? '',
      allergen_info: p.allergen_info ?? '',
    });
    setEditImages(p.images ?? []);
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setEditColorInput('');
    setError('');
  };

  const cancelEdit = () => {
    editImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setEditingId(null);
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setError('');
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    e.target.value = '';
    setError('');
    const total = editImages.length + editImageFiles.length + newFiles.length;
    if (total > 5) { setError('이미지는 최대 5장까지 추가할 수 있습니다.'); return; }
    setEditImageFiles((prev) => [...prev, ...newFiles]);
    setEditImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
  };

  const removeExistingImage = (idx: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNewImage = (idx: number) => {
    URL.revokeObjectURL(editImagePreviews[idx]);
    setEditImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const addEditColor = () => {
    const trimmed = editColorInput.trim();
    if (!trimmed || editForm.colors.includes(trimmed)) { setEditColorInput(''); return; }
    setEditForm((f) => ({ ...f, colors: [...f.colors, trimmed] }));
    setEditColorInput('');
  };

  const removeEditColor = (color: string) => {
    setEditForm((f) => ({ ...f, colors: f.colors.filter((c) => c !== color) }));
  };

  const handleDescImageUpload = async (file: File): Promise<string> => {
    if (!user) throw new Error('로그인 필요');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/desc/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
    if (uploadError) throw new Error(uploadError.message);
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const saveEdit = async (id: string) => {
    if (!user) return;
    setSaving(true);
    setError('');

    // 새 이미지 업로드
    const uploadedUrls: string[] = [];
    const timestamp = Date.now();
    for (let i = 0; i < editImageFiles.length; i++) {
      const file = editImageFiles[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${timestamp}_${i}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) { setError(`이미지 업로드 실패: ${file.name}`); setSaving(false); return; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    const finalImages = [...editImages, ...uploadedUrls];

    const { error: err } = await supabase.from('products').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      price: Number(editForm.price),
      original_price: editForm.originalPrice ? Number(editForm.originalPrice) : null,
      stock: Number(editForm.stock),
      category: editForm.category,
      images: finalImages,
      colors: editForm.colors,
      delivery_type: editForm.delivery_type || null,
      delivery_days: editForm.delivery_days,
      is_overseas: editForm.is_overseas,
      overseas_shipping_fee: editForm.is_overseas ? (Number(editForm.overseas_shipping_fee) || 0) : 0,
      packaging_type: editForm.packaging_type.trim() || null,
      sales_unit: editForm.sales_unit.trim() || null,
      weight: editForm.weight.trim() || null,
      origin: editForm.origin.trim() || null,
      storage_method: editForm.storage_method.trim() || null,
      expiry_info: editForm.expiry_info.trim() || null,
      allergen_info: editForm.allergen_info.trim() || null,
    }).eq('id', id);

    setSaving(false);
    if (err) { setError(err.message); return; }

    editImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setProducts((prev) => prev.map((p) => p.id !== id ? p : {
      ...p,
      ...editForm,
      images: finalImages,
      price: Number(editForm.price),
      original_price: editForm.originalPrice ? Number(editForm.originalPrice) : null,
      stock: Number(editForm.stock),
      delivery_days: editForm.delivery_days,
      is_overseas: editForm.is_overseas,
      overseas_shipping_fee: editForm.is_overseas ? (Number(editForm.overseas_shipping_fee) || 0) : 0,
      description: editForm.description.trim() || null,
      delivery_type: editForm.delivery_type || null,
      packaging_type: editForm.packaging_type.trim() || null,
      sales_unit: editForm.sales_unit.trim() || null,
      weight: editForm.weight.trim() || null,
      origin: editForm.origin.trim() || null,
      storage_method: editForm.storage_method.trim() || null,
      expiry_info: editForm.expiry_info.trim() || null,
      allergen_info: editForm.allergen_info.trim() || null,
    }));
    setEditingId(null);
    setEditImageFiles([]);
    setEditImagePreviews([]);
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
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isSeller === false) {
    return (
      <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <span className="text-5xl block mb-4">🏪</span>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">판매자 등록이 필요합니다</h2>
          <p className="text-stone-400 dark:text-white/40 text-sm mb-6">먼저 판매자 등록 후 상품을 관리할 수 있습니다.</p>
          <Link href="/market/sell"
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
          >
            판매자 등록하기 →
          </Link>
        </div>
      </main>
    );
  }

  const totalImages = editImages.length + editImageFiles.length;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-[60px]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">내 상품 관리</h1>
            <p className="text-stone-400 dark:text-white/35 text-sm mt-1">{products.length}개 상품 등록됨</p>
          </div>
          <Link href="/market/sell"
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
          >
            + 새 상품 등록
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-16 text-center">
            <span className="text-5xl block mb-4">📦</span>
            <p className="text-stone-400 dark:text-white/40 text-sm mb-4">아직 등록한 상품이 없습니다.</p>
            <Link href="/market/sell"
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
            >
              첫 상품 등록하기 →
            </Link>
          </div>
        ) : (() => {
          const totalPages = Math.ceil(products.length / PAGE_SIZE);
          const paged = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
          return (
          <>
          <div className="flex flex-col gap-3">
            {paged.map((p) => (
              <div key={p.id}
                className={`rounded-2xl border bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden transition ${
                  p.is_active ? 'border-black/8 dark:border-white/8' : 'border-black/4 dark:border-white/4 opacity-60'
                }`}
              >
                {/* 상품 행 */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {p.images[0]
                      ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                      : CAT_EMOJI[p.category] ?? '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-stone-900 dark:text-white font-medium text-sm truncate">{p.title}</p>
                      <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/6 dark:bg-white/6 rounded-full px-2 py-0.5 shrink-0">
                        {CAT_LABEL[p.category]}
                      </span>
                      {!p.is_active && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 rounded-full px-2 py-0.5 border border-rose-500/20 shrink-0">비공개</span>
                      )}
                    </div>
                    <p className="text-amber-400 font-bold text-sm mt-0.5">{p.price.toLocaleString('ko-KR')}원</p>
                    <p className="text-stone-400 dark:text-white/30 text-xs mt-0.5">재고 {p.stock}개</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        p.is_active
                          ? 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/8'
                      }`}
                    >
                      {p.is_active ? '비공개' : '공개'}
                    </button>
                    <button
                      onClick={() => editingId === p.id ? cancelEdit() : startEdit(p)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition"
                    >
                      {editingId === p.id ? '취소' : '수정'}
                    </button>
                    <Link
                      href={`/market/${p.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition"
                    >
                      보기
                    </Link>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent text-stone-300 dark:text-white/20 hover:text-rose-400 hover:bg-rose-500/8 hover:border-rose-500/20 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 수정 폼 */}
                {editingId === p.id && (
                  <div className="border-t border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] px-5 py-6 flex flex-col gap-5">

                    {/* 상품명 */}
                    <div>
                      <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">상품명 *</label>
                      <input
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="예: 제주 한라봉 3kg"
                        className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-amber-500/50 transition"
                      />
                    </div>

                    {/* 상품 설명 */}
                    <div>
                      <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">상품 상세 설명</label>
                      <RichTextEditor
                        value={editForm.description}
                        onChange={(v) => setEditForm((f) => ({ ...f, description: v }))}
                        placeholder="상품 특징, 원산지, 보관 방법, 주의사항 등을 자세히 입력해주세요."
                        onImageUpload={handleDescImageUpload}
                      />
                    </div>

                    {/* 가격 · 정가 · 재고 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">가격 (원) *</label>
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-amber-500/50 transition"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">정가 (선택)</label>
                        <input
                          type="number"
                          placeholder="할인 전 정가"
                          value={editForm.originalPrice}
                          onChange={(e) => setEditForm((f) => ({ ...f, originalPrice: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-amber-500/50 transition"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">재고 *</label>
                        <input
                          type="number"
                          value={editForm.stock}
                          onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-amber-500/50 transition"
                        />
                      </div>
                    </div>

                    {/* 카테고리 */}
                    <div>
                      <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">카테고리 *</label>
                      <div className="grid grid-cols-5 gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setEditForm((f) => ({ ...f, category: cat.value }))}
                            className={`py-2.5 rounded-xl text-sm font-medium transition border ${
                              editForm.category === cat.value
                                ? 'bg-amber-500 border-amber-500 text-black'
                                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 색상 */}
                    <div>
                      <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">
                        색상 <span className="text-stone-400 dark:text-white/30 normal-case font-normal">(선택사항)</span>
                      </label>
                      <div className="flex flex-wrap gap-2 px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus-within:border-amber-500/50 transition min-h-[48px] items-center">
                        {editForm.colors.map((color) => (
                          <span
                            key={color}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-stone-700 dark:text-amber-200 shrink-0"
                          >
                            {color}
                            <button
                              type="button"
                              onClick={() => removeEditColor(color)}
                              className="text-stone-400 dark:text-amber-300/50 hover:text-rose-400 transition leading-none"
                            >×</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder={editForm.colors.length === 0 ? '색상명 입력 후 Enter (예: 아이보리, 차콜 그레이)' : ''}
                          value={editColorInput}
                          onChange={(e) => setEditColorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addEditColor(); }
                            if (e.key === 'Backspace' && editColorInput === '' && editForm.colors.length > 0) {
                              setEditForm((f) => ({ ...f, colors: f.colors.slice(0, -1) }));
                            }
                          }}
                          className="flex-1 min-w-[140px] bg-transparent text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/25 focus:outline-none text-sm"
                        />
                      </div>
                      <p className="text-xs text-stone-400 dark:text-white/30 mt-1.5">Enter로 추가 · Backspace로 마지막 항목 삭제</p>
                    </div>

                    {/* 배송 · 포장 섹션 */}
                    <div className="rounded-xl border border-black/8 dark:border-white/8 overflow-hidden">
                      <div className="px-4 py-3 bg-black/3 dark:bg-white/3 border-b border-black/8 dark:border-white/8 flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                        </svg>
                        <span className="text-xs font-semibold text-stone-600 dark:text-white/60 tracking-wider uppercase">배송 · 포장</span>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        {/* 해외직구 토글 */}
                        <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border border-black/8 dark:border-white/8 hover:bg-black/2 dark:hover:bg-white/2 transition">
                          <div>
                            <p className="text-sm font-semibold text-stone-800 dark:text-white flex items-center gap-1.5">🌐 해외직구 상품</p>
                            <p className="text-xs text-stone-400 dark:text-white/30 mt-0.5">해외에서 직접 발송되는 상품입니다</p>
                          </div>
                          <div
                            onClick={() => setEditForm((f) => ({ ...f, is_overseas: !f.is_overseas }))}
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${editForm.is_overseas ? 'bg-sky-500' : 'bg-black/15 dark:bg-white/15'}`}
                          >
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${editForm.is_overseas ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </div>
                        </label>

                        {editForm.is_overseas && (
                          <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 p-3 flex flex-col gap-2">
                            <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold">해외배송비 (원)</label>
                            <input
                              type="number"
                              placeholder="예: 15000"
                              value={editForm.overseas_shipping_fee}
                              onChange={(e) => setEditForm((f) => ({ ...f, overseas_shipping_fee: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-sky-500/20 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition text-sm"
                            />
                            <p className="text-xs text-sky-400/70">0원 입력 시 &apos;별도 안내&apos;로 표시됩니다</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">배송유형</label>
                            <select
                              value={editForm.delivery_type}
                              onChange={(e) => setEditForm((f) => ({ ...f, delivery_type: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white focus:outline-none focus:border-amber-500/50 transition text-sm appearance-none cursor-pointer"
                            >
                              <option value="">선택 안 함</option>
                              <option value="일반배송">일반배송</option>
                              <option value="새벽배송">새벽배송 (내일 아침)</option>
                              <option value="냉장배송">냉장배송</option>
                              <option value="냉동배송">냉동배송</option>
                              <option value="직접배송">직접배송 (산지직송)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">평균 배송기간</label>
                            <select
                              value={editForm.delivery_days ?? ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, delivery_days: e.target.value ? Number(e.target.value) : null }))}
                              className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white focus:outline-none focus:border-amber-500/50 transition text-sm appearance-none cursor-pointer"
                            >
                              <option value="">선택 안 함</option>
                              <option value="1">당일 ~ 1일</option>
                              <option value="2">2 ~ 3일</option>
                              <option value="5">4 ~ 7일</option>
                              <option value="10">7일 이상</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">판매단위</label>
                            <input
                              type="text"
                              placeholder="예: 1팩, 3개, 1kg"
                              value={editForm.sales_unit}
                              onChange={(e) => setEditForm((f) => ({ ...f, sales_unit: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">포장타입</label>
                            <input
                              type="text"
                              placeholder="예: 냉장 (종이포장)"
                              value={editForm.packaging_type}
                              onChange={(e) => setEditForm((f) => ({ ...f, packaging_type: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 상세정보 섹션 */}
                    <div className="rounded-xl border border-black/8 dark:border-white/8 overflow-hidden">
                      <div className="px-4 py-3 bg-black/3 dark:bg-white/3 border-b border-black/8 dark:border-white/8 flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586" />
                        </svg>
                        <span className="text-xs font-semibold text-stone-600 dark:text-white/60 tracking-wider uppercase">상세정보</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {[
                          { label: '중량/용량', placeholder: '예: 3kg, 500ml', key: 'weight' as const },
                          { label: '원산지',   placeholder: '예: 제주도, 국내산', key: 'origin' as const },
                          { label: '보관방법', placeholder: '예: 냉장보관 (0~5℃)', key: 'storage_method' as const },
                          { label: '유통기한', placeholder: '예: 제조일로부터 5일', key: 'expiry_info' as const },
                        ].map(({ label, placeholder, key }) => (
                          <div key={key}>
                            <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">{label}</label>
                            <input
                              type="text"
                              placeholder={placeholder}
                              value={editForm[key]}
                              onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                            />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">알레르기 정보</label>
                          <input
                            type="text"
                            placeholder="예: 밀, 대두 포함 / 없음"
                            value={editForm.allergen_info}
                            onChange={(e) => setEditForm((f) => ({ ...f, allergen_info: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 이미지 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase">상품 이미지</label>
                        <span className="text-xs text-stone-400 dark:text-white/30">{totalImages}/5장</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {/* 기존 이미지 */}
                        {editImages.map((src, idx) => (
                          <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group shrink-0">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            {idx === 0 && editImageFiles.length === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold bg-black/60 text-white py-0.5">대표</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeExistingImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition leading-none"
                            >×</button>
                          </div>
                        ))}
                        {/* 새로 추가할 이미지 */}
                        {editImagePreviews.map((src, idx) => (
                          <div key={`new-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-amber-500/30 group shrink-0">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold bg-amber-500/80 text-black py-0.5">새 이미지</span>
                            <button
                              type="button"
                              onClick={() => removeNewImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition leading-none"
                            >×</button>
                          </div>
                        ))}
                        {/* 추가 버튼 */}
                        {totalImages < 5 && (
                          <label className="w-20 h-20 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition group flex flex-col items-center justify-center gap-1 shrink-0">
                            <svg className="w-5 h-5 text-stone-400 dark:text-white/30 group-hover:text-amber-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span className="text-[10px] text-stone-400 dark:text-white/30 group-hover:text-amber-400 transition">추가</span>
                            <input type="file" accept="image/*" multiple onChange={handleEditImageChange} className="hidden" />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 dark:text-white/30 mt-1.5">첫 번째 이미지가 대표 이미지로 사용됩니다.</p>
                    </div>

                    {error && <p className="text-rose-400 text-xs">{error}</p>}

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(p.id)}
                        disabled={saving || !editForm.title.trim()}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition disabled:opacity-50"
                      >
                        {saving ? '저장 중...' : '저장하기'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
          );
        })()}
      </div>
    </main>
  );
}
