'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'latest',     label: '최신순' },
  { value: 'price_asc',  label: '낮은가격순' },
  { value: 'price_desc', label: '높은가격순' },
  { value: 'popular',    label: '리뷰많은순' },
];

export default function SortSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('sort') ?? 'latest';
  const category = searchParams.get('category') ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('sort', e.target.value);
    params.set('page', '1');
    router.push(`/market?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-700 dark:text-white/70 text-sm focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
