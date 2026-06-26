# Product Form Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상품 등록 폼에 색상 선택(선택사항)과 이미지 파일 업로드를 추가하고, 상품 상세 페이지에 이미지 2장 이상 시 3초 자동 슬라이드 갤러리를 추가한다.

**Architecture:** DB에 `colors text[]` 컬럼 추가(마이그레이션) → sell 페이지에 파일 업로드 + 색상 스와치 UI → 상세 페이지에 Client Component 갤러리(`ProductImageGallery`) 추출.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Supabase Storage (`product-images` bucket), Supabase JS client

## Global Constraints

- Next.js 15: `params`는 Promise — await 필수
- Tailwind CSS v4: 슬래시 opacity 표기(`bg-black/5`), `@custom-variant dark`
- 다크/라이트 모드 완전 대응: 모든 색상에 `dark:` 변형
- Supabase Storage 버킷명: `product-images` (public, 이미 생성됨)
- 이미지 업로드 경로: `${user.id}/${Date.now()}_${파일명}` (공백을 `_`로 치환)
- Supabase Client: 클라이언트 컴포넌트는 `@/lib/supabase`의 `supabase` 사용
- 서버 컴포넌트: `@/lib/supabaseServer`의 `supabaseServer()` 사용
- 환경변수 파일(`.env` 등) 절대 읽거나 수정하지 말 것
- Product 타입: `@/types/market`의 `Product` — Task 1에서 `colors?: string[]` 추가
- 이미지 최대 5장, 색상 선택은 완전 선택사항(0개 허용)
- `Link` 사용 (절대 `<a>` 태그 금지)

---

### Task 1: DB 마이그레이션 + Product 타입 업데이트

`products` 테이블에 `colors text[]` 컬럼 추가, `Product` 인터페이스에 반영.

**Files:**
- Create: `supabase/migrations/20260627000020_product_colors.sql`
- Modify: `src/types/market.ts`

**Interfaces:**
- Produces: `Product.colors?: string[]` — Task 2, 3에서 사용

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/20260627000020_product_colors.sql
alter table public.products
  add column if not exists colors text[] default '{}';
```

- [ ] **Step 2: `src/types/market.ts` 수정**

기존 `Product` 인터페이스의 `images: string[];` 다음 줄에 추가:

```ts
export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: Category;
  images: string[];
  colors?: string[];          // ← 추가
  stock: number;
  is_active: boolean;
  created_at: string;
  sellers?: { store_name: string; store_desc?: string | null };
}
```

- [ ] **Step 3: TypeScript 빌드 체크**

```bash
cd /Users/jeongbin/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
cd /Users/jeongbin/Desktop/da-itda && git add supabase/migrations/20260627000020_product_colors.sql src/types/market.ts && git commit -m "feat: products.colors 컬럼 추가 + Product 타입 업데이트"
```

---

### Task 2: Sell 페이지 — 이미지 파일 업로드 + 색상 스와치

`src/app/market/sell/page.tsx`에서 이미지 URL 입력을 파일 업로드로 교체하고, 선택적 색상 스와치 UI를 추가한다.

**Files:**
- Modify: `src/app/market/sell/page.tsx`

**Interfaces:**
- Consumes: `Product.colors?: string[]` from Task 1
- Consumes: Supabase Storage `product-images` bucket (public, 이미 생성됨)

- [ ] **Step 1: 상태 및 상수 추가**

파일 상단 import 블록 다음에 색상 상수 추가:

```ts
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
```

컴포넌트 내부 상태에서 `imageUrl` 제거하고 아래로 교체:

```ts
// 기존: const [imageUrl, setImageUrl] = useState('');
// 교체:
const [imageFiles, setImageFiles]     = useState<File[]>([]);
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
const [selectedColors, setSelectedColors] = useState<string[]>([]);
```

- [ ] **Step 2: 파일 선택 핸들러 추가**

```ts
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files ?? []).slice(0, 5);
  setImageFiles(files);
  setImagePreviews(files.map((f) => URL.createObjectURL(f)));
};

const removeImage = (idx: number) => {
  setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
};

