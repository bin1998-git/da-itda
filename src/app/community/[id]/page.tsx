import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import CommentSection from '@/components/ui/CommentSection';
import PostLikeButton from '@/components/ui/PostLikeButton';

const CATEGORIES: Record<string, { label: string; color: string }> = {
  recipe:   { label: '레시피', color: 'text-amber-400 bg-amber-500/10' },
  review:   { label: '후기',   color: 'text-emerald-400 bg-emerald-500/10' },
  question: { label: '질문',   color: 'text-sky-400 bg-sky-500/10' },
  general:  { label: '자유',   color: 'text-white/50 bg-white/5' },
};

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseServer();

  const [{ data: post }, { data: comments }, { count: likeCount }] = await Promise.all([
    db.from('posts').select('*').eq('id', id).single(),
    db.from('comments').select('id, content, created_at, user_id').eq('post_id', id).order('created_at'),
    db.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
  ]);

  if (!post) notFound();

  db.rpc('increment_post_views', { post_id: id }).then(() => {});

  const cat = CATEGORIES[post.category] ?? CATEGORIES.general;

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* 뒤로가기 */}
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-white/40 text-sm hover:text-white transition mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          커뮤니티로 돌아가기
        </Link>

        {/* 게시글 */}
        <article>
          {/* 카테고리 + 메타 */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cat.color}`}>
              {cat.label}
            </span>
            <span className="text-white/30 text-xs">
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </span>
            <span className="text-white/30 text-xs">조회 {post.views}</span>
          </div>

          {/* 제목 */}
          <h1 className="text-2xl font-bold text-white leading-snug mb-6">{post.title}</h1>

          {/* 본문 */}
          <div className="border-t border-white/5 pt-6 pb-8">
            <p className="text-white/75 text-sm leading-loose whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* 좋아요 */}
          <div className="flex justify-center pb-8 border-b border-white/5">
            <PostLikeButton postId={post.id} initialCount={likeCount ?? 0} initialLiked={false} />
          </div>
        </article>

        {/* 댓글 */}
        <CommentSection postId={post.id} initialComments={comments ?? []} />
      </div>
    </main>
  );
}
