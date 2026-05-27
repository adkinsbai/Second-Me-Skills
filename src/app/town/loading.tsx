export default function TownLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#07090F" }}>
      <div className="flex w-full max-w-[780px] flex-col gap-4 px-4">
        {/* Skeleton town header */}
        <div className="animate-pulse rounded-2xl border-2 border-white/10 bg-white/5 p-5">
          <div className="h-5 w-32 rounded bg-white/10" />
          <div className="mt-2 h-3 w-48 rounded bg-white/10" />
        </div>

        {/* Skeleton post cards */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse space-y-3 rounded-2xl border-2 border-white/10 bg-white/5 p-4"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-20 rounded bg-white/10" />
                <div className="h-2.5 w-14 rounded bg-white/10" />
              </div>
            </div>
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-white/10" />
              <div className="h-6 w-20 rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
