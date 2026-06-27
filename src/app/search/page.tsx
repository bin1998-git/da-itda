'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import SearchBar from '@/components/ui/SearchBar';

interface Result {
  type: 'product' | 'media' | 'post';
  id: string;
  title: string;
  desc?: string;
  badge?: string;
  href: string;
}

const TYPE_META = {
  product: { label: '상품',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   tab: '상품' },
  media:   { label: '영상',    color: 'text-rose-400',    bg: 'bg-rose-500/10',    tab: '영상' },
  post:    { label: '게시글',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', tab: '게시글' },
};

const TABS = ['전체', '상품', '영상', '게시글'] as const;
type Tab = typeof TABS[number];

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('전체');
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setActiveTab('전체');

    const term = `%${q.trim()}%`;
    const [{ data: products }, { data: media }, { data: posts }] = await Promise.all([
      supabase
        .from('products')
        .select('id, title, description, category')
        .or(`title.ilike.${term},description.ilike.${term}`)
        .limit(20),
      supabase
        .from('media_posts')
        .select('id, title, description, tags')
        .or(`title.ilike.${term},description.ilike.${term}`)
        .limit(20),
      supabase
        .from('posts')
        .select('id, title, content, category')
        .or(`title.ilike.${term},content.ilike.${term}`)
        .limit(20),
    ]);

    const all: Result[] = [
      ...(products ?? []).map((p) => ({
        type: 'product' as const,
        id: p.id,
        title: p.title,
        desc: p.description,
        badge: p.category,
        href: `/market/${p.id}`,
      })),
      ...(media ?? []).map((m) => ({
        type: 'media' as const,
        id: m.id,
        title: m.title,
        desc: m.description,
        badge: m.tags?.[0],
        href: `/media/${m.id}`,
      })),
      ...(posts ?? []).map((p) => ({
        type: 'post' as const,
        id: p.id,
        title: p.title,
        desc: p.content?.slice(0, 80),
        badge: p.category,
        href: `/community/${p.id}`,
      })),
    ];
    setResults(all);
    setLoading(false);
  };

  useEffect(() => {
    if (initQuery) doSearch(initQuery);
    inputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
    doSearch(query);
  };

  const filtered = activeTab === '전체'
    ? results
    : results.filter((r) => TYPE_META[r.type].tab === activeTab);

  const counts = {
    전체: results.length,
    상품: results.filter((r) => r.type === 'product').length,
    영상: results.filter((r) => r.type === 'media').length,
    게시글: results.filter((r) => r.type === 'post').length,
  };

  function highlight(text: string, q: string) {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q.trim()})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.trim().toLowerCase()
        ? <mark key={i} className="bg-amber-500/30 text-amber-300 rounded px-0.5">{part}</mark>
        : part
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-6">통합 검색</h1>

        {/* 상품 자동완성 검색바 */}
        <div className="mb-4">
          <SearchBar />
        </div>

        {/* 검색창 */}
        <div className="flex gap-2 mb-8">
          <div className="flex-1 flex items-center gap-3 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus-within:border-black/25 dark:focus-within:border-white/25 transition">
            <svg className="w-4 h-4 text-stone-400 dark:text-white/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="상품, 영상, 게시글 검색..."
              className="flex-1 py-3.5 bg-transparent text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/25 focus:outline-none text-sm"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="text-stone-300 dark:text-white/20 hover:text-stone-500 dark:hover:text-white/50 transition shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-5 py-3.5 rounded-xl bg-white dark:bg-white text-black text-sm font-bold hover:bg-white/90 transition disabled:opacity-40"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : '검색'}
          </button>
        </div>

        {/* 탭 + 결과 */}
        {searched && (
          <>
            {/* 탭 필터 */}
            <div className="flex items-center gap-1 mb-5 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl p-1 border border-black/[0.06] dark:border-white/[0.06]">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition flex-1 justify-center ${
                    activeTab === tab
                      ? 'bg-black/10 dark:bg-white/10 text-stone-900 dark:text-white'
                      : 'text-stone-400 dark:text-white/35 hover:text-stone-600 dark:hover:text-white/60'
                  }`}
                >
                  {tab}
                  {counts[tab] > 0 && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab ? 'bg-black/15 dark:bg-white/15 text-stone-800 dark:text-white/80' : 'bg-black/6 dark:bg-white/6 text-stone-400 dark:text-white/30'
                    }`}>
                      {counts[tab]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 결과 목록 */}
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-stone-400 dark:text-white/30 text-sm">"{query}"에 대한 {activeTab === '전체' ? '' : `${activeTab} `}결과가 없습니다</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((r) => {
                  const meta = TYPE_META[r.type];
                  return (
                    <Link
                      key={`${r.type}-${r.id}`}
                      href={r.href}
                      className="flex items-start gap-3 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/12 dark:hover:border-white/12 transition group"
                    >
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${meta.color} ${meta.bg}`}>
                        {meta.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-900 dark:text-white text-sm font-medium group-hover:text-stone-800 dark:group-hover:text-white/90 leading-snug">
                          {highlight(r.title, query)}
                        </p>
                        {r.desc && (
                          <p className="text-stone-400 dark:text-white/35 text-xs mt-1 line-clamp-2 leading-relaxed">
                            {highlight(r.desc, query)}
                          </p>
                        )}
                        {r.badge && (
                          <span className="inline-block mt-1.5 text-[10px] text-stone-400 dark:text-white/25 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                            {r.badge}
                          </span>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-stone-300 dark:text-white/15 group-hover:text-stone-400 dark:group-hover:text-white/40 transition shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 초기 상태 */}
        {!searched && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="w-10 h-10 text-black/8 dark:text-white/8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-stone-400 dark:text-white/25 text-sm text-center leading-relaxed">
              마켓 상품, 레시피 영상, 커뮤니티 글을<br />한 번에 검색하세요
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
