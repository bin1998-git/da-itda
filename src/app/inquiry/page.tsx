'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Inquiry {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  answer: string | null;
  answered_at: string | null;
}

const CAT_LABEL: Record<string, string> = {
  order: '주문/결제', shipping: '배송', product: '상품', general: '기타',
};
const STATUS_STYLE: Record<string, string> = {
  pending:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  answered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};
const STATUS_LABEL: Record<string, string> = {
  pending: '답변 대기', answered: '답변 완료',
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });

export default function InquiryPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }

    supabase
      .from('inquiries')
      .select('id, title, category, status, created_at, answer, answered_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInquiries((data ?? []) as Inquiry[]);
        setLoading(false);
      });
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-1">1:1 문의</p>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-white">나의 문의 내역</h1>
              <p className="text-stone-400 dark:text-white/40 text-sm mt-1">궁금한 점을 남겨주시면 빠르게 답변드립니다</p>
            </div>
            <Link
              href="/inquiry/write"
              className="px-5 py-2.5 rounded-full bg-sky-500 text-white text-sm font-bold hover:bg-sky-400 transition"
            >
              + 문의하기
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">💬</span>
            <p className="text-stone-400 dark:text-white/40 text-sm">문의 내역이 없습니다</p>
            <Link
              href="/inquiry/write"
              className="mt-2 px-6 py-3 rounded-full bg-sky-500 text-white font-bold text-sm hover:bg-sky-400 transition"
            >
              첫 문의 남기기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
            {inquiries.map((q) => (
              <Link
                key={q.id}
                href={`/inquiry/${q.id}`}
                className="py-5 flex items-start gap-3 hover:bg-black/2 dark:hover:bg-white/2 -mx-2 px-2 rounded-xl transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                      {CAT_LABEL[q.category] ?? '기타'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[q.status] ?? STATUS_STYLE.pending}`}>
                      {STATUS_LABEL[q.status] ?? '처리 중'}
                    </span>
                  </div>
                  <p className="text-stone-700 dark:text-white/75 font-medium text-sm truncate group-hover:text-stone-900 dark:group-hover:text-white transition">
                    {q.title}
                  </p>
                  <div className="flex items-center gap-3 text-stone-400 dark:text-white/25 text-xs mt-1.5">
                    <span>{fmt(q.created_at)}</span>
                    {q.answered_at && (
                      <>
                        <span>·</span>
                        <span>답변 {fmt(q.answered_at)}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-stone-300 dark:text-white/20 text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
