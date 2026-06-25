import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import Pagination from '@/components/ui/Pagination';
import { MediaPost } from '@/types/media';

const PAGE_SIZE = 12;

function formatViews(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function MediaCard({ post }: { post: MediaPost }) {
  return (
    <Link href={`/media/${post.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden border border-white/8 bg-white/3 hover:border-rose-500/30 hover:bg-white/5 transition-all duration-200">
        {/* 썸네일 */}
        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-rose-500/10 to-pink-500/5">
          {post.thumbnail_url ? (
            <img
              src={post.thumbnail_url}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* 재생 버튼 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {/* 조회수 */}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white/80 text-xs">
            조회 {formatViews(post.views)}
          </div>
        </div>
        {/* 정보 */}
        <div className="p-3 flex flex-col gap-1.5">
          <p className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-rose-100 transition">
            {post.title}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs">
              {post.profiles?.username ?? '익명'}
            </span>
            {post.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-rose-400/70 bg-rose-500/10 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  const { data, count, error } = await db
    .from('media_posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const posts = (data ?? []) as MediaPost[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      {/* 헤더 */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-pink-500/5" />
        <div className="max-w-5xl mx-auto px-6 py-10 relative">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-rose-400 text-xs font-semibold tracking-widest uppercase mb-1">푸드 미디어</p>
              <h1 className="text-3xl font-bold text-white">레시피 영상</h1>
              <p className="text-white/40 text-sm mt-1">
                {error ? '서비스 준비 중' : `${count ?? 0}개의 레시피 영상`}
              </p>
            </div>
            <Link
              href="/media/upload"
              className="px-5 py-2.5 rounded-full bg-rose-500 text-white text-sm font-bold hover:bg-rose-400 transition"
            >
              + 영상 올리기
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {error || posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">🎬</span>
            <p className="text-white font-semibold text-lg">
              {error ? '잠시 후 다시 시도해주세요' : '아직 영상이 없습니다'}
            </p>
            <Link
              href="/media/upload"
              className="mt-2 px-6 py-3 rounded-full bg-rose-500 text-white font-bold text-sm hover:bg-rose-400 transition"
            >
              첫 영상 올리기
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {posts.map((post) => (
                <MediaCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              getHref={(p) => `/media?page=${p}`}
            />
          </>
        )}
      </div>
    </main>
  );
}
