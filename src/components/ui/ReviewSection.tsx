'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import StarRating from './StarRating';
import { Review } from '@/types/market';

type SortKey = 'latest' | 'helpful' | 'high' | 'low';
const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: 'latest',  label: '최신순' },
  { key: 'helpful', label: '도움돼요순' },
  { key: 'high',    label: '별점높은순' },
  { key: 'low',     label: '별점낮은순' },
];

const REPORT_REASONS = [
  '욕설/비방',
  '광고/스팸',
  '허위 정보',
  '개인정보 포함',
  '기타',
];

interface Props {
  productId: string;
  sellerId: string;
  reviews: Review[];
  avgRating: number;
  dist: { star: number; count: number }[];
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return '방금 전';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 2592000) return `${Math.floor(s / 86400)}일 전`;
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', year: 'numeric' });
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt="" className="w-8 h-8 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" referrerPolicy="no-referrer" />;
  return (
    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
      {(name || '?')[0]}
    </div>
  );
}

export default function ReviewSection({ productId, sellerId, reviews: initialReviews, avgRating, dist }: Props) {
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews]         = useState(initialReviews);
  const [sort, setSort]               = useState<SortKey>('latest');
  const [myHelpful, setMyHelpful]     = useState<Set<string>>(new Set());
  const [canReview, setCanReview]     = useState(false);
  const [myReview, setMyReview]       = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<string | null>(null); // review id
  const [reportReason, setReportReason] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null); // review id
  const [replyText, setReplyText]     = useState('');
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const isSeller = user?.id === sellerId;
  const maxCount = Math.max(...dist.map((d) => d.count), 1);

  // 현재 유저의 도움돼요 목록 + 구매 가능 여부 체크
  useEffect(() => {
    if (!user) return;
    supabase.from('review_helpful').select('review_id').eq('user_id', user.id)
      .then(({ data }) => setMyHelpful(new Set(data?.map((h) => h.review_id) ?? [])));

    supabase.from('reviews').select('id').eq('product_id', productId).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setMyReview(data?.id ?? null));

    // 배송완료 주문에 이 상품이 있는지 확인
    supabase.from('orders').select('id').eq('user_id', user.id).eq('status', 'delivered')
      .then(async ({ data: orders }) => {
        if (!orders?.length) return;
        const { data: items } = await supabase
          .from('order_items').select('id')
          .eq('product_id', productId)
          .in('order_id', orders.map((o) => o.id))
          .limit(1);
        setCanReview(!!(items?.length));
      });
  }, [user, productId]);

  const sorted = [...reviews].sort((a, b) => {
    if (sort === 'helpful') return b.helpful_count - a.helpful_count;
    if (sort === 'high')    return b.rating - a.rating;
    if (sort === 'low')     return a.rating - b.rating;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const toggleHelpful = useCallback(async (reviewId: string) => {
    if (!user) return;
    const { data } = await supabase.rpc('toggle_review_helpful', { p_review_id: reviewId });
    setMyHelpful((prev) => {
      const next = new Set(prev);
      if (data) next.add(reviewId); else next.delete(reviewId);
      return next;
    });
    setReviews((prev) => prev.map((r) =>
      r.id === reviewId ? { ...r, helpful_count: r.helpful_count + (data ? 1 : -1) } : r
    ));
  }, [user]);

  const deleteReview = useCallback(async (reviewId: string) => {
    setDeleting(reviewId);
    await supabase.from('reviews').delete().eq('id', reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    if (myReview === reviewId) setMyReview(null);
    setDeleting(null);
  }, [myReview]);

  const submitReport = async () => {
    if (!user || !reportModal || !reportReason) return;
    setSubmitting(true);
    await supabase.from('review_reports').insert({ review_id: reportModal, user_id: user.id, reason: reportReason });
    setSubmitting(false);
    setReportModal(null);
    setReportReason('');
  };

  const submitReply = async (reviewId: string) => {
    if (!isSeller || !replyText.trim()) return;
    setSubmitting(true);
    await supabase.from('reviews').update({
      seller_reply: replyText.trim(),
      seller_reply_at: new Date().toISOString(),
    }).eq('id', reviewId);
    setReviews((prev) => prev.map((r) =>
      r.id === reviewId ? { ...r, seller_reply: replyText.trim(), seller_reply_at: new Date().toISOString() } : r
    ));
    setReplyTarget(null);
    setReplyText('');
    setSubmitting(false);
  };

  const deleteReply = async (reviewId: string) => {
    await supabase.from('reviews').update({ seller_reply: null, seller_reply_at: null }).eq('id', reviewId);
    setReviews((prev) => prev.map((r) =>
      r.id === reviewId ? { ...r, seller_reply: null, seller_reply_at: null } : r
    ));
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-stone-900 dark:text-white">
          후기 <span className="text-amber-400">{reviews.length}</span>
        </h2>
        {user && (
          canReview ? (
            <Link
              href={`/market/${productId}/review`}
              className="px-4 py-2 rounded-full bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition"
            >
              {myReview ? '리뷰 수정' : '리뷰 쓰기'}
            </Link>
          ) : (
            <span className="text-xs text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full">
              구매 후 배송완료 시 작성 가능
            </span>
          )
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-white/30 text-sm">
          아직 후기가 없어요. 첫 번째 후기를 남겨보세요!
        </div>
      ) : (
        <>
          {/* 평균 + 분포 */}
          <div className="flex gap-8 items-start p-6 rounded-2xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8 mb-5">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-5xl font-bold text-stone-900 dark:text-white">{avgRating.toFixed(1)}</span>
              <StarRating rating={avgRating} size="md" />
              <span className="text-xs text-stone-400 dark:text-white/40 mt-1">총 {reviews.length}개</span>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {dist.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 dark:text-white/40 w-3 text-right shrink-0">{star}</span>
                  <svg width="10" height="10" viewBox="0 0 20 20" className="shrink-0"><path d="M10 1l2.6 5.3 5.9.9-4.3 4.2 1 5.8L10 14.3l-5.2 2.9 1-5.8L1.5 7.2l5.9-.9z" fill="#f59e0b" /></svg>
                  <div className="flex-1 h-2 rounded-full bg-black/8 dark:bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-xs text-stone-400 dark:text-white/40 w-4 shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 정렬 탭 */}
          <div className="flex gap-1 mb-4 p-1 bg-black/4 dark:bg-white/4 rounded-xl w-fit">
            {SORT_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  sort === key
                    ? 'bg-white dark:bg-white/10 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 리뷰 목록 */}
          <div className="flex flex-col gap-4">
            {sorted.map((review) => {
              const isOwn   = user?.id === review.user_id;
              const helped  = myHelpful.has(review.id);
              const name    = review.profiles?.nickname ?? '익명';
              const isReplyMode = replyTarget === review.id;

              return (
                <div key={review.id} className="p-5 rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/[0.02]">
                  {/* 리뷰 헤더 */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={name} url={review.profiles?.avatar_url} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-800 dark:text-white/80">{name}</span>
                          {isOwn && <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">내 리뷰</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-[11px] text-stone-400 dark:text-white/30">{timeAgo(review.created_at)}</span>
                          {review.updated_at && review.updated_at !== review.created_at && (
                            <span className="text-[10px] text-stone-300 dark:text-white/20">(수정됨)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 내용 */}
                  {review.content && (
                    <p className="text-sm text-stone-600 dark:text-white/60 leading-relaxed mb-4">{review.content}</p>
                  )}

                  {/* 리뷰 이미지 */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {review.images.map((src, imgIdx) => (
                        <a
                          key={imgIdx}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-black/8 dark:border-white/8 hover:opacity-80 transition"
                        >
                          <img src={src} alt={`리뷰 사진 ${imgIdx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* 판매자 답글 */}
                  {review.seller_reply && (
                    <div className="mt-3 mb-4 ml-3 pl-4 border-l-2 border-amber-500/30 bg-amber-500/5 rounded-r-xl py-3 pr-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-amber-500">판매자 답글</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-stone-400 dark:text-white/30">{timeAgo(review.seller_reply_at!)}</span>
                          {isSeller && (
                            <>
                              <button onClick={() => { setReplyTarget(review.id); setReplyText(review.seller_reply!); }} className="text-[10px] text-stone-400 dark:text-white/30 hover:text-stone-700 dark:hover:text-white transition ml-2">수정</button>
                              <button onClick={() => deleteReply(review.id)} className="text-[10px] text-rose-400/60 hover:text-rose-400 transition">삭제</button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-stone-600 dark:text-white/60 leading-relaxed">{review.seller_reply}</p>
                    </div>
                  )}

                  {/* 판매자 답글 입력창 */}
                  {isSeller && isReplyMode && (
                    <div className="mt-3 mb-4 ml-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="고객 후기에 감사한 마음을 전해보세요..."
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => { setReplyTarget(null); setReplyText(''); }} className="text-xs text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white transition">취소</button>
                        <button onClick={() => submitReply(review.id)} disabled={submitting || !replyText.trim()} className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition disabled:opacity-40">
                          {submitting ? '등록 중...' : '답글 등록'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 액션 바 */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                    {/* 도움돼요 */}
                    <button
                      onClick={() => toggleHelpful(review.id)}
                      disabled={!user || isOwn}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                        helped
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                          : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:border-amber-500/30 hover:text-amber-500/70 disabled:opacity-40 disabled:cursor-default'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill={helped ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                      </svg>
                      도움돼요 {review.helpful_count > 0 && <span className="font-semibold">{review.helpful_count}</span>}
                    </button>

                    <div className="flex items-center gap-1">
                      {/* 판매자 답글 달기 */}
                      {isSeller && !review.seller_reply && !isReplyMode && (
                        <button onClick={() => { setReplyTarget(review.id); setReplyText(''); }} className="text-xs text-stone-400 dark:text-white/30 hover:text-amber-500 transition px-2 py-1 rounded-lg hover:bg-amber-500/5">
                          답글
                        </button>
                      )}
                      {/* 수정 (본인) */}
                      {isOwn && (
                        <Link href={`/market/${productId}/review`} className="text-xs text-stone-400 dark:text-white/30 hover:text-stone-700 dark:hover:text-white transition px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                          수정
                        </Link>
                      )}
                      {/* 삭제 (본인) */}
                      {isOwn && (
                        <button
                          onClick={() => deleteReview(review.id)}
                          disabled={deleting === review.id}
                          className="text-xs text-rose-400/60 hover:text-rose-400 transition px-2 py-1 rounded-lg hover:bg-rose-500/5 disabled:opacity-40"
                        >
                          {deleting === review.id ? '...' : '삭제'}
                        </button>
                      )}
                      {/* 신고 (타인) */}
                      {user && !isOwn && !isSeller && (
                        <button onClick={() => { setReportModal(review.id); setReportReason(''); }} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-rose-500/25 text-rose-400/80 hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/5 transition">
                          🚨 신고
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 신고 모달 */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm px-4" onClick={() => setReportModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1">후기 신고</h3>
            <p className="text-xs text-stone-400 dark:text-white/40 mb-4">신고 사유를 선택해주세요.</p>
            <div className="flex flex-col gap-2 mb-5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-left transition border ${
                    reportReason === r
                      ? 'border-amber-500/40 bg-amber-500/8 text-amber-500 font-medium'
                      : 'border-black/8 dark:border-white/8 text-stone-600 dark:text-white/60 hover:bg-black/4 dark:hover:bg-white/4'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition ${reportReason === r ? 'border-amber-500 bg-amber-500' : 'border-stone-300 dark:border-white/30'}`} />
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReportModal(null)} className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm text-stone-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition">
                취소
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason || submitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition disabled:opacity-40"
              >
                {submitting ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
