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
  const [imageUrl, setImageUrl] = useState('');

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

  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');

    const { error } = await supabase.from('products').insert({
      seller_id: user.id,
      title: title.trim(),
      description: desc.trim() || null,
      price: Number(price),
      category,
      stock: Number(stock),
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
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
              onClick={() => { setTitle(''); setDesc(''); setPrice(''); setStock(''); setImageUrl(''); setStep('register-product'); }}
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
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">이미지 URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition"
                />
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
