import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import Pagination from '@/components/ui/Pagination';
import CommunityCategoryFilter from '@/components/ui/CommunityCategoryFilter';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';

const PAGE_SIZE = 10;

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; sub?: string }>;
}) {
  const { page: pageStr, category, sub } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  let query = db
    .from('posts')
    .select(
      'id, title, category, subcategory, views, created_at, user_id, comments(count), post_likes(count)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (category) query = query.eq('category', category);
  if (sub) query = query.eq('subcategory', sub);

  const { data: posts, count, error } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const extraParams: Record<string, string> = {};
  if (category) extraParams.category = category;
  if (sub) extraParams.sub = sub;

  type PostRow = NonNullable<typeof posts>[number] & {
    comments: { count: number }[];
    post_likes: { count: number }[];
    subcategory: string | null;
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">커뮤니티</p>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-white">푸드 토크</h1>
              <p className="text-stone-400 dark:text-white/40 text-sm mt-1">
                {error ? '불러오는 중...' : `${count ?? 0}개의 이야기`}
              </p>
            </div>
            <Link
              href="/community/write"
              className="px-5 py-2.5 rounded-full bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition"
            >
              + 글 쓰기
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <CommunityCategoryFilter />

        {error || !posts || posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">💬</span>
            <p className="text-stone-900 dark:text-white font-semibold text-lg">아직 게시글이 없습니다</p>
            <Link
              href="/community/write"
              className="px-6 py-3 rounded-full bg-emerald-500 text-black font-bold text-sm"
            >
              첫 글 쓰기
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {(posts as PostRow[]).map((post) => {
                const cat = COMMUNITY_CATEGORY_MAP[post.category] ?? COMMUNITY_CATEGORY_MAP['general'];
                const likeCount    = post.post_likes?.[0]?.count ?? 0;
                const commentCount = post.comments?.[0]?.count ?? 0;
                return (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="py-5 flex flex-col gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cat.color}`}>
                        {cat.emoji} {cat.label}
                      </span>
                      {post.subcategory && (
                        <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                          {post.subcategory}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-900 dark:text-white font-semibold text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition leading-snug">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-3 text-stone-400 dark:text-white/30 text-xs">
                      <span>{timeAgo(post.created_at)}</span>
                      <span>·</span>
                      <span>조회 {post.views}</span>
                      {likeCount > 0 && (<><span>·</span><span>❤️ {likeCount}</span></>)}
                      {commentCount > 0 && (<><span>·</span><span>💬 {commentCount}</span></>)}
                    </div>
                  </Link>
                );
              })}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              hrefBase="/community"
              extraParams={extraParams}
            />
          </>
        )}
      </div>
    </main>
  );
}
