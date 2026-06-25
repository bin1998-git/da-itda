import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import Pagination from '@/components/ui/Pagination';

const PAGE_SIZE = 10;

const CATEGORIES: Record<string, { label: string; color: string }> = {
  recipe:   { label: '레시피', color: 'text-amber-400 bg-amber-500/10' },
  review:   { label: '후기',   color: 'text-emerald-400 bg-emerald-500/10' },
  question: { label: '질문',   color: 'text-sky-400 bg-sky-500/10' },
  general:  { label: '자유',   color: 'text-white/50 bg-white/5' },
};

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
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  const { data: posts, count, error } = await db
    .from('posts')
    .select('id, title, category, views, created_at, user_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // 현재 페이지 게시글 댓글 수 & 좋아요 수
  const postIds = (posts ?? []).map((p) => p.id);
  const [{ data: commentCounts }, { data: likeCounts }] = await Promise.all([
    db.from('comments').select('post_id').in('post_id', postIds),
    db.from('post_likes').select('post_id').in('post_id', postIds),
  ]);

  const commentMap = (commentCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.post_id] = (acc[r.post_id] ?? 0) + 1;
    return acc;
  }, {});
  const likeMap = (likeCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.post_id] = (acc[r.post_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      {/* 헤더 */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">커뮤니티</p>
              <h1 className="text-3xl font-bold text-white">푸드 토크</h1>
              <p className="text-white/40 text-sm mt-1">
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
        {error || !posts || posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">💬</span>
            <p className="text-white font-semibold text-lg">아직 게시글이 없습니다</p>
            <Link
              href="/community/write"
              className="px-6 py-3 rounded-full bg-emerald-500 text-black font-bold text-sm"
            >
              첫 글 쓰기
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-white/5">
              {posts.map((post) => {
                const cat = CATEGORIES[post.category] ?? CATEGORIES.general;
                return (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="py-5 flex flex-col gap-2 hover:bg-white/2 -mx-2 px-2 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-base group-hover:text-emerald-100 transition leading-snug">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-3 text-white/30 text-xs">
                      <span>{timeAgo(post.created_at)}</span>
                      <span>·</span>
                      <span>조회 {post.views}</span>
                      {(likeMap[post.id] ?? 0) > 0 && (
                        <>
                          <span>·</span>
                          <span>❤️ {likeMap[post.id]}</span>
                        </>
                      )}
                      {(commentMap[post.id] ?? 0) > 0 && (
                        <>
                          <span>·</span>
                          <span>💬 {commentMap[post.id]}</span>
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              getHref={(p) => `/community?page=${p}`}
            />
          </>
        )}
      </div>
    </main>
  );
}
