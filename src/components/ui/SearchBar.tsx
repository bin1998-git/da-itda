'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Suggestion {
  id: string;
  title: string;
  price: number;
  images: string[];
  category: string;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    const { data } = await supabase
      .from('products')
      .select('id, title, price, images, category')
      .ilike('title', `%${q}%`)
      .eq('is_active', true)
      .limit(5);
    setSuggestions((data ?? []) as Suggestion[]);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); }
    if (e.key === 'Enter' && query.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const goToProduct = (id: string) => {
    setOpen(false);
    router.push(`/market/${id}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-3 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus-within:border-amber-500/50 transition">
        <svg className="w-4 h-4 text-stone-400 dark:text-white/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder="상품 이름으로 빠르게 검색..."
          className="flex-1 py-3 bg-transparent text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/25 focus:outline-none text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}
            className="text-stone-300 dark:text-white/20 hover:text-stone-500 dark:hover:text-white/50 transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xl overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => goToProduct(s.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition text-left border-b border-black/5 dark:border-white/5 last:border-0"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center overflow-hidden shrink-0">
                {s.images?.[0]
                  ? <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover" />
                  : <span className="text-lg">📦</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-stone-800 dark:text-white/80 text-sm font-medium truncate">{s.title}</p>
                <p className="text-amber-500 text-xs font-semibold mt-0.5">{s.price.toLocaleString('ko-KR')}원</p>
              </div>
              <svg className="w-4 h-4 text-stone-300 dark:text-white/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
