'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function ProductTagSelector({ selectedIds, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, price, images')
        .ilike('title', `%${query}%`)
        .eq('is_active', true)
        .limit(8);
      setResults((data ?? []) as Product[]);
      setOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const add = (p: Product) => {
    if (selectedIds.includes(p.id) || selectedIds.length >= 5) return;
    const next = [...selected, p];
    setSelected(next);
    onChange(next.map((x) => x.id));
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const remove = (id: string) => {
    const next = selected.filter((p) => p.id !== id);
    setSelected(next);
    onChange(next.map((x) => x.id));
  };

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/20"
            >
              {p.title}
              <button type="button" onClick={() => remove(p.id)} className="hover:text-amber-800 dark:hover:text-amber-200">×</button>
            </span>
          ))}
        </div>
      )}

      {selectedIds.length < 5 && (
        <div ref={ref} className="relative">
          <input
            type="text"
            placeholder="상품 이름으로 검색 (최대 5개)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => add(p)}
                    disabled={selectedIds.includes(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/5 transition disabled:opacity-40 text-left"
                  >
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 shrink-0" />
                    )}
                    <span className="text-sm text-stone-800 dark:text-white flex-1 truncate">{p.title}</span>
                    <span className="text-xs text-amber-500 shrink-0">{p.price.toLocaleString('ko-KR')}원</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
