'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { COMMUNITY_CATEGORIES } from '@/types/community';

function FilterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') ?? '';
  const currentSub = searchParams.get('sub') ?? '';

  const activeCat = COMMUNITY_CATEGORIES.find((c) => c.value === currentCategory);

  const navigate = (category: string, sub?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (sub) params.set('sub', sub);
    const qs = params.toString();
    router.push(`/community${qs ? `?${qs}` : ''}`);
  };

  const tabBase =
    'px-4 py-1.5 rounded-full text-sm font-medium transition border';
  const tabActive =
    'bg-emerald-500 border-emerald-500 text-black';
  const tabInactive =
    'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white';
  const subBase =
    'px-3 py-1 rounded-full text-xs font-medium transition border';
  const subActive =
    'bg-stone-700 dark:bg-white/20 border-stone-700 dark:border-white/20 text-white';
  const subInactive =
    'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-stone-500 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/8';

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('')}
          className={`${tabBase} ${!currentCategory ? tabActive : tabInactive}`}
        >
          전체
        </button>
        {COMMUNITY_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => navigate(cat.value)}
            className={`${tabBase} ${currentCategory === cat.value ? tabActive : tabInactive}`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* 서브카테고리 (선택된 카테고리에 subcategories가 있을 때만) */}
      {activeCat?.subcategories && (
        <div className="flex flex-wrap gap-2 pl-1">
          <button
            onClick={() => navigate(currentCategory)}
            className={`${subBase} ${!currentSub ? subActive : subInactive}`}
          >
            전체
          </button>
          {activeCat.subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => navigate(currentCategory, sub)}
              className={`${subBase} ${currentSub === sub ? subActive : subInactive}`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityCategoryFilter() {
  return (
    <Suspense>
      <FilterInner />
    </Suspense>
  );
}
