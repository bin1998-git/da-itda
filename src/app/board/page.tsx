// src/app/board/page.tsx
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import Pagination from '@/components/ui/Pagination';

const PAGE_SIZE = 10;

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  const { data: rows, count } = await db
    .from('board_posts')
    .select('id, title, file_urls, view_count, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const posts = rows ?? [];

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">BOARD</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">게시판</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">다잇다 공식 소식과 안내를 확인하세요</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">📋</span>
            <p className="text-stone-400 dark:text-white/40 text-sm">등록된 게시글이 없습니다</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/board/${p.id}`}
                  className="py-5 flex items-start gap-3 hover:bg-black/2 dark:hover:bg-white/2 -mx-2 px-2 rounded-xl transition group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {(p.file_urls as string[]).length > 0 && (
                        <span className="text-[10px] text-indigo-400/70 bg-indigo-500/8 px-2 py-0.5 rounded-full">
                          📎 {(p.file_urls as string[]).length}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-800 dark:text-white/80 font-medium text-sm group-hover:text-stone-900 dark:group-hover:text-white transition leading-snug">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-3 text-stone-400 dark:text-white/25 text-xs mt-1.5">
                      <span>{timeAgo(p.created_at)}</span>
                      <span>·</span>
                      <span>조회 {p.view_count}</span>
                    </div>
                  </div>
                  <span className="text-stone-300 dark:text-white/20 text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} hrefBase="/board" extraParams={{}} />
          </>
        )}
      </div>
    </main>
  );
}
