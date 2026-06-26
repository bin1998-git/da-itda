'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface Props {
  targetType: 'post' | 'media' | 'product' | 'comment' | 'user';
  targetId: string;
  className?: string;
}

const REASONS = [
  { value: 'hate',      label: '욕설 / 혐오 발언',    desc: '3회 누적 시 7일 댓글 금지' },
  { value: 'spam',      label: '스팸 / 도배',          desc: '3회 누적 시 7일 게시 금지' },
  { value: 'fraud',     label: '사기 / 허위정보',      desc: '즉시 판매 정지 조치' },
  { value: 'adult',     label: '음란물 / 선정적 내용', desc: '2회 누적 시 30일 게시 금지' },
  { value: 'copyright', label: '저작권 침해',           desc: '관리자 검토 후 처리' },
  { value: 'other',     label: '기타',                 desc: '관리자 수동 처리' },
];

export default function ReportButton({ targetType, targetId, className = '' }: Props) {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [open, setOpen]       = useState(false);
  const [reason, setReason]   = useState('');
  const [detail, setDetail]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  if (isAdmin) return null;

  const handleOpen = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/auth/login');
      return;
    }
    const { data } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();
    setAlreadyReported(!!data);
    setReason('');
    setDetail('');
    setDone(false);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id:   targetId,
      reason,
      detail: detail.trim() || null,
    });
    setSubmitting(false);
    if (error) { alert('신고 접수 중 오류가 발생했습니다.'); return; }
    setDone(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        title="신고하기"
        className={`inline-flex items-center gap-1 text-stone-300 dark:text-white/20 hover:text-amber-400 text-xs transition ${className}`}
      >
        {/* 사이렌 아이콘 */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        신고
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 shadow-2xl p-6">

            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-stone-900 dark:text-white font-semibold">신고가 접수되었습니다</p>
                <p className="text-stone-400 dark:text-white/40 text-sm mt-1">검토 후 적절한 조치를 취하겠습니다.</p>
                <button onClick={() => setOpen(false)}
                  className="mt-5 px-6 py-2 rounded-xl bg-black/8 dark:bg-white/8 text-stone-600 dark:text-white/60 text-sm hover:bg-black/12 dark:hover:bg-white/12 transition">
                  닫기
                </button>
              </div>
            ) : alreadyReported ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-stone-900 dark:text-white font-semibold">이미 신고한 콘텐츠입니다</p>
                <p className="text-stone-400 dark:text-white/40 text-sm mt-1">이미 신고 접수되어 검토 중입니다.</p>
                <button onClick={() => setOpen(false)}
                  className="mt-5 px-6 py-2 rounded-xl bg-black/8 dark:bg-white/8 text-stone-600 dark:text-white/60 text-sm hover:bg-black/12 dark:hover:bg-white/12 transition">
                  닫기
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <h2 className="text-stone-900 dark:text-white font-bold text-lg">신고하기</h2>
                </div>

                <div className="flex flex-col gap-2.5 mb-5">
                  {REASONS.map((r) => (
                    <label key={r.value}
                      onClick={() => setReason(r.value)}
                      className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition ${
                        reason === r.value
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : 'border-black/6 dark:border-white/6 hover:border-black/12 dark:hover:border-white/12 hover:bg-black/2 dark:hover:bg-white/2'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition ${
                        reason === r.value ? 'border-rose-500 bg-rose-500' : 'border-black/20 dark:border-white/20'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium transition ${reason === r.value ? 'text-stone-900 dark:text-white' : 'text-stone-600 dark:text-white/60'}`}>
                          {r.label}
                        </p>
                        <p className="text-[11px] text-stone-400 dark:text-white/30 mt-0.5">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {reason && (
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="신고 사유를 자세히 적어주세요 (선택)"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-rose-500/40 transition resize-none mb-4"
                  />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-400 transition disabled:opacity-40"
                  >
                    {submitting ? '접수 중...' : '신고 접수'}
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