const toggleColor = (value: string) => {
  setSelectedColors((prev) =>
    prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
  );
};
```

- [ ] **Step 3: `handleRegisterProduct` 수정**

```ts
const handleRegisterProduct = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;
  setSubmitting(true);
  setError('');

  // 이미지 업로드
  const uploadedUrls: string[] = [];
  for (const file of imageFiles) {
    const safeName = file.name.replace(/\s/g, '_');
    const path = `${user.id}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }
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
```

- [ ] **Step 4: "상품 추가 등록" 리셋에 새 상태 추가**

기존 리셋 onClick에 `setImageFiles([])`, `setImagePreviews([])`, `setSelectedColors([])` 추가:

```tsx
onClick={() => {
  setTitle(''); setDesc(''); setPrice(''); setStock('');
  setImageFiles([]); setImagePreviews([]); setSelectedColors([]);
  setStep('register-product');
}}
```

- [ ] **Step 5: 이미지 업로드 UI (기존 이미지 URL 입력 교체)**

기존 `이미지 URL` 입력 `<div>` 전체를 아래로 교체:

```tsx
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
```

- [ ] **Step 6: 색상 스와치 UI (카테고리 선택 다음에 추가)**

```tsx
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
```

- [ ] **Step 7: TypeScript 빌드 체크**

```bash
cd /Users/jeongbin/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 8: 커밋**

```bash
cd /Users/jeongbin/Desktop/da-itda && git add src/app/market/sell/page.tsx && git commit -m "feat: 상품 등록 — 이미지 파일 업로드 + 색상 스와치"
```

---

### Task 3: 상품 상세 페이지 — 이미지 갤러리(3초 슬라이드) + 색상 표시

**Files:**
- Create: `src/components/ui/ProductImageGallery.tsx`
- Modify: `src/app/market/[id]/page.tsx`

**Interfaces:**
- Consumes: `images: string[]`, `title: string` props
- Produces: `export default function ProductImageGallery({ images, title }: { images: string[]; title: string })`

- [ ] **Step 1: `src/components/ui/ProductImageGallery.tsx` 생성**

```tsx
'use client';

import { useState, useEffect } from 'react';

interface Props {
  images: string[];
  title: string;
  categoryEmoji: string;
}

export default function ProductImageGallery({ images, title, categoryEmoji }: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-gradient-to-br from-amber-500/10 to-orange-500/5 aspect-square flex items-center justify-center">
        <span className="text-9xl">{categoryEmoji}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden aspect-square relative">
      {/* 이미지 */}
      <img
        src={images[current]}
        alt={`${title} ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-500"
        key={current}
      />

      {/* 인디케이터 (2장 이상일 때만) */}
      {images.length > 1 && (
        <>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === current ? 'bg-white w-4' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
          {/* 좌/우 버튼 */}
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `src/app/market/[id]/page.tsx` 수정**

파일 상단에 import 추가:

```tsx
import ProductImageGallery from '@/components/ui/ProductImageGallery';
```

기존 이미지 div 블록 교체 (찾는 방법: `{/* 이미지 */}` 주석 또는 `rounded-2xl border border-black/8` div):

```tsx
{/* 이미지 갤러리 */}
<ProductImageGallery
  images={p.images ?? []}
  title={p.title}
  categoryEmoji={CATEGORY_EMOJI[p.category] ?? '📦'}
/>
```

색상 표시 — `{p.description && ...}` 블록 다음에 추가:

```tsx
{p.colors && p.colors.length > 0 && (
  <div>
    <p className="text-stone-400 dark:text-white/30 text-xs mb-2">색상</p>
    <div className="flex gap-2 flex-wrap">
      {p.colors.map((color) => {
        const HEX: Record<string, string> = {
          red: '#ef4444', orange: '#f97316', yellow: '#eab308',
          green: '#22c55e', blue: '#3b82f6', sky: '#0ea5e9',
          purple: '#a855f7', pink: '#ec4899', white: '#f3f4f6',
          gray: '#6b7280', black: '#1c1c1e', brown: '#92400e',
        };
        const NAME: Record<string, string> = {
          red: '빨강', orange: '주황', yellow: '노랑', green: '초록',
          blue: '파랑', sky: '하늘', purple: '보라', pink: '핑크',
          white: '흰색', gray: '회색', black: '검정', brown: '갈색',
        };
        return (
          <div key={color} className="flex items-center gap-1.5">
            <span
              className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 inline-block"
              style={{ backgroundColor: HEX[color] ?? color }}
            />
            <span className="text-xs text-stone-500 dark:text-white/50">{NAME[color] ?? color}</span>
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: TypeScript 빌드 체크**

```bash
cd /Users/jeongbin/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
cd /Users/jeongbin/Desktop/da-itda && git add src/components/ui/ProductImageGallery.tsx src/app/market/\[id\]/page.tsx && git commit -m "feat: 상품 상세 — 이미지 갤러리(3초 슬라이드) + 색상 표시"
```
