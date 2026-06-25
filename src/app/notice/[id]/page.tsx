import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';

const CAT_STYLE: Record<string, string> = {
  general: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  update:  'text-sky-400 bg-sky-500/10 border-sky-500/20',
  event:   'text-pink-400 bg-pink-500/10 border-pink-500/20',
};
const CAT_LABEL: Record<string, string> = {
  general: '공지', update: '업데이트', event: '이벤트',
};

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseServer();

  const { data: notice } = await db
    .from('notices')
    .select('*')
    .eq('id', id)
    .single();

  if (!notice) notFound();

  // 조회수 증가 (fire and forget)
  db.from('notices').update({ view_count: notice.view_count + 1 }).eq('id', id);

  // 이전·다음 공지
  const [{ data: prev }, { data: next }] = await Promise.all([
    db.from('notices').select('id, title').lt('created_at', notice.created_at).order('created_at', { ascending: false }).limit(1).single(),
    db.from('notices').select('id, title').gt('created_at', notice.created_at).order('created_at', { ascending: true }).limit(1).single(),
  ]);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* 뒤로 */}
        <Link href="/notice" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition mb-8">
          ← 공지사항 목록
        </Link>

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${CAT_STYLE[notice.category] ?? CAT_STYLE.general}`}>
              {CAT_LABEL[notice.category] ?? '공지'}
            </span>
            {notice.is_pinned && (
              <span className="text-[11px] font-semibold text-amber-400">📌 고정</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white leading-snug">{notice.title}</h1>
          <div className="flex items-center gap-3 text-stone-400 dark:text-white/30 text-xs mt-3">
            <span>{fmt(notice.created_at)}</span>
            {notice.updated_at !== notice.created_at && (
              <>
                <span>·</span>
                <span>수정됨 {fmt(notice.updated_at)}</span>
              </>
            )}
            <span>·</span>
            <span>조회 {notice.view_count + 1}</span>
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-black/8 dark:border-white/8 mb-8" />

        {/* 본문 */}
        <div className="text-stone-700 dark:text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
          {notice.content}
        </div>

        {/* 구분선 */}
        <div className="border-t border-black/8 dark:border-white/8 mt-12 mb-6" />

        {/* 이전·다음 */}
        <div className="flex flex-col gap-2">
          {next && (
            <Link
              href={`/notice/${next.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/4 transition group"
            >
              <span className="text-stone-400 dark:text-white/25 text-xs shrink-0">▲ 다음</span>
              <span className="text-stone-600 dark:text-white/60 text-sm truncate group-hover:text-stone-900 dark:group-hover:text-white transition">{next.title}</span>
            </Link>
          )}
          {prev && (
            <Link
              href={`/notice/${prev.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/4 transition group"
            >
              <span className="text-stone-400 dark:text-white/25 text-xs shrink-0">▼ 이전</span>
              <span className="text-stone-600 dark:text-white/60 text-sm truncate group-hover:text-stone-900 dark:group-hover:text-white transition">{prev.title}</span>
            </Link>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/notice" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
            목록으로
          </Link>
        </div>
      </div>
    </main>
  );
}
