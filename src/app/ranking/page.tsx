import { supabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function RankingPage() {
  const db = supabaseServer();

  const [{ data: products }, { data: media }, { data: posts }] = await Promise.all([
    db.from('products').select('id, title, price, category, views').order('views', { ascending: false }).limit(10),
    db.from('media_posts').select('id, title, views, thumbnail_url').order('views', { ascending: false }).limit(10),
    db.from('posts').select('id, title, views, category').order('views', { ascending: false }).limit(10),
  ]);

  const tabs = [
    { key: 'product', label: '인기 상품', color: 'text-amber-400', items: products ?? [] },
    { key: 'media',   label: '인기 영상', color: 'text-rose-400',  items: media ?? [] },
    { key: 'post',    label: '인기 글',   color: 'text-emerald-400', items: posts ?? [] },
  ];

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">Ranking</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">인기 TOP 10</h1>
          <p className="text-stone-400 dark:text-white/35 text-sm mt-2">조회수 기준 가장 많이 본 콘텐츠</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tabs.map(({ key, label, color, items }) => (
            <div key={key}>
              <h2 className={`text-sm font-bold ${color} mb-4 flex items-center gap-2`}>
                <span className="w-1 h-4 rounded-full bg-current inline-block" />
                {label}
              </h2>
              <ol className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <li className="text-stone-300 dark:text-white/20 text-sm py-6 text-center">데이터가 없습니다</li>
                ) : items.map((item: Record<string, unknown>, idx) => (
                  <li key={item.id as string}>
                    <Link
                      href={`/${key === 'product' ? 'market' : key === 'media' ? 'media' : 'community'}/${item.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/4 dark:hover:bg-white/4 transition group"
                    >
                      <span className={`text-lg font-black w-7 text-center shrink-0 ${idx < 3 ? color : 'text-stone-300 dark:text-white/20'}`}>
                        {idx + 1}
                      </span>
                      <span className="text-stone-700 dark:text-white/70 text-sm truncate group-hover:text-stone-900 dark:group-hover:text-white transition">
                        {item.title as string}
                      </span>
                      {(item.views as number) > 0 && (
                        <span className="text-stone-300 dark:text-white/20 text-xs shrink-0 ml-auto">
                          {(item.views as number).toLocaleString()}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
