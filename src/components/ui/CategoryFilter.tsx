'use client';

import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/types/market';

interface CategoryFilterProps {
  current: string;
}

export default function CategoryFilter({ current }: CategoryFilterProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const active = current === cat.value || (cat.value === 'all' && !current);
        return (
          <button
            key={cat.value}
            onClick={() =>
              router.push(cat.value === 'all' ? '/market' : `/market?category=${cat.value}`)
            }
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border ${
              active
                ? 'bg-amber-500 border-amber-500 text-black'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
