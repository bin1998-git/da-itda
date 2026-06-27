'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Category } from '@/types/market';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'food',    label: '신선식품' },
  { value: 'kitchen', label: '주방용품' },
  { value: 'snack',   label: '간식' },
  { value: 'drink',   label: '음료' },
  { value: 'etc',     label: '기타' },
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
  const [colorInput, setColorInput] = useState('');
  // 상세정보
  const [weight, setWeight] = useState('');
  const [origin, setOrigin] = useState('');
  const [storageMethod, setStorageMethod] = useState('');
  const [expiryInfo, setExpiryInfo] = useState('');
  const [allergenInfo, setAllergenInfo] = useState('');
  // 배송·포장 정보
  const [deliveryType, setDeliveryType] = useState('');
  const [deliveryDays, setDeliveryDays] = useState<number | null>(null);
  const [isOverseas, setIsOverseas] = useState(false);
  const [overseasShippingFee, setOverseasShippingFee] = useState('');
  const [packagingType, setPackagingType] = useState('');
  const [salesUnit, setSalesUnit] = useState('');

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
    const newFiles = Array.from(e.target.files ?? []);
    e.target.value = ''; // 같은 파일 재선택 가능하게 초기화
    setError('');

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const invalid = newFiles.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      setError(`${invalid.name}은 지원하지 않는 파일 형식입니다. (jpg, png, webp, gif만 가능)`);
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    const oversized = newFiles.find((f) => f.size > MAX_SIZE);
    if (oversized) {
      setError(`${oversized.name}의 파일 크기가 5MB를 초과합니다.`);
      return;
    }

    setImageFiles((prev) => {
      const combined = [...prev, ...newFiles].slice(0, 5); // 최대 5장 누적
      return combined;
    });
    setImagePreviews((prev) => {
      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      return [...prev, ...newPreviews].slice(0, 5);
    });
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDescImageUpload = async (file: File): Promise<string> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user!.id}/desc/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file);
    if (uploadError) throw new Error(uploadError.message);
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const addColor = () => {
    const trimmed = colorInput.trim();
    if (!trimmed || selectedColors.includes(trimmed)) { setColorInput(''); return; }
    setSelectedColors((prev) => [...prev, trimmed]);
    setColorInput('');
  };

  const removeColor = (color: string) => {
    setSelectedColors((prev) => prev.filter((c) => c !== color));
  };

  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');

    // 이미지 업로드
    const uploadedUrls: string[] = [];
    const timestamp = Date.now();
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${timestamp}_${i}_${safeName}`;
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
      seller_id:      user.id,
      title:          title.trim(),
      description:    desc.trim() || null,
      price:          Number(price),
      category,
      stock:          Number(stock),
      images:         uploadedUrls,
      colors:         selectedColors,
      weight:         weight.trim() || null,
      origin:         origin.trim() || null,
      storage_method: storageMethod.trim() || null,
      expiry_info:    expiryInfo.trim() || null,
      allergen_info:    allergenInfo.trim() || null,
      delivery_type:         deliveryType || null,
      delivery_days:         deliveryDays,
      is_overseas:           isOverseas,
      overseas_shipping_fee: isOverseas ? (Number(overseasShippingFee) || 0) : 0,
      packaging_type:        packagingType.trim() || null,
      sales_unit:            salesUnit.trim() || null,
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
                <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">상품 상세 설명</label>
                <RichTextEditor
                  value={desc}
                  onChange={setDesc}
                  placeholder="상품 특징, 원산지, 보관 방법, 주의사항 등을 자세히 입력해주세요."
                  onImageUpload={user ? handleDescImageUpload : undefined}
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
                {/* 태그 + 입력창 한 줄 */}
                <div className="flex flex-wrap gap-2 px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus-within:border-amber-500/50 transition min-h-[48px] items-center">
                  {selectedColors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-stone-700 dark:text-amber-200 shrink-0"
                    >
                      {color}
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        className="text-stone-400 dark:text-amber-300/50 hover:text-rose-400 transition leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={selectedColors.length === 0 ? '색상명 입력 후 Enter (예: 아이보리, 차콜 그레이)' : ''}
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addColor(); }
                      if (e.key === 'Backspace' && colorInput === '' && selectedColors.length > 0) {
                        setSelectedColors((prev) => prev.slice(0, -1));
                      }
                    }}
                    className="flex-1 min-w-[140px] bg-transparent text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/25 focus:outline-none text-sm"
                  />
                </div>
                <p className="text-xs text-stone-400 dark:text-white/30 mt-1.5">Enter로 추가 · Backspace로 마지막 항목 삭제</p>
              </div>

              {/* ── 배송 · 포장 섹션 ──────────────────────────────────── */}
              <div className="rounded-xl border border-black/8 dark:border-white/8 overflow-hidden">
                <div className="px-4 py-3 bg-black/3 dark:bg-white/3 border-b border-black/8 dark:border-white/8 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  <span className="text-xs font-semibold text-stone-600 dark:text-white/60 tracking-wider uppercase">배송 · 포장</span>
                  <span className="text-xs text-stone-400 dark:text-white/30 font-normal normal-case">(구매 페이지 우측에 표시)</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {/* 해외직구 토글 */}
                  <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border border-black/8 dark:border-white/8 hover:bg-black/2 dark:hover:bg-white/2 transition">
                    <div>
                      <p className="text-sm font-semibold text-stone-800 dark:text-white flex items-center gap-1.5">🌐 해외직구 상품</p>
                      <p className="text-xs text-stone-400 dark:text-white/30 mt-0.5">해외에서 직접 발송되는 상품입니다</p>
                    </div>
                    <div
                      onClick={() => setIsOverseas((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isOverseas ? 'bg-sky-500' : 'bg-black/15 dark:bg-white/15'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isOverseas ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>

                  {/* 해외배송비 (해외직구 ON일 때만) */}
                  {isOverseas && (
                    <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 p-3 flex flex-col gap-2">
                      <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold">해외배송비 (원)</label>
                      <input
                        type="number"
                        placeholder="예: 15000"
                        value={overseasShippingFee}
                        onChange={(e) => setOverseasShippingFee(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-sky-500/20 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition text-sm"
                      />
                      <p className="text-xs text-sky-400/70">0원 입력 시 &apos;별도 안내&apos;로 표시됩니다</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                  {/* 배송유형 */}
                  <div>
                    <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">배송유형</label>
                    <select
                      value={deliveryType}
                      onChange={(e) => setDeliveryType(e.target.value)}
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
                  {/* 평균 배송기간 */}
                  <div>
                    <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">평균 배송기간</label>
                    <select
                      value={deliveryDays ?? ''}
                      onChange={(e) => setDeliveryDays(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white focus:outline-none focus:border-amber-500/50 transition text-sm appearance-none cursor-pointer"
                    >
                      <option value="">선택 안 함</option>
                      <option value="1">당일 ~ 1일</option>
                      <option value="2">2 ~ 3일</option>
                      <option value="5">4 ~ 7일</option>
                      <option value="10">7일 이상</option>
                    </select>
                  </div>
                  {/* 판매단위 */}
                  <div>
                    <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">판매단위</label>
                    <input
                      type="text"
                      placeholder="예: 1팩, 3개, 1kg"
                      value={salesUnit}
                      onChange={(e) => setSalesUnit(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                    />
                  </div>
                  {/* 포장타입 */}
                  <div className="col-span-2">
                    <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">포장타입</label>
                    <input
                      type="text"
                      placeholder="예: 냉장 (종이포장), 냉동 (비닐포장), 상온"
                      value={packagingType}
                      onChange={(e) => setPackagingType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                    />
                  </div>
                  </div>{/* grid 끝 */}
                </div>
              </div>

              {/* ── 상세정보 섹션 ─────────────────────────────────────── */}
              <div className="rounded-xl border border-black/8 dark:border-white/8 overflow-hidden">
                <div className="px-4 py-3 bg-black/3 dark:bg-white/3 border-b border-black/8 dark:border-white/8 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586" />
                  </svg>
                  <span className="text-xs font-semibold text-stone-600 dark:text-white/60 tracking-wider uppercase">상세정보</span>
                  <span className="text-xs text-stone-400 dark:text-white/30 font-normal normal-case">(상품 상세 탭에 표시됩니다)</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { label: '중량/용량', placeholder: '예: 3kg, 500ml', value: weight, set: setWeight },
                    { label: '원산지',   placeholder: '예: 제주도, 국내산', value: origin, set: setOrigin },
                    { label: '보관방법', placeholder: '예: 냉장보관 (0~5℃)', value: storageMethod, set: setStorageMethod },
                    { label: '유통기한', placeholder: '예: 제조일로부터 5일', value: expiryInfo, set: setExpiryInfo },
                  ].map(({ label, placeholder, value, set }) => (
                    <div key={label}>
                      <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">{label}</label>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-stone-500 dark:text-white/40 text-[11px] font-semibold block mb-1.5">알레르기 정보</label>
                    <input
                      type="text"
                      placeholder="예: 밀, 대두 포함 / 없음"
                      value={allergenInfo}
                      onChange={(e) => setAllergenInfo(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase">
                    상품 이미지
                  </label>
                  <span className="text-xs text-stone-400 dark:text-white/30">
                    {imagePreviews.length}/5장
                  </span>
                </div>

                {/* 미리보기 + 추가 버튼 */}
                <div className="flex gap-2 flex-wrap">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group shrink-0">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold bg-black/60 text-white py-0.5">
                          대표
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* 이미지 추가 버튼 (5장 미만일 때만 표시) */}
                  {imagePreviews.length < 5 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition group flex flex-col items-center justify-center gap-1 shrink-0">
                      <svg className="w-5 h-5 text-stone-400 dark:text-white/30 group-hover:text-amber-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span className="text-[10px] text-stone-400 dark:text-white/30 group-hover:text-amber-400 transition">
                        {imagePreviews.length === 0 ? '이미지 추가' : '추가'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {imagePreviews.length === 0 && (
                  <p className="text-xs text-stone-400 dark:text-white/30 mt-1.5">첫 번째 이미지가 대표 이미지로 사용됩니다.</p>
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
