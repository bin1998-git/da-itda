import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import Pagination from '@/components/ui/Pagination';

const PAGE_SIZE = 10;

const CATS: { key: string; label: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'general', label: '공지' },
  { key: 'update',  label: '업데이트' },
  { key: 'event',   label: '이벤트' },
];

const CAT_STYLE: Record<string, string> = {
  general: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  update:  'text-sky-400 bg-sky-500/10 border-sky-500/20',
  event:   'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

const CAT_LABEL: Record<string, string> = {
  general: '공지', update: '업데이트', event: '이벤트',
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  // 고정 공지 (페이지 무관하게 항상 상단에)
  const { data: pinned } = await db
    .from('notices')
    .select('id, title, category, view_count, created_at, is_pinned')
    .eq('is_pinned', true)
    .order('created_at', { ascending: false });

  let query = db
    .from('notices')
    .select('id, title, category, view_count, created_at, is_pinned', { count: 'exact' })
    .eq('is_pinned', false)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data: rows, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const pinnedList = (pinned ?? []).filter(
    (n) => !category || category === 'all' || n.category === category,
  );
  const normalList = rows ?? [];

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      {/* 헤더 */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-1">NOTICE</p>
          <h1 className="text-3xl font-bold text-white">공지사항</h1>
          <p className="text-white/40 text-sm mt-1">다잇다의 새로운 소식과 업데이트를 확인하세요</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATS.map(({ key, label }) => {
            const active = (key === 'all' && (!category || category === 'all')) || key === category;
            return (
              <Link
                key={key}
                href={key === 'all' ? '/notice' : `/notice?category=${key}`}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                  active
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                    : 'border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {pinnedList.length === 0 && normalList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">📢</span>
            <p className="text-white/40 text-sm">등록된 공지사항이 없습니다</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-white/5">
              {/* 고정 공지 */}
              {pinnedList.map((n) => (
                <Link
                  key={n.id}
                  href={`/notice/${n.id}`}
                  className="py-5 flex items-start gap-3 hover:bg-white/2 -mx-2 px-2 rounded-xl transition group"
                >
                  <span className="mt-0.5 text-sm shrink-0">📌</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CAT_STYLE[n.category] ?? CAT_STYLE.general}`}>
                        {CAT_LABEL[n.category] ?? '공지'}
                      </span>
                      <span className="text-[10px] text-amber-400 font-semibold">고정</span>
                    </div>
                    <p className="text-white font-semibold text-sm group-hover:text-violet-200 transition leading-snug">
                      {n.title}
                    </p>
                    <div className="flex items-center gap-3 text-white/25 text-xs mt-1.5">
                      <span>{timeAgo(n.created_at)}</span>
                      <span>·</span>
                      <span>조회 {n.view_count}</span>
                    </div>
                  </div>
                  <span className="text-white/20 text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              ))}

              {/* 일반 공지 */}
              {normalList.map((n) => (
                <Link
                  key={n.id}
                  href={`/notice/${n.id}`}
                  className="py-5 flex items-start gap-3 hover:bg-white/2 -mx-2 px-2 rounded-xl transition group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CAT_STYLE[n.category] ?? CAT_STYLE.general}`}>
                        {CAT_LABEL[n.category] ?? '공지'}
                      </span>
                    </div>
                    <p className="text-white/80 font-medium text-sm group-hover:text-white transition leading-snug">
                      {n.title}
                    </p>
                    <div className="flex items-center gap-3 text-white/25 text-xs mt-1.5">
                      <span>{timeAgo(n.created_at)}</span>
                      <span>·</span>
                      <span>조회 {n.view_count}</span>
                    </div>
                  </div>
                  <span className="text-white/20 text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              hrefBase="/notice"
              extraParams={category && category !== 'all' ? { category } : {}}
            />
          </>
        )}
      </div>
    </main>
  );
}
