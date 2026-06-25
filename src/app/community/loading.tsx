export default function CommunityLoading() {
  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-3 w-24 rounded-full bg-black/6 dark:bg-white/6 mb-3 animate-pulse" />
          <div className="h-8 w-40 rounded-xl bg-black/6 dark:bg-white/6 mb-2 animate-pulse" />
          <div className="h-3 w-32 rounded-full bg-black/4 dark:bg-white/4 animate-pulse" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-3">
        <div className="flex justify-end mb-6">
          <div className="h-9 w-24 rounded-full bg-black/6 dark:bg-white/6 animate-pulse" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] px-5 py-4 animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-12 rounded-full bg-black/8 dark:bg-white/8" />
                <div className="h-4 w-3/4 rounded-full bg-black/8 dark:bg-white/8" />
                <div className="flex gap-3 mt-2">
                  <div className="h-2.5 w-12 rounded-full bg-black/4 dark:bg-white/4" />
                  <div className="h-2.5 w-16 rounded-full bg-black/4 dark:bg-white/4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
