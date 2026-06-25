export default function MediaLoading() {
  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="h-3 w-20 rounded-full bg-black/6 dark:bg-white/6 mb-3 animate-pulse" />
          <div className="h-8 w-48 rounded-xl bg-black/6 dark:bg-white/6 mb-2 animate-pulse" />
          <div className="h-3 w-32 rounded-full bg-black/4 dark:bg-white/4 animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 overflow-hidden animate-pulse">
              <div className="aspect-video bg-black/5 dark:bg-white/5" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-full rounded-full bg-black/8 dark:bg-white/8" />
                <div className="h-3.5 w-4/5 rounded-full bg-black/6 dark:bg-white/6" />
                <div className="flex gap-2 mt-1">
                  <div className="h-2.5 w-12 rounded-full bg-black/4 dark:bg-white/4" />
                  <div className="h-2.5 w-16 rounded-full bg-black/4 dark:bg-white/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
