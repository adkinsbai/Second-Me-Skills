export default function MatchesLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#07090F" }}>
      <div className="flex w-full max-w-[780px] flex-col gap-5 px-4">
        {/* Skeleton header card */}
        <div className="animate-pulse rounded-2xl border-2 border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="h-3 w-40 rounded bg-white/10" />
            </div>
          </div>
        </div>

        {/* Skeleton match section */}
        <div className="animate-pulse rounded-2xl border-2 border-white/10 bg-white/5 p-4">
          <div className="h-5 w-20 rounded bg-white/10" />
          <div className="mt-2 h-3 w-48 rounded bg-white/10" />
          <div className="mt-4 h-12 w-full rounded-xl" style={{ background: "#F43F5E22" }} />
        </div>

        {/* Skeleton match list items */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-3 rounded-2xl border-2 border-white/10 bg-white/5 p-4"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 rounded bg-white/10" />
              <div className="h-3 w-44 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
