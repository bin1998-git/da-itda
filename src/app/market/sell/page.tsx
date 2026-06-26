'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Category } from '@/types/market';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'food',    label: '신선식품' },
  { value: 'kitchen', label: '주방용품' },
  { value: 'snack',   label: '간식' },
  { value: 'drink',   label: '음료' },
];

const COLOR_OPTIONS = [
  { name: '빨강', value: 'red',    hex: '#ef4444' },
  { name: '주황', value: 'orange', hex: '#f97316' },
  { name: '노랑', value: 'yellow', hex: '#eab308' },
  { name: '초록', value: 'green',  hex: '#22c55e' },
  { name: '파랑', value: 'blue',   hex: '#3b82f6' },
  { name: '하늘', value: 'sky',    hex: '#0ea5e9' },
  { name: '보라', value: 'purple', hex: '#a855f7' },
  { name: '핑크', value: 'pink',   hex: '#ec4899' },
  { name: '흰색', value: 'white',  hex: '#f3f4f6' },
  { name: '회색', value: 'gray',   hex: '#6b7280' },
  { name: '검정', value: 'black',  hex: '#1c1c1e' },
  { name: '갈색', value: 'brown',  hex: '#92400e' },
];

type Step = 'loading' | 'register-seller' | 'register-product' | 'done';

export default function SellPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // seller form
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');

  // product form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [stock, setStock] = useState('');
  const [imageFiles, setImageFiles]       = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/auth/login'); return; }

    supabase.from('sellers').select('id').eq('id', user.id).single()
      .then(({ data }) => setStep(data ? 'register-product' : 'register-seller'));
  }, [user, isLoading, router]);

  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');

    const { error } = await supabase
      .from('sellers')
      .insert({ id: user.id, store_name: storeName.trim(), store_desc: storeDesc.trim() || null });

    setSubmitting(false);
    if (error) setError(error.message);
    else setStep('register-product');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    setError('');
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const invalid = files.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      setError(`${invalid.name}은 지원하지 않는 파일 형식입니다. (jpg, png, webp, gif만 가능)`);
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const oversized = files.find((f) => f.size > MAX_SIZE);
    if (oversized) {
      setError(`${oversized.name}의 파일 크기가 5MB를 초과합니다.`);
      return;
    }
    setImageFiles(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleColor = (value: string) => {
    setSelectedColors((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');

    // 이미지 업로드
    const uploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file);
      if (uploadError) {
        setError(`이미지 업로드 실패: ${file.name}`);
        setSubmitting(false);
        return;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    const { error } = await supabase.from('products').insert({
      seller_id: user.id,
      title:       title.trim(),
      description: desc.trim() || null,
      price:       Number(price),
      category,
      stock:       Number(stock),
      images:      uploadedUrls,
      colors:      selectedColors,
    });

    setSubmitting(false);
    if (error) setError(error.message);
    else setStep('done');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <span className="text-6xl block mb-4">🎉</span>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">상품이 등록되었습니다!</h2>
          <p className="text-stone-400 dark:text-white/40 text-sm mb-8">마켓에서 확인해보세요.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/market/manage')}
              className="px-6 py-3 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
            >
              내 상품 관리하기
            </button>
            <button
              onClick={() => {
                imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                setTitle(''); setDesc(''); setPrice(''); setStock('');
                setImageFiles([]); setImagePreviews([]); setSelectedColors([]);
                setStep('register-product');
              }}
              className="px-6 py-3 rounded-full border border-white/15 text-stone-900 dark:text-white text-sm hover:bg-black/8 dark:hover:bg-white/8 transition"
            >
              상품 추가 등록
            </button>
            <button
              onClick={() => router.push('/market')}
              className="px-6 py-3 rounded-full border border-white/15 text-stone-600 dark:text-white/60 text-sm hover:bg-black/8 dark:hover:bg-white/8 transition"
            >
              마켓 보러가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-lg mx-auto px-6 py-10">
        {/* 진행 단계 표시 */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 'register-seller' ? 'text-amber-400' : 'text-emerald-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'register-seller' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}>
              {step === 'register-seller' ? '1' : '✓'}
            </span>
            판매자 등록
          </div>
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 'register-product' ? 'text-amber-400' : 'text-stone-300 dark:text-white/20'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'register-product' ? 'bg-amber-500 text-black' : 'bg-black/10 dark:bg-white/10 text-stone-400 dark:text-white/30'}`}>
              2
            </span>
            상품 등록
          </div>
        </div>

        {/* 판매자 등록 폼 */}
        {step === 'register-seller' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">판매자 등록</h1>
              <p className="text-stone-400 dark:text-white/40 text-sm mt-1">스토어 정보를 입력하면 상품을 판매할 수 있습니다.</p>
            </div>
            <form onSubmit={handleRegisterSeller} className="flex flex-col gap-4">
              <div>
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">스토어 이름 *</label>
                <input
                  type="text"
                  placeholder="예: 홍길동 신선마트"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>
              <div>
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">스토어 소개</label>
                <textarea
                  placeholder="어떤 상품을 판매하는 스토어인지 간단히 소개해주세요."
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none"
                />
              </div>
              {error && <p className="text-rose-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '판매자 등록하기'}
              </button>
            </form>
          </>
        )}

        {/* 상품 등록 폼 */}
        {step === 'register-product' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">상품 등록</h1>
              <p className="text-stone-400 dark:text-white/40 text-sm mt-1">판매할 상품 정보를 입력해주세요.</p>
            </div>
            <form onSubmit={handleRegisterProduct} className="flex flex-col gap-4">
              <div>
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">상품명 *</label>
                <input
                  type="text"
                  placeholder="예: 제주 한라봉 3kg"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>
              <div>
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">상품 설명</label>
                <textarea
                  placeholder="상품 특징, 원산지, 보관 방법 등을 입력해주세요."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">가격 (원) *</label>
                  <input
                    type="number"
                    placeholder="15000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min={100}
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div>
                  <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">재고 *</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    min={0}
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">카테고리 *</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition border ${
                        category === cat.value
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">
                  색상 <span className="text-stone-400 dark:text-white/30 normal-case font-normal">(선택사항)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => {
                    const isSelected = selectedColors.includes(color.value);
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => toggleColor(color.value)}
                        title={color.name}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          isSelected
                            ? 'border-amber-400 scale-110 shadow-md'
                            : 'border-transparent hover:border-white/40 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    );
                  })}
                </div>
                {selectedColors.length > 0 && (
                  <p className="text-xs text-stone-400 dark:text-white/40 mt-2">
                    선택됨: {selectedColors.map((v) => COLOR_OPTIONS.find((c) => c.value === v)?.name).filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <div>
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">
                  상품 이미지 <span className="text-stone-400 dark:text-white/30 normal-case font-normal">(최대 5장)</span>
                </label>

                {/* 업로드 버튼 */}
                <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/3 transition group">
                  <svg className="w-6 h-6 text-stone-400 dark:text-white/30 group-hover:text-amber-400 transition mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-xs text-stone-400 dark:text-white/40 group-hover:text-amber-400 transition">클릭하여 이미지 선택</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {/* 미리보기 */}
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {error && <p className="text-rose-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '상품 등록하기'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
