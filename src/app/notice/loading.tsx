export default function NoticeLoading() {
  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-3 w-20 rounded-full bg-black/6 dark:bg-white/6 mb-3 animate-pulse" />
          <div className="h-8 w-40 rounded-xl bg-black/6 dark:bg-white/6 mb-2 animate-pulse" />
          <div className="h-3 w-28 rounded-full bg-black/4 dark:bg-white/4 animate-pulse" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] px-5 py-4 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-16 rounded-full bg-black/8 dark:bg-white/8" />
            </div>
            <div className="h-4 w-3/4 rounded-full bg-black/8 dark:bg-white/8 mb-2" />
            <div className="h-2.5 w-20 rounded-full bg-black/4 dark:bg-white/4" />
          </div>
        ))}
      </div>
    </main>
  );
}
