import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import VideoPlayer from '@/components/ui/VideoPlayer';
import LikeButton from '@/components/ui/LikeButton';
import { MediaPost } from '@/types/media';

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseServer();

  const [{ data: post }, { count: likeCount }] = await Promise.all([
    db
      .from('media_posts')
      .select('*')
      .eq('id', id)
      .single(),
    db
      .from('media_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id),
  ]);

  if (!post) notFound();

  const p = post as MediaPost;

  // 조회수 증가 (비동기, 결과 무시)
  db.rpc('increment_views', { post_id: id }).then(() => {});

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 뒤로가기 */}
        <Link href="/media" className="inline-flex items-center gap-1.5 text-white/40 text-sm hover:text-white transition mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          미디어로 돌아가기
        </Link>

        {/* 비디오 플레이어 */}
        <VideoPlayer src={p.video_url} poster={p.thumbnail_url ?? undefined} />

        {/* 영상 정보 */}
        <div className="mt-6 flex flex-col gap-4">
          {/* 태그 */}
          {p.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {p.tags.map((tag) => (
                <span key={tag} className="text-xs text-rose-400/80 bg-rose-500/10 px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 제목 & 액션 */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-white flex-1">{p.title}</h1>
            <LikeButton postId={p.id} initialCount={likeCount ?? 0} initialLiked={false} />
          </div>

          {/* 메타 */}
          <div className="flex items-center gap-3 text-white/40 text-sm border-b border-white/5 pb-4">
            <span className="text-white/60 font-medium">{p.profiles?.username ?? '익명'}</span>
            <span>·</span>
            <span>조회 {p.views.toLocaleString('ko-KR')}</span>
            <span>·</span>
            <span>{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
          </div>

          {/* 설명 */}
          {p.description && (
            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">
              {p.description}
            </p>
          )}
        </div>

        {/* 다른 영상 추천 — 링크로 이동 */}
        <div className="mt-12">
          <Link
            href="/media"
            className="inline-flex items-center gap-2 text-white/40 text-sm hover:text-rose-400 transition"
          >
            다른 레시피 영상 보기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
