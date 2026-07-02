'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const MIN_WITHDRAWAL = 5000;

interface Earning {
  id: string;
  media_post_id: string | null;
  order_id: string | null;
  amount: number;
  created_at: string;
  media_posts?: { title: string } | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bank_name: string;
  account_number: string;
  account_holder: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '검토 중',
  approved: '승인됨',
  rejected: '반려됨',
};

export default function CreatorPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  const [cash, setCash] = useState(0);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState({ bank_name: '', account_number: '', account_holder: '', amount: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/auth/login'); return; }

    Promise.all([
      supabase.from('profiles').select('creator_cash').eq('id', user.id).single(),
      supabase.from('creator_earnings')
        .select('id, media_post_id, order_id, amount, created_at, media_posts(title)')
        .eq('creator_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('cash_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]).then(([profileRes, earningsRes, withdrawalsRes]) => {
      setCash((profileRes.data as { creator_cash: number } | null)?.creator_cash ?? 0);
      setEarnings((earningsRes.data ?? []) as unknown as Earning[]);
      setWithdrawals((withdrawalsRes.data ?? []) as Withdrawal[]);
      setFetching(false);
    });
  }, [user, isLoading, router]);

  const thisMonthEarnings = earnings
    .filter((e) => new Date(e.created_at).getMonth() === new Date().getMonth())
    .reduce((s, e) => s + e.amount, 0);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = parseInt(form.amount, 10);
    if (!form.bank_name || !form.account_number || !form.account_holder) {
      setFormError('모든 항목을 입력해주세요.');
      return;
    }
    if (isNaN(amt) || amt < MIN_WITHDRAWAL) {
      setFormError(`최소 출금액은 ${MIN_WITHDRAWAL.toLocaleString('ko-KR')}원입니다.`);
      return;
    }
    if (amt > cash) {
      setFormError('보유 캐시보다 많은 금액은 출금할 수 없습니다.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('cash_withdrawals').insert({
      user_id: user!.id,
      amount: amt,
      bank_name: form.bank_name,
      account_number: form.account_number,
      account_holder: form.account_holder,
    });
    setSubmitting(false);
    if (error) { setFormError(error.message); return; }
    setFormSuccess(true);
    setForm({ bank_name: '', account_number: '', account_holder: '', amount: '' });
    const { data } = await supabase.from('cash_withdrawals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10);
    setWithdrawals((data ?? []) as Withdrawal[]);
  };

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">크리에이터 수익</h1>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-amber-500 text-black">
            <p className="text-xs font-semibold opacity-70 mb-1">보유 캐시</p>
            <p className="text-2xl font-bold">{cash.toLocaleString('ko-KR')}원</p>
          </div>
          <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <p className="text-xs font-semibold text-stone-500 dark:text-white/50 mb-1">이번 달 수익</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white">{thisMonthEarnings.toLocaleString('ko-KR')}원</p>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-bold text-stone-500 dark:text-white/50 uppercase tracking-wider mb-3">수익 내역</h2>
          {earnings.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-white/40">아직 수익이 없습니다. 영상에 상품을 태그해보세요!</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {earnings.map((e) => (
                <li key={e.id} className="flex items-center justify-between p-4 rounded-xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-white">
                      {(e.media_posts as { title: string } | null)?.title ?? '삭제된 영상'}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-white/40 mt-0.5">
                      {new Date(e.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-amber-500">+{e.amount.toLocaleString('ko-KR')}원</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold text-stone-500 dark:text-white/50 uppercase tracking-wider mb-3">출금 신청</h2>
          {formSuccess && (
            <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
              출금 신청이 완료됐습니다. 영업일 기준 3~5일 내 처리됩니다.
            </div>
          )}
          <form onSubmit={handleWithdraw} className="flex flex-col gap-3">
            <input
              placeholder="은행명 (예: 카카오뱅크)"
              value={form.bank_name}
              onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            <input
              placeholder="계좌번호"
              value={form.account_number}
              onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            <input
              placeholder="예금주"
              value={form.account_holder}
              onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            <input
              type="number"
              placeholder={`출금 금액 (최소 ${MIN_WITHDRAWAL.toLocaleString('ko-KR')}원)`}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            {formError && <p className="text-rose-400 text-sm">{formError}</p>}
            <button
              type="submit"
              disabled={submitting || cash < MIN_WITHDRAWAL}
              className="py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition disabled:opacity-50 text-sm"
            >
              {submitting ? '신청 중...' : '출금 신청'}
            </button>
            {cash < MIN_WITHDRAWAL && (
              <p className="text-xs text-stone-400 dark:text-white/40 text-center">
                보유 캐시가 최소 출금액({MIN_WITHDRAWAL.toLocaleString('ko-KR')}원) 미만입니다.
              </p>
            )}
          </form>
        </section>

        {withdrawals.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-stone-500 dark:text-white/50 uppercase tracking-wider mb-3">출금 내역</h2>
            <ul className="flex flex-col gap-2">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-white">{w.bank_name} {w.account_number}</p>
                    <p className="text-xs text-stone-400 dark:text-white/40 mt-0.5">{new Date(w.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-800 dark:text-white">{w.amount.toLocaleString('ko-KR')}원</p>
                    <p className={`text-xs mt-0.5 ${w.status === 'approved' ? 'text-green-500' : w.status === 'rejected' ? 'text-rose-400' : 'text-amber-500'}`}>
                      {STATUS_LABEL[w.status]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
