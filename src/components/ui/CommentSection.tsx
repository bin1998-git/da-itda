'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import ReportButton from '@/components/ui/ReportButton';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommentSection({
  postId,
  initialComments,
}: {
  postId: string;
  initialComments: Comment[];
}) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!content.trim() || loading) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, content: content.trim() })
      .select()
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setContent('');
      // 게시글 작성자에게 알림 (본인 제외)
      const { data: post } = await supabase.from('posts').select('user_id, title').eq('id', postId).single();
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'comment',
          title: '게시글에 댓글이 달렸습니다',
          body: post.title,
          link: `/community/${postId}`,
        });
      }
    }
    setLoading(false);
  };

  const remove = async (id: string) => {
    await supabase.from('comments').delete().eq('id', id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="mt-10">
      <h3 className="text-white font-semibold text-base mb-4">
        댓글 <span className="text-emerald-400">{comments.length}</span>
      </h3>

      {/* 댓글 목록 */}
      <div className="flex flex-col gap-1 mb-6">
        {comments.length === 0 ? (
          <p className="text-white/30 text-sm py-6 text-center">첫 댓글을 남겨보세요</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="py-3 border-b border-white/5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">{timeAgo(c.created_at)}</span>
                <div className="flex items-center gap-2">
                  <ReportButton targetType="comment" targetId={c.id} />
                  {(user?.id === c.user_id || isAdmin) && (
                    <button
                      onClick={() => remove(c.id)}
                      className="text-white/20 text-xs hover:text-rose-400 transition"
                    >
                      {isAdmin && user?.id !== c.user_id ? '[관리자] 삭제' : '삭제'}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {/* 댓글 입력 */}
      <div className="flex gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) submit(); }}
          placeholder={user ? '댓글을 입력하세요 (⌘+Enter로 전송)' : '로그인 후 댓글을 달 수 있습니다'}
          rows={2}
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition resize-none"
        />
        <button
          onClick={submit}
          disabled={loading || !content.trim()}
          className="px-5 py-3 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-40 self-end"
        >
          {loading ? '...' : '등록'}
        </button>
      </div>
    </div>
  );
}
