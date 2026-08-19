import Link from 'next/link';

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-6">
        <span className="text-6xl block mb-6">😥</span>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">결제에 실패했어요</h2>
        <p className="text-stone-400 dark:text-white/40 text-sm mb-8">
          {message ?? '결제가 취소되었거나 실패했습니다.'}
        </p>
        <Link
          href="/cart"
          className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition inline-block"
        >
          장바구니로 돌아가기
        </Link>
      </div>
    </main>
  );
}
