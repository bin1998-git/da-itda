export default function MarketLoading() {
  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="h-3 w-20 rounded-full bg-black/6 dark:bg-white/6 mb-3 animate-pulse" />
          <div className="h-8 w-56 rounded-xl bg-black/6 dark:bg-white/6 mb-2 animate-pulse" />
          <div className="h-3 w-28 rounded-full bg-black/4 dark:bg-white/4 animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-20 rounded-full bg-black/6 dark:bg-white/6 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 overflow-hidden animate-pulse">
              <div className="aspect-square bg-black/5 dark:bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-2.5 w-16 rounded-full bg-black/6 dark:bg-white/6" />
                <div className="h-3.5 w-full rounded-full bg-black/8 dark:bg-white/8" />
                <div className="h-3.5 w-3/4 rounded-full bg-black/6 dark:bg-white/6" />
                <div className="h-4 w-20 rounded-full bg-amber-500/20 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
