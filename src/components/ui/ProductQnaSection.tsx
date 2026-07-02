'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Qna } from '@/types/market';

interface Props {
  productId: string;
  sellerId: string;
  qnas: Qna[];
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return '방금 전';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 2592000) return `${Math.floor(s / 86400)}일 전`;
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ProductQnaSection({ productId, sellerId, qnas: initialQnas }: Props) {
  const user = useAuthStore((s) => s.user);
  const [qnas, setQnas]             = useState(initialQnas);
  const [question, setQuestion]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerTarget, setAnswerTarget] = useState<string | null>(null);
  const [answerText, setAnswerText]     = useState('');

  const isSeller = user?.id === sellerId;

  const submitQuestion = async () => {
    const q = question.trim();
    if (!user || q.length < 10) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('product_qna').insert({
      product_id: productId,
      user_id: user.id,
      seller_id: sellerId,
      question: q,
    }).select('*, profiles!product_qna_user_id_fkey(username, avatar_url)').single();
    if (!error && data) {
      setQnas((prev) => [data as Qna, ...prev]);
      setQuestion('');
    }
    setSubmitting(false);
  };

  const submitAnswer = useCallback(async (qnaId: string) => {
    const a = answerText.trim();
    if (!isSeller || !a) return;
    setSubmitting(true);
    const answeredAt = new Date().toISOString();
    await supabase.from('product_qna').update({
      answer: a,
      answered_at: answeredAt,
    }).eq('id', qnaId);
    const target = qnas.find((q) => q.id === qnaId);
    if (target) {
      await supabase.from('notifications').insert({
        user_id: target.user_id,
        type: 'qna_answered',
        title: '판매자가 답변을 남겼습니다',
        body: target.question,
        link: `/market/${productId}`,
      });
    }
    setQnas((prev) => prev.map((q) => (q.id === qnaId ? { ...q, answer: a, answered_at: answeredAt } : q)));
    setAnswerTarget(null);
    setAnswerText('');
    setSubmitting(false);
  }, [answerText, isSeller, qnas, productId]);

  return (
    <div>
      {/* 질문 작성 폼 */}
      {user && !isSeller && (
        <div className="mb-6 p-4 rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="상품에 대해 궁금한 점을 질문해보세요 (최소 10자)"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submitQuestion}
              disabled={submitting || question.trim().length < 10}
              className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition disabled:opacity-40"
            >
              {submitting ? '등록 중...' : '질문 등록'}
            </button>
          </div>
        </div>
      )}
      {!user && (
        <div className="mb-6 p-4 rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 text-center">
          <Link href="/auth/login" className="text-sm text-amber-500 font-semibold hover:text-amber-400 transition">
            로그인하고 질문하기
          </Link>
        </div>
      )}

      {/* 목록 */}
      {qnas.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-white/30 text-sm">
          아직 등록된 문의가 없어요. 첫 번째 질문을 남겨보세요!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {qnas.map((qna) => {
            const isAnswerMode = answerTarget === qna.id;
            return (
              <div key={qna.id} className="p-5 rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-500 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">Q</span>
                    <span className="text-sm font-medium text-stone-800 dark:text-white/80">{qna.profiles?.username ?? '익명'}</span>
                    <span className="text-[11px] text-stone-400 dark:text-white/30">{timeAgo(qna.created_at)}</span>
                  </div>
                  {!qna.answer && (
                    <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">답변 대기 중</span>
                  )}
                </div>
                <p className="text-sm text-stone-600 dark:text-white/60 leading-relaxed mb-3">{qna.question}</p>

                {qna.answer && (
                  <div className="ml-3 pl-4 border-l-2 border-amber-500/30 bg-amber-500/5 rounded-r-xl py-3 pr-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">A</span>
                      <span className="text-[11px] text-stone-400 dark:text-white/30">{timeAgo(qna.answered_at!)}</span>
                    </div>
                    <p className="text-sm text-stone-600 dark:text-white/60 leading-relaxed">{qna.answer}</p>
                  </div>
                )}

                {isSeller && !qna.answer && !isAnswerMode && (
                  <button
                    onClick={() => { setAnswerTarget(qna.id); setAnswerText(''); }}
                    className="text-xs text-amber-500 hover:text-amber-400 transition mt-1"
                  >
                    답변 달기
                  </button>
                )}

                {isSeller && isAnswerMode && (
                  <div className="mt-2">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="답변을 입력하세요..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none"
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => { setAnswerTarget(null); setAnswerText(''); }}
                        className="text-xs text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => submitAnswer(qna.id)}
                        disabled={submitting || !answerText.trim()}
                        className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition disabled:opacity-40"
                      >
                        {submitting ? '등록 중...' : '답변 등록'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
