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
  { value: 'spam',      label: '스팸 / 광고' },
  { value: 'adult',     label: '음란물 / 선정적 내용' },
  { value: 'hate',      label: '욕설 / 혐오 발언' },
  { value: 'fraud',     label: '사기 / 허위정보' },
  { value: 'copyright', label: '저작권 침해' },
  { value: 'other',     label: '기타' },
];

export default function ReportButton({ targetType, targetId, className = '' }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  // 관리자는 신고 버튼 표시 안 함
  if (isAdmin) return null;

  const handleOpen = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/auth/login');
      return;
    }
    // 이미 신고했는지 확인
    const { data } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();
    if (data) { setAlreadyReported(true); setOpen(true); return; }
    setAlreadyReported(false);
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
        className={`text-white/20 hover:text-rose-400 text-xs transition ${className}`}
      >
        신고
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#141414] border border-white/10 shadow-2xl p-6">

            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-white font-semibold">신고가 접수되었습니다</p>
                <p className="text-white/40 text-sm mt-1">검토 후 적절한 조치를 취하겠습니다.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 px-6 py-2 rounded-xl bg-white/8 text-white/60 text-sm hover:bg-white/12 transition"
                >
                  닫기
                </button>
              </div>
            ) : alreadyReported ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-white font-semibold">이미 신고한 콘텐츠입니다</p>
                <p className="text-white/40 text-sm mt-1">이미 신고 접수되어 검토 중입니다.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 px-6 py-2 rounded-xl bg-white/8 text-white/60 text-sm hover:bg-white/12 transition"
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-white font-bold text-lg mb-5">신고하기</h2>

                <div className="flex flex-col gap-3 mb-5">
                  {REASONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => setReason(r.value)}
                        className={`w-4 h-4 rounded-full border-2 shrink-0 transition ${
                          reason === r.value
                            ? 'border-rose-500 bg-rose-500'
                            : 'border-white/20 group-hover:border-white/40'
                        }`}
                      />
                      <span className={`text-sm transition ${reason === r.value ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}>
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>

                {reason === 'other' && (
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="신고 이유를 자세히 적어주세요"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-rose-500/40 transition resize-none mb-4"
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
                  <button
                    onClick={() => setOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5 transition"
                  >
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
