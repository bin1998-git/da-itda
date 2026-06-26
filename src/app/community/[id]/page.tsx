import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import CommentSection from '@/components/ui/CommentSection';
import PostLikeButton from '@/components/ui/PostLikeButton';
import ReportButton from '@/components/ui/ReportButton';
import AdminContentActions from '@/components/ui/AdminContentActions';
import PostAuthorActions from '@/components/ui/PostAuthorActions';
import DmButton from '@/components/ui/DmButton';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';

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

  // @ts-ignore – custom RPC not in generated types
  db.rpc('increment_post_views', { post_id: id }).then(() => {});

  const cat = COMMUNITY_CATEGORY_MAP[post.category] ?? COMMUNITY_CATEGORY_MAP['general'];

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* 뒤로가기 */}
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/40 text-sm hover:text-stone-900 dark:hover:text-white transition mb-6"
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
              {cat.emoji} {cat.label}
            </span>
            {post.subcategory && (
              <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {post.subcategory}
              </span>
            )}
            <span className="text-stone-400 dark:text-white/30 text-xs">
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </span>
            <span className="text-stone-400 dark:text-white/30 text-xs">조회 {post.views}</span>
          </div>

          {/* 제목 + 수정/삭제/신고 */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white leading-snug">{post.title}</h1>
            <div className="flex items-center gap-3 shrink-0 pt-1">
              <DmButton targetUserId={post.user_id} />
              <ReportButton targetType="post" targetId={post.id} />
              <PostAuthorActions postId={post.id} authorId={post.user_id} />
              <AdminContentActions contentType="post" contentId={post.id} redirectTo="/community" />
            </div>
          </div>

          {/* 본문 */}
          <div className="border-t border-black/5 dark:border-white/5 pt-6 pb-8">
            <p className="text-stone-700 dark:text-white/75 text-sm leading-loose whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* 좋아요 + 신고/관리자 */}
          <div className="pb-8 border-b border-black/5 dark:border-white/5">
            <PostLikeButton postId={post.id} initialCount={likeCount ?? 0} initialLiked={false} />
          </div>
        </article>

        {/* 댓글 */}
        <CommentSection postId={post.id} initialComments={comments ?? []} />
      </div>
    </main>
  );
}
